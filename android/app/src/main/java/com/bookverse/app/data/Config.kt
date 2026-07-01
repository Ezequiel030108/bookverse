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
