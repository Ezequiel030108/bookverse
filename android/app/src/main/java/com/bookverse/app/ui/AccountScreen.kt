package com.bookverse.app.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.bookverse.app.data.Account
import com.bookverse.app.data.Catalog
import com.bookverse.app.data.Endereco
import com.bookverse.app.data.Pedido
import com.bookverse.app.data.Perfil
import com.bookverse.app.data.Pricing
import com.bookverse.app.data.Usuario
import com.bookverse.app.model.Book
import com.bookverse.app.ui.components.StarField
import com.bookverse.app.ui.theme.AuroraRosa
import com.bookverse.app.ui.theme.Estrela
import com.bookverse.app.ui.theme.EstrelaClara
import com.bookverse.app.ui.theme.Indigo
import com.bookverse.app.ui.theme.Lavanda
import com.bookverse.app.ui.theme.LavandaClara
import com.bookverse.app.ui.theme.Noite
import com.bookverse.app.ui.theme.NoiteProfunda
import com.bookverse.app.ui.theme.TextoClaro
import com.bookverse.app.ui.theme.TextoDiscreto
import com.bookverse.app.ui.theme.TextoSuave
import com.bookverse.app.ui.theme.Vidro
import com.bookverse.app.ui.theme.VidroBorda
import com.bookverse.app.ui.theme.Violeta
import com.bookverse.app.ui.theme.fundoBrush
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.common.api.ApiException
import kotlinx.coroutines.launch
import java.text.Normalizer
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private fun norm(texto: String): String =
    Normalizer.normalize(texto, Normalizer.Form.NFD)
        .replace(Regex("\\p{Mn}+"), "")
        .lowercase()

private enum class Aba { DADOS, PEDIDOS, ADMIN }

@Composable
fun AccountScreen(onBack: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(fundoBrush()),
    ) {
        StarField(Modifier.fillMaxSize())

        Column(Modifier.fillMaxSize()) {
            // Barra superior
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(NoiteProfunda.copy(alpha = 0.85f))
                    .windowInsetsPadding(WindowInsets.statusBars)
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Voltar", tint = TextoClaro)
                }
                Text(
                    text = "Minha conta",
                    color = TextoClaro,
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp,
                )
            }

            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
            ) {
                val usuario = Account.usuario
                when {
                    !Account.configurado -> NaoConfigurado(onBack)
                    !Account.pronto -> Carregando()
                    usuario == null -> LoginBox()
                    else -> Painel(usuario)
                }
            }
        }
    }
}

/* ------------------------------------------------------------------ */
/*  Estados iniciais                                                    */
/* ------------------------------------------------------------------ */

@Composable
private fun Carregando() {
    Column(
        modifier = Modifier.fillMaxWidth().padding(top = 40.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        CircularProgressIndicator(color = Estrela, strokeWidth = 2.dp)
        Spacer(Modifier.height(12.dp))
        Text("Carregando…", color = TextoSuave, fontSize = 14.sp)
    }
}

@Composable
private fun NaoConfigurado(onBack: () -> Unit) {
    Bloco("Contas ainda não configuradas") {
        Text(
            "O login com Google ainda não foi ativado neste app.",
            color = TextoSuave, fontSize = 14.sp,
        )
        Spacer(Modifier.height(16.dp))
        OutlinedButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) {
            Text("Voltar à loja", color = TextoClaro)
        }
    }
}

/* ------------------------------------------------------------------ */
/*  Login com Google                                                   */
/* ------------------------------------------------------------------ */

