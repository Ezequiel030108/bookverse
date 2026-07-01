package com.bookverse.app.data

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.bookverse.app.model.Book
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

/* ------------------------------------------------------------------ */
/*  Modelos — mesmo schema do Firestore usado pelo site (js/auth.js)   */
/* ------------------------------------------------------------------ */

/** Usuário autenticado (Firebase Auth). */
data class Usuario(
    val uid: String,
    val nome: String,
    val email: String,
    val foto: String,
)

/** Endereço de entrega guardado no perfil. */
data class Endereco(
    val cep: String = "",
    val rua: String = "",
    val numero: String = "",
    val complemento: String = "",
    val bairro: String = "",
    val cidade: String = "",
    val uf: String = "",
)

/** Perfil do cliente — documento users/{uid}. */
data class Perfil(
    val nome: String = "",
    val email: String = "",
    val telefone: String = "",
    val instagram: String = "",
    val endereco: Endereco = Endereco(),
    val cadastroCompleto: Boolean = false,
)

/** Item dentro de um pedido. */
data class ItemPedido(
    val id: String,
    val titulo: String,
    val autor: String,
    val qty: Int,
    val preco: Double,
)

/** Pedido — documento users/{uid}/pedidos/{codigo}. */
data class Pedido(
    val codigo: String,
    val status: String,
    val total: Double,
    val subtotal: Double,
    val frete: Double,
    val entrega: String,
    val endereco: String,
    val itens: List<ItemPedido>,
    val criadoEm: Long = 0L,
)

/** Disponibilidade de um livro — documento disponibilidade/{idLivro}. */
data class Disponibilidade(
    val estado: String,   // "reservado" | "vendido"
    val ate: Long = 0L,   // validade da reserva (ms) — 0 quando não expira
    val uid: String = "",
)

/**
 * Contas e administração — espelha js/auth.js.
 *
 * Login com Google (play-services-auth + Firebase Auth) e Firestore com o
 * MESMO schema do site. Tudo é OPCIONAL: se o Firebase não estiver
 * configurado em [Config], o app roda normalmente, só sem a parte de contas.
 *
 * O Firebase é inicializado por [FirebaseOptions] em tempo de execução, sem
 * google-services.json.
 */
object Account {

    /** Firebase configurado? (permite as leituras públicas da loja). */
    val configurado: Boolean get() = Config.firebaseConfigurado()

    /** O login com Google está pronto para uso? (exige o Web client ID). */
    val loginDisponivel: Boolean get() = configurado && Config.GOOGLE_WEB_CLIENT_ID.isNotBlank()

    /** Exigir conta para finalizar (só quando o login está de fato disponível). */
    val exigeConta: Boolean get() = Config.EXIGIR_CONTA && loginDisponivel

    /** Usuário logado (ou null). Observável pelo Compose. */
    var usuario by mutableStateOf<Usuario?>(null)
        private set

    /** true quando já sabemos se o usuário está logado ou não. */
    var pronto by mutableStateOf(false)
        private set

    val ehAdmin: Boolean get() = Config.ehAdmin(usuario?.email)

    // ----- Dados públicos da loja (observáveis) -----
    /** idLivro -> disponibilidade (reservado/vendido). */
    val disponibilidade = mutableStateMapOf<String, Disponibilidade>()

    /** Livros cadastrados/editados pelo admin (coleção "catalogo"). */
    val catalogoAdmin = mutableStateListOf<Book>()

    private const val APP_NOME = "bookverse"
    private val escopo = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private var app: FirebaseApp? = null
    private var auth: FirebaseAuth? = null
    private var db: FirebaseFirestore? = null

