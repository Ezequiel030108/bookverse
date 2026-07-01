package com.bookverse.app.data

/** Configuração da loja — espelha js/config.js. */
object Config {
    const val NOME_LOJA = "BookVerse"
    const val CIDADE = "Juazeirinho"
    const val INSTAGRAM = "mybookverse.pb"        // sem o @
    const val WHATSAPP = ""                        // só números, ex.: 5583999998888
    const val SIMBOLO_MOEDA = "R$"

    // ----- Pix (modo manual: gerado no próprio app com a chave abaixo) -----
    const val PIX_CHAVE = "13377347488"
    const val PIX_NOME = "Cauan Batista da Costa"
    const val PIX_CIDADE = "Juazeirinho"

    // ----- Recebimento do pedido por e-mail (Web3Forms) -----
    const val WEB3FORMS_KEY = "5306d669-6b95-4729-85ba-3c256ec61142"

    // ----- Contas (Firebase) — espelha o bloco "firebase" de js/config.js -----
    // Estes dados são públicos por natureza (ficam no site). O app inicializa o
    // Firebase por FirebaseOptions em tempo de execução, sem google-services.json.
    const val FIREBASE_API_KEY = "AIzaSyBkD1A6yvhUJPWhs6qe-EwqzRjXekDh8PU"
    const val FIREBASE_PROJECT_ID = "bookverse-69878"
    const val FIREBASE_APP_ID = "1:784486720606:web:7cefa1b2c002ddbe4e40cf"

    // "Web client ID" do OAuth (Firebase Auth → Login com Google). É OBRIGATÓRIO
    // para o login funcionar no app: pegue-o no Google Cloud / Firebase Console
    // (client OAuth do tipo "Web") e cole aqui. Enquanto estiver vazio, o botão
    // "Entrar com Google" fica desativado. Lembre-se também de cadastrar o SHA-1
    // do app no Firebase (veja o android/README.md).
    const val GOOGLE_WEB_CLIENT_ID = ""

    // Exigir conta (login Google) para finalizar o pedido — igual a
    // pedidos.exigirConta de js/config.js. Só vale quando o login está
    // disponível (Firebase + Web client ID configurados).
    const val EXIGIR_CONTA = true

    // E-mails que enxergam o painel de Administração — igual a admin.emails.
    val ADMIN_EMAILS = listOf(
        "ezequielfigueiredoaraujobatist@gmail.com",
        "cauantista@gmail.com",
        "marialeticinha22@gmail.com",
        "oficialpaulo6@gmail.com",
    )

    /** Firebase (leituras públicas: disponibilidade/catálogo) está configurado? */
    fun firebaseConfigurado(): Boolean =
        FIREBASE_API_KEY.isNotBlank() &&
            FIREBASE_PROJECT_ID.isNotBlank() &&
            FIREBASE_APP_ID.isNotBlank()

    /** O e-mail informado é de um administrador da loja? */
    fun ehAdmin(email: String?): Boolean =
        !email.isNullOrBlank() && ADMIN_EMAILS.any { it.equals(email.trim(), ignoreCase = true) }

    data class Frete(
        val id: String,
        val titulo: String,
        val descricao: String,
        val valor: Int,
        val pedeEndereco: Boolean,
    )

    val fretes = listOf(
        Frete(
            id = "combinar",
            titulo = "Combinar entrega",
            descricao = "Entramos em contato pelo WhatsApp para combinar local e horário da entrega. Opção ideal para quem estuda na ECIT Deputado Genival Matias — a mesma escola de parte da nossa equipe. 💜",
            valor = 0,
            pedeEndereco = false,
        ),
        Frete(
            id = "domicilio",
            titulo = "Entrega a domicílio (somente em Juazeirinho)",
            descricao = "Levamos o pedido até você, no endereço informado abaixo. Disponível apenas em Juazeirinho.",
            valor = 0,
            pedeEndereco = true,
        ),
    )

    /** Link para conversar no Instagram (Direct). */
    fun linkInstagram(): String = "https://ig.me/m/$INSTAGRAM"
}