@Composable
private fun LoginBox() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var erro by remember { mutableStateOf<String?>(null) }
    var entrando by remember { mutableStateOf(false) }

    val launcher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
        try {
            val conta = task.getResult(ApiException::class.java)
            val idToken = conta.idToken
            if (idToken.isNullOrBlank()) {
                erro = "Não recebemos o token do Google. Confira o Web client ID e o SHA-1 no Firebase."
            } else {
                entrando = true
                scope.launch {
                    try {
                        Account.entrarComIdToken(idToken)
                        erro = null
                    } catch (e: Exception) {
                        erro = "Não foi possível entrar agora. Tente novamente."
                    }
                    entrando = false
                }
            }
        } catch (e: ApiException) {
            erro = "Login cancelado ou falhou (código ${e.statusCode})."
        }
    }

    Bloco("Entre na sua conta") {
        Text(
            "Faça login para finalizar pedidos com mais rapidez e acompanhar o histórico.",
            color = TextoSuave, fontSize = 14.sp,
        )
        Spacer(Modifier.height(16.dp))
        Button(
            onClick = { launcher.launch(Account.googleClient(context).signInIntent) },
            enabled = Account.loginDisponivel && !entrando,
            colors = ButtonDefaults.buttonColors(containerColor = TextoClaro, contentColor = NoiteProfunda),
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (entrando) {
                CircularProgressIndicator(color = NoiteProfunda, strokeWidth = 2.dp, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
            }
            Text("Entrar com Google", fontWeight = FontWeight.Bold)
        }
        if (!Account.loginDisponivel) {
            Spacer(Modifier.height(10.dp))
            Text(
                "O login ainda não está ligado: falta preencher o \"Web client ID\" em Config.kt e " +
                    "cadastrar o SHA-1 do app no Firebase (veja o android/README.md).",
                color = AuroraRosa, fontSize = 12.sp,
            )
        }
        erro?.let {
            Spacer(Modifier.height(10.dp))
            Text(it, color = AuroraRosa, fontSize = 12.sp)
        }
    }
}

/* ------------------------------------------------------------------ */
/*  Painel do usuário logado                                           */
/* ------------------------------------------------------------------ */

@Composable
private fun Painel(usuario: Usuario) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var aba by remember { mutableStateOf(Aba.DADOS) }

    // Cabeçalho: avatar + nome + e-mail + sair
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Indigo.copy(alpha = 0.4f))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(Brush.linearGradient(listOf(Violeta, Indigo)))
                .border(1.dp, VidroBorda, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            if (usuario.foto.isNotBlank()) {
                AsyncImage(
                    model = usuario.foto,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize().clip(CircleShape),
                )
            } else {
                Icon(Icons.Rounded.Person, contentDescription = null, tint = LavandaClara, modifier = Modifier.size(26.dp))
            }
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                usuario.nome.ifBlank { "Leitor(a)" },
                color = TextoClaro, fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 16.sp,
                maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
            Text(usuario.email, color = TextoDiscreto, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        OutlinedButton(onClick = { scope.launch { Account.sair(context) } }) {
            Text("Sair", color = TextoClaro, fontSize = 13.sp)
        }
    }

    Spacer(Modifier.height(14.dp))

    // Abas
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Chip("Meus dados", aba == Aba.DADOS) { aba = Aba.DADOS }
        Chip("Meus pedidos", aba == Aba.PEDIDOS) { aba = Aba.PEDIDOS }
        if (Account.ehAdmin) Chip("Admin", aba == Aba.ADMIN) { aba = Aba.ADMIN }
    }

    Spacer(Modifier.height(14.dp))

    when (aba) {
        Aba.DADOS -> PerfilForm(usuario)
        Aba.PEDIDOS -> PedidosList()
        Aba.ADMIN -> if (Account.ehAdmin) AdminPanel() else PedidosList()
    }
}

@Composable
private fun Chip(texto: String, ativo: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(if (ativo) Brush.horizontalGradient(listOf(Estrela, EstrelaClara)) else Brush.horizontalGradient(listOf(Vidro, Vidro)))
            .border(1.dp, if (ativo) Estrela else VidroBorda, RoundedCornerShape(999.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp),
    ) {
        Text(
            texto,
            color = if (ativo) NoiteProfunda else TextoSuave,
            fontWeight = FontWeight.Bold,
            fontSize = 13.sp,
        )
    }
}