    /** Inicializa o Firebase (uma vez). Chame no onCreate da Activity. */
    fun init(context: Context) {
        if (!configurado) { pronto = true; return }
        if (app != null) return

        val opcoes = FirebaseOptions.Builder()
            .setApiKey(Config.FIREBASE_API_KEY)
            .setApplicationId(Config.FIREBASE_APP_ID)
            .setProjectId(Config.FIREBASE_PROJECT_ID)
            .build()

        val ctx = context.applicationContext
        app = try {
            FirebaseApp.getInstance(APP_NOME)
        } catch (e: IllegalStateException) {
            FirebaseApp.initializeApp(ctx, opcoes, APP_NOME)
        }
        val instancia = app ?: run { pronto = true; return }

        val a = FirebaseAuth.getInstance(instancia)
        auth = a
        db = FirebaseFirestore.getInstance(instancia)

        a.addAuthStateListener { fa ->
            val u = fa.currentUser
            usuario = u?.let {
                Usuario(
                    uid = it.uid,
                    nome = it.displayName ?: "",
                    email = it.email ?: "",
                    foto = it.photoUrl?.toString() ?: "",
                )
            }
            pronto = true
        }

        // Leitura pública: esconde reservados/vendidos e mescla o catálogo do admin.
        escopo.launch { carregarLojaPublica() }
    }

    /* -------------------- Login com Google -------------------- */

    /** Cliente do Google Sign-In (use só quando [loginDisponivel]). */
    fun googleClient(context: Context): GoogleSignInClient {
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(Config.GOOGLE_WEB_CLIENT_ID)
            .requestEmail()
            .build()
        return GoogleSignIn.getClient(context, gso)
    }

    /** Troca o idToken do Google por uma sessão no Firebase. */
    suspend fun entrarComIdToken(idToken: String) {
        val a = auth ?: return
        val cred = GoogleAuthProvider.getCredential(idToken, null)
        a.signInWithCredential(cred).await()
        carregarLojaPublica()
    }

    /** Desloga do Firebase e do Google, e limpa os dados locais (como no site). */
    suspend fun sair(context: Context) {
        auth?.signOut()
        try {
            if (loginDisponivel) googleClient(context).signOut().await()
        } catch (e: Exception) { /* ignora */ }
        Cart.limpar()
    }

    /* -------------------- Perfil -------------------- */

    suspend fun perfil(): Perfil? {
        val u = usuario ?: return null
        val d = db ?: return null
        return try {
            val doc = d.collection("users").document(u.uid).get().await()
            if (doc.exists()) docParaPerfil(doc, u.email) else null
        } catch (e: Exception) {
            null
        }
    }

    suspend fun salvarPerfil(perfil: Perfil): Boolean {
        val u = usuario ?: return false
        val d = db ?: return false
        val mapa = hashMapOf<String, Any>(
            "nome" to perfil.nome,
            "email" to perfil.email.ifBlank { u.email },
            "telefone" to perfil.telefone,
            "instagram" to perfil.instagram,
            "endereco" to hashMapOf(
                "cep" to perfil.endereco.cep,
                "rua" to perfil.endereco.rua,
                "numero" to perfil.endereco.numero,
                "complemento" to perfil.endereco.complemento,
                "bairro" to perfil.endereco.bairro,
                "cidade" to perfil.endereco.cidade,
                "uf" to perfil.endereco.uf,
            ),
            "cadastroCompleto" to perfil.cadastroCompleto,
            "atualizadoEm" to FieldValue.serverTimestamp(),
        )
        return try {
            d.collection("users").document(u.uid).set(mapa, SetOptions.merge()).await()
            true
        } catch (e: Exception) {
            false
        }
    }

    /** Regra do site: nome preenchido e WhatsApp com pelo menos 10 dígitos. */
    fun perfilCompleto(perfil: Perfil): Boolean {
        if (perfil.cadastroCompleto) return true
        val tel = perfil.telefone.filter { it.isDigit() }
        return perfil.nome.isNotBlank() && tel.length >= 10
    }

    /* -------------------- Pedidos -------------------- */

