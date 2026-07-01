package com.bookverse.app.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.URL
import javax.net.ssl.HttpsURLConnection

/**
 * Envia o pedido por e-mail via Web3Forms — mesmo serviço usado pelo
 * site (js/checkout.js). O e-mail cai na conta configurada na Access Key.
 */
object OrderSender {

    /** Dados de um pedido a enviar. */
    data class Pedido(
        val codigo: String,
        val nome: String,
        val email: String,
        val whatsapp: String,
        val entrega: String,
        val endereco: String,
        val itens: String,
        val total: String,
    )

    /** Retorna true quando o e-mail foi aceito pelo Web3Forms. */
    suspend fun enviar(pedido: Pedido): Boolean = withContext(Dispatchers.IO) {
        val key = Config.WEB3FORMS_KEY
        if (key.isBlank()) return@withContext false
        try {
            val corpo = JSONObject().apply {
                put("access_key", key)
                put("subject", "Novo pedido ${Config.NOME_LOJA} — ${pedido.codigo}")
                put("from_name", "${Config.NOME_LOJA} (app)")
                put("replyto", pedido.email)
                put("Código do pedido", pedido.codigo)
                put("Cliente", pedido.nome)
                put("E-mail", pedido.email)
                put("WhatsApp", pedido.whatsapp.ifBlank { "—" })
                put("Entrega", pedido.entrega)
                put("Endereço", pedido.endereco.ifBlank { "Entrega a combinar" })
                put("Itens", pedido.itens)
                put("Total", pedido.total)
            }.toString()

            val conn = (URL("https://api.web3forms.com/submit").openConnection() as HttpsURLConnection).apply {
                requestMethod = "POST"
                doOutput = true
                connectTimeout = 15000
                readTimeout = 15000
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Accept", "application/json")
            }
            conn.outputStream.use { it.write(corpo.toByteArray(Charsets.UTF_8)) }
            val code = conn.responseCode
            conn.disconnect()
            code in 200..299
        } catch (e: Exception) {
            false
        }
    }
}