/* ------------------------------------------------------------------ */
/*  Aba: Meus dados (perfil editável)                                  */
/* ------------------------------------------------------------------ */

@Composable
private fun PerfilForm(usuario: Usuario) {
    val scope = rememberCoroutineScope()
    var carregado by remember { mutableStateOf(false) }

    var nome by remember { mutableStateOf(usuario.nome) }
    var telefone by remember { mutableStateOf("") }
    var instagram by remember { mutableStateOf("") }
    var cep by remember { mutableStateOf("") }
    var rua by remember { mutableStateOf("") }
    var numero by remember { mutableStateOf("") }
    var complemento by remember { mutableStateOf("") }
    var bairro by remember { mutableStateOf("") }
    var cidade by remember { mutableStateOf("") }
    var uf by remember { mutableStateOf("") }

    var salvando by remember { mutableStateOf(false) }
    var salvo by remember { mutableStateOf(false) }

    LaunchedEffect(usuario.uid) {
        val p = Account.perfil()
        if (p != null) {
            if (p.nome.isNotBlank()) nome = p.nome
            telefone = p.telefone
            instagram = p.instagram
            cep = p.endereco.cep
            rua = p.endereco.rua
            numero = p.endereco.numero
            complemento = p.endereco.complemento
            bairro = p.endereco.bairro
            cidade = p.endereco.cidade
            uf = p.endereco.uf
        }
        carregado = true
    }

    Bloco("Meus dados") {
        Text(
            "Estes dados preenchem o checkout automaticamente. Os campos com * são obrigatórios.",
            color = TextoDiscreto, fontSize = 12.sp,
        )
        Spacer(Modifier.height(10.dp))
        Campo(nome, { nome = it; salvo = false }, "Nome completo *")
        Campo(usuario.email, {}, "E-mail", habilitado = false)
        Campo(telefone, { telefone = it; salvo = false }, "WhatsApp (com DDD) *")
        Campo(instagram, { instagram = it; salvo = false }, "Instagram (opcional)")

        Spacer(Modifier.height(8.dp))
        Text("Endereço de entrega (para entrega a domicílio)", color = Lavanda, fontWeight = FontWeight.Bold, fontSize = 12.sp)
        Spacer(Modifier.height(6.dp))
        Row {
            Box(Modifier.weight(1f)) { Campo(cep, { cep = it; salvo = false }, "CEP") }
            Spacer(Modifier.width(8.dp))
            Box(Modifier.weight(2f)) { Campo(rua, { rua = it; salvo = false }, "Rua / Logradouro") }
        }
        Row {
            Box(Modifier.weight(1f)) { Campo(numero, { numero = it; salvo = false }, "Número") }
            Spacer(Modifier.width(8.dp))
            Box(Modifier.weight(2f)) { Campo(complemento, { complemento = it; salvo = false }, "Complemento (opcional)") }
        }
        Campo(bairro, { bairro = it; salvo = false }, "Bairro")
        Row {
            Box(Modifier.weight(2f)) { Campo(cidade, { cidade = it; salvo = false }, "Cidade") }
            Spacer(Modifier.width(8.dp))
            Box(Modifier.weight(1f)) { Campo(uf, { uf = it; salvo = false }, "UF") }
        }

        Spacer(Modifier.height(14.dp))
        Button(
            onClick = {
                salvando = true
                salvo = false
                scope.launch {
                    val perfil = Perfil(
                        nome = nome.trim(),
                        email = usuario.email,
                        telefone = telefone.trim(),
                        instagram = instagram.trim().removePrefix("@"),
                        endereco = Endereco(
                            cep = cep.trim(), rua = rua.trim(), numero = numero.trim(),
                            complemento = complemento.trim(), bairro = bairro.trim(),
                            cidade = cidade.trim(), uf = uf.trim().uppercase(),
                        ),
                    )
                    val ok = Account.salvarPerfil(perfil.copy(cadastroCompleto = Account.perfilCompleto(perfil)))
                    salvando = false
                    salvo = ok
                }
            },
            enabled = carregado && !salvando && nome.isNotBlank(),
            colors = ButtonDefaults.buttonColors(containerColor = Estrela, contentColor = NoiteProfunda),
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (salvando) {
                CircularProgressIndicator(color = NoiteProfunda, strokeWidth = 2.dp, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
            }
            Text("Salvar", fontWeight = FontWeight.Bold)
        }
        if (salvo) {
            Spacer(Modifier.height(8.dp))
            Text("✅ Dados salvos!", color = EstrelaClara, fontSize = 13.sp)
        }
    }
}

/* ------------------------------------------------------------------ */
/*  Aba: Meus pedidos                                                  */
/* ------------------------------------------------------------------ */

@Composable
private fun PedidosList() {
    var pedidos by remember { mutableStateOf<List<Pedido>?>(null) }
    LaunchedEffect(Unit) { pedidos = Account.listarPedidos() }

    Bloco("Meus pedidos") {
        val lista = pedidos
        when {
            lista == null -> Carregando()
            lista.isEmpty() -> Text(
                "Você ainda não fez nenhum pedido por aqui.",
                color = TextoSuave, fontSize = 14.sp,
            )
            else -> Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                lista.forEach { PedidoCard(it) }
            }
        }
    }
}