    suspend fun salvarPedido(pedido: Pedido): Boolean {
        val u = usuario ?: return false
        val d = db ?: return false
        val mapa = hashMapOf(
            "codigo" to pedido.codigo,
            "status" to pedido.status,
            "total" to pedido.total,
            "subtotal" to pedido.subtotal,
            "frete" to pedido.frete,
            "entrega" to pedido.entrega,
            "endereco" to pedido.endereco,
            "itens" to pedido.itens.map {
                hashMapOf(
                    "id" to it.id,
                    "titulo" to it.titulo,
                    "autor" to it.autor,
                    "qty" to it.qty,
                    "preco" to it.preco,
                )
            },
            "criadoEm" to FieldValue.serverTimestamp(),
        )
        return try {
            d.collection("users").document(u.uid)
                .collection("pedidos").document(pedido.codigo)
                .set(mapa, SetOptions.merge()).await()
            true
        } catch (e: Exception) {
            false
        }
    }

    suspend fun listarPedidos(): List<Pedido> {
        val u = usuario ?: return emptyList()
        val d = db ?: return emptyList()
        return try {
            val snap = d.collection("users").document(u.uid)
                .collection("pedidos")
                .orderBy("criadoEm", Query.Direction.DESCENDING)
                .limit(50).get().await()
            snap.documents.map { docParaPedido(it) }
        } catch (e: Exception) {
            emptyList()
        }
    }

    /* -------------------- Loja pública (disponibilidade + catálogo) -------------------- */

    suspend fun carregarLojaPublica() {
        val d = db ?: return
        try {
            val snap = d.collection("disponibilidade").get().await()
            val novos = snap.documents.associate { doc ->
                doc.id to Disponibilidade(
                    estado = doc.getString("estado") ?: "",
                    ate = doc.getLong("ate") ?: 0L,
                    uid = doc.getString("uid") ?: "",
                )
            }
            disponibilidade.clear()
            disponibilidade.putAll(novos)
        } catch (e: Exception) { /* ignora */ }

        try {
            val snap = d.collection("catalogo").get().await()
            val livros = snap.documents.mapNotNull { docParaBook(it) }
            catalogoAdmin.clear()
            catalogoAdmin.addAll(livros)
        } catch (e: Exception) { /* ignora */ }
    }

    /** O livro está fora da loja (reservado ativo ou vendido)? Mesma regra do site. */
    fun indisponivel(id: String): Boolean {
        val d = disponibilidade[id] ?: return false
        if (d.estado == "vendido") return true
        if (d.estado == "reservado" && (d.ate == 0L || d.ate > System.currentTimeMillis())) return true
        return false
    }

    /* -------------------- Reserva / venda (checkout + admin) -------------------- */

    suspend fun reservarLivros(ids: List<String>) {
        val u = usuario ?: return
        val d = db ?: return
        val ate = System.currentTimeMillis() + 30 * 60 * 1000  // reserva vale 30 min
        ids.filter { it.isNotBlank() }.forEach { id ->
            try {
                d.collection("disponibilidade").document(id)
                    .set(hashMapOf("estado" to "reservado", "ate" to ate, "uid" to u.uid), SetOptions.merge())
                    .await()
                disponibilidade[id] = Disponibilidade("reservado", ate, u.uid)
            } catch (e: Exception) { /* ignora */ }
        }
    }

    suspend fun marcarVendidos(ids: List<String>) {
        val u = usuario ?: return
        val d = db ?: return
        ids.filter { it.isNotBlank() }.forEach { id ->
            try {
                d.collection("disponibilidade").document(id)
                    .set(hashMapOf("estado" to "vendido", "uid" to u.uid), SetOptions.merge())
                    .await()
                disponibilidade[id] = Disponibilidade("vendido", 0L, u.uid)
            } catch (e: Exception) { /* ignora */ }
        }
    }

