package com.bookverse.app.data

import java.text.Normalizer
import java.util.Locale

/**
 * Gerador de "Pix Copia e Cola" (BR Code / EMV-MPM do Banco Central).
 * Portado de js/pix.js — mesmo CRC16-CCITT e mesma montagem dos campos.
 */
object PixGen {

    /** Campo EMV: id + tamanho(2 dígitos) + valor. */
    private fun emv(id: String, valor: String): String =
        id + valor.length.toString().padStart(2, '0') + valor

    /** Remove acentos e mantém só ASCII imprimível (exigência do Pix). */
    private fun soAscii(txt: String): String {
        val semAcento = Normalizer.normalize(txt, Normalizer.Form.NFD)
            .replace(Regex("\\p{Mn}+"), "")
        return semAcento.replace(Regex("[^\\x20-\\x7E]"), "").trim()
    }

    /** CRC16-CCITT (polinômio 0x1021, inicial 0xFFFF). */
    fun crc16(str: String): String {
        var crc = 0xFFFF
        for (ch in str) {
            crc = crc xor (ch.code shl 8)
            repeat(8) {
                crc = if (crc and 0x8000 != 0) (crc shl 1) xor 0x1021 else crc shl 1
                crc = crc and 0xFFFF
            }
        }
        return crc.toString(16).uppercase().padStart(4, '0')
    }

    /**
     * Gera o payload completo do "Pix Copia e Cola".
     * @param valor valor da transação (número, ex.: 45.0)
     * @param txid identificador do pedido (ex.: "BV12AB34")
     */
    fun gerarPayload(
        chave: String,
        nome: String,
        cidade: String,
        valor: Double,
        txid: String,
    ): String {
        val ch = soAscii(chave)
        val nm = soAscii(nome).take(25).ifBlank { "RECEBEDOR" }
        val cid = soAscii(cidade).take(15).uppercase().ifBlank { "BRASIL" }
        val vl = String.format(Locale.US, "%.2f", valor)
        val tx = soAscii(txid).replace(Regex("[^A-Za-z0-9]"), "").take(25).ifBlank { "***" }

        val merchantAccount = emv("26", emv("00", "br.gov.bcb.pix") + emv("01", ch))
        val adicional = emv("62", emv("05", tx))

        val semCRC =
            emv("00", "01") +
                merchantAccount +
                emv("52", "0000") +
                emv("53", "986") +
                emv("54", vl) +
                emv("58", "BR") +
                emv("59", nm) +
                emv("60", cid) +
                adicional +
                "6304"

        return semCRC + crc16(semCRC)
    }

    /** Código curto do pedido, ex.: "BV12AB34". */
    fun gerarCodigoPedido(): String {
        val alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        val sufixo = (1..6).map { alfabeto.random() }.joinToString("")
        return "BV$sufixo"
    }
}