@Composable
private fun PedidoCard(pedido: Pedido) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(Noite)
            .padding(12.dp),
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(pedido.codigo, color = TextoClaro, fontWeight = FontWeight.Bold, fontSize = 14.sp, modifier = Modifier.weight(1f))
            StatusBadge(pedido.status)
        }
        if (pedido.criadoEm > 0L) {
            Text(formatarData(pedido.criadoEm), color = TextoDiscreto, fontSize = 11.sp, modifier = Modifier.padding(top = 2.dp))
        }
        Spacer(Modifier.height(8.dp))
        pedido.itens.forEach { item ->
            Row(Modifier.fillMaxWidth().padding(vertical = 1.dp)) {
                Text("${item.qty}× ${item.titulo}", color = TextoSuave, fontSize = 12.sp, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(Pricing.formatarBRL(item.preco), color = TextoClaro, fontSize = 12.sp)
            }
        }
        Spacer(Modifier.height(6.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Total", color = TextoSuave, fontSize = 13.sp)
            Text(Pricing.formatarBRL(pedido.total), color = Estrela, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        }
        if (pedido.entrega.isNotBlank()) {
            Text(
                "Entrega: ${pedido.entrega}" + if (pedido.endereco.isNotBlank()) " — ${pedido.endereco}" else "",
                color = TextoDiscreto, fontSize = 11.sp, modifier = Modifier.padding(top = 4.dp),
            )
        }
    }
}

@Composable
private fun StatusBadge(status: String) {
    val (texto, cor) = when (status.lowercase()) {
        "pago" -> "Pago" to EstrelaClara
        "aguardando" -> "Aguardando confirmação" to Lavanda
        "pendente" -> "Pagamento pendente" to Lavanda
        "cancelado" -> "Cancelado" to AuroraRosa
        else -> (status.ifBlank { "—" }) to TextoDiscreto
    }
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(Vidro)
            .border(1.dp, VidroBorda, RoundedCornerShape(999.dp))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    ) {
        Text(texto, color = cor, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
    }
}

/* ------------------------------------------------------------------ */
/*  Aba: Administração (marcar disponível / reservado / vendido)       */
/* ------------------------------------------------------------------ */

@Composable
private fun AdminPanel() {
    val scope = rememberCoroutineScope()
    var busca by remember { mutableStateOf("") }

    val extras = Account.catalogoAdmin.toList()
    val livros = remember(extras) { Catalog.mesclarComAdmin(extras) }
    val termo = norm(busca.trim())
    val filtrados = remember(livros, termo) {
        if (termo.isBlank()) livros
        else livros.filter { norm("${it.titulo} ${it.autor}").contains(termo) }
    }

    Bloco("Administração da loja") {
        Text(
            "Marque cada livro como Disponível, Reservado ou Vendido. As mudanças " +
                "valem para todos os clientes assim que a loja recarregar.",
            color = TextoDiscreto, fontSize = 12.sp,
        )
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(
            value = busca,
            onValueChange = { busca = it },
            singleLine = true,
            leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null, tint = Lavanda) },
            placeholder = { Text("Buscar por título ou autor…", color = TextoDiscreto) },
            colors = campoColors(Noite),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(12.dp))
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            filtrados.forEach { livro ->
                AdminRow(livro) { estado ->
                    scope.launch { Account.adminDefinirEstado(livro.id, estado) }
                }
            }
        }
    }
}