    /** Repõe o livro na loja: apaga o registro de disponibilidade. */
    suspend fun liberarLivros(ids: List<String>) {
        val u = usuario ?: return
        val d = db ?: return
        ids.filter { it.isNotBlank() }.forEach { id ->
            try {
                d.collection("disponibilidade").document(id).delete().await()
                disponibilidade.remove(id)
            } catch (e: Exception) { /* ignora */ }
        }
    }

    /**
     * Ação do painel admin: define o estado de um livro.
     * "disponivel" repõe (apaga o registro); "reservado"/"vendido" gravam.
     */
    suspend fun adminDefinirEstado(id: String, estado: String): Boolean {
        if (!ehAdmin || id.isBlank()) return false
        return try {
            when (estado) {
                "disponivel" -> liberarLivros(listOf(id))
                "reservado" -> reservarLivros(listOf(id))
                "vendido" -> marcarVendidos(listOf(id))
                else -> return false
            }
            true
        } catch (e: Exception) {
            false
        }
    }

    /* -------------------- Conversores Firestore -> modelo -------------------- */

    private fun docParaPerfil(doc: DocumentSnapshot, emailPadrao: String): Perfil {
        @Suppress("UNCHECKED_CAST")
        val end = doc.get("endereco") as? Map<String, Any?> ?: emptyMap()
        fun s(mapa: Map<String, Any?>, chave: String) = (mapa[chave] as? String).orEmpty()
        return Perfil(
            nome = doc.getString("nome").orEmpty(),
            email = doc.getString("email") ?: emailPadrao,
            telefone = doc.getString("telefone").orEmpty(),
            instagram = doc.getString("instagram").orEmpty(),
            endereco = Endereco(
                cep = s(end, "cep"),
                rua = s(end, "rua"),
                numero = s(end, "numero"),
                complemento = s(end, "complemento"),
                bairro = s(end, "bairro"),
                cidade = s(end, "cidade"),
                uf = s(end, "uf"),
            ),
            cadastroCompleto = doc.getBoolean("cadastroCompleto") ?: false,
        )
    }

    private fun docParaPedido(doc: DocumentSnapshot): Pedido {
        @Suppress("UNCHECKED_CAST")
        val itensRaw = doc.get("itens") as? List<Map<String, Any?>> ?: emptyList()
        val itens = itensRaw.map { m ->
            ItemPedido(
                id = (m["id"] as? String).orEmpty(),
                titulo = (m["titulo"] as? String).orEmpty(),
                autor = (m["autor"] as? String).orEmpty(),
                qty = (m["qty"] as? Number)?.toInt() ?: 1,
                preco = (m["preco"] as? Number)?.toDouble() ?: 0.0,
            )
        }
        return Pedido(
            codigo = doc.getString("codigo") ?: doc.id,
            status = doc.getString("status").orEmpty(),
            total = (doc.get("total") as? Number)?.toDouble() ?: 0.0,
            subtotal = (doc.get("subtotal") as? Number)?.toDouble() ?: 0.0,
            frete = (doc.get("frete") as? Number)?.toDouble() ?: 0.0,
            entrega = doc.getString("entrega").orEmpty(),
            endereco = doc.getString("endereco").orEmpty(),
            itens = itens,
            criadoEm = doc.getTimestamp("criadoEm")?.toDate()?.time ?: 0L,
        )
    }

    private fun docParaBook(doc: DocumentSnapshot): Book? {
        val titulo = doc.getString("titulo") ?: return null
        return Book(
            titulo = titulo,
            autor = doc.getString("autor").orEmpty(),
            genero = doc.getString("genero") ?: "Outros",
            preco = doc.getString("preco").orEmpty(),
            estoque = (doc.getLong("estoque") ?: 1L).toInt(),
            estado = doc.getString("estado").orEmpty(),
            sinopse = doc.getString("sinopse").orEmpty(),
            imagem = doc.getString("imagem").orEmpty(),
            destaque = doc.getBoolean("destaque") ?: false,
            dataAdicao = doc.getString("dataAdicao"),
            idOverride = doc.id,
        )
    }
}
