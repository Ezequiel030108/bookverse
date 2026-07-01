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

    /* ----- Contas (Firebase) — mesmo projeto do site (js/config.js) -----
       Estes valores são públicos por natureza. Enquanto FIREBASE_API_KEY/
       FIREBASE_PROJECT_ID estiverem preenchidos, as contas ligam. */
    const val FIREBASE_API_KEY = "AIzaSyBkD1A6yvhUJPWhs6qe-EwqzRjXekDh8PU"
    const val FIREBASE_AUTH_DOMAIN = "bookverse-69878.firebaseapp.com"
    const val FIREBASE_PROJECT_ID = "bookverse-69878"
    const val FIREBASE_APP_ID = "1:784486720606:web:7cefa1b2c002ddbe4e40cf"

    /* OAuth "Web client ID" do projeto (termina em .apps.googleusercontent.com).
       Necessário para o login com Google NO ANDROID. Pegue em:
       Firebase Console → Authentication → Sign-in method → Google → "Web SDK
       configuration" (ou Google Cloud → APIs e Serviços → Credenciais →
       "Web client"). Cole aqui. ENQUANTO VAZIO, o botão de login fica oculto.
       ⚠️ Também é preciso cadastrar o SHA-1 do app no projeto (ver README). */
    const val GOOGLE_WEB_CLIENT_ID = ""

    /* Exigir conta para finalizar o pedido (só vale se o Firebase acima
       estiver ligado). Espelha pedidos.exigirConta do site. */
    const val EXIGIR_CONTA = true

    /* E-mails (Google) que enxergam o painel de Administração. */
    val ADMIN_EMAILS = listOf(
        "ezequielfigueiredoaraujobatist@gmail.com",
        "cauantista@gmail.com",
        "marialeticinha22@gmail.com",
        "oficialpaulo6@gmail.com",
    )

    /** Firebase está configurado o suficiente para inicializar? */
    val firebaseConfigurado: Boolean
        get() = FIREBASE_API_KEY.isNotBlank() && FIREBASE_PROJECT_ID.isNotBlank() && FIREBASE_APP_ID.isNotBlank()

    /** Login com Google disponível? (precisa do Web client ID) */
    val loginDisponivel: Boolean
        get() = firebaseConfigurado && GOOGLE_WEB_CLIENT_ID.isNotBlank()

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