@Composable
private fun AdminRow(livro: Book, onDefinir: (String) -> Unit) {
    val disp = Account.disponibilidade[livro.id]
    val estadoAtual = when {
        disp?.estado == "vendido" -> "vendido"
        disp?.estado == "reservado" && (disp.ate == 0L || disp.ate > System.currentTimeMillis()) -> "reservado"
        else -> "disponivel"
    }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(Noite)
            .padding(12.dp),
    ) {
        Text(livro.titulo, color = TextoClaro, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
        Text(livro.autor, color = TextoDiscreto, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            EstadoBotao("Disponível", estadoAtual == "disponivel") { onDefinir("disponivel") }
            EstadoBotao("Reservar", estadoAtual == "reservado") { onDefinir("reservado") }
            EstadoBotao("Vendido", estadoAtual == "vendido") { onDefinir("vendido") }
        }
    }
}

@Composable
private fun EstadoBotao(texto: String, ativo: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(if (ativo) Estrela else Vidro)
            .border(1.dp, if (ativo) Estrela else VidroBorda, RoundedCornerShape(999.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 7.dp),
    ) {
        Text(
            texto,
            color = if (ativo) NoiteProfunda else TextoSuave,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

/* ------------------------------------------------------------------ */
/*  Auxiliares                                                         */
/* ------------------------------------------------------------------ */

@Composable
private fun Bloco(titulo: String, conteudo: @Composable () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(bottom = 16.dp)) {
        Text(titulo, color = TextoClaro, fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 17.sp)
        Spacer(Modifier.height(10.dp))
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(Indigo.copy(alpha = 0.4f))
                .padding(14.dp),
        ) { conteudo() }
    }
}

@Composable
private fun Campo(
    valor: String,
    onChange: (String) -> Unit,
    rotulo: String,
    habilitado: Boolean = true,
) {
    OutlinedTextField(
        value = valor,
        onValueChange = onChange,
        label = { Text(rotulo, color = TextoDiscreto) },
        singleLine = true,
        enabled = habilitado,
        colors = campoColors(Noite),
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
    )
}

@Composable
private fun campoColors(fundo: androidx.compose.ui.graphics.Color) = OutlinedTextFieldDefaults.colors(
    focusedContainerColor = fundo,
    unfocusedContainerColor = fundo,
    disabledContainerColor = fundo,
    focusedBorderColor = Lavanda,
    unfocusedBorderColor = TextoDiscreto,
    disabledBorderColor = TextoDiscreto,
    focusedTextColor = TextoClaro,
    unfocusedTextColor = TextoClaro,
    disabledTextColor = TextoDiscreto,
    cursorColor = Estrela,
)

private val fmtData = SimpleDateFormat("dd/MM/yyyy 'às' HH:mm", Locale("pt", "BR"))
private fun formatarData(ms: Long): String = fmtData.format(Date(ms))
