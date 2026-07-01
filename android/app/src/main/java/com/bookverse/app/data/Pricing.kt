package com.bookverse.app.data

import com.bookverse.app.model.Book
import java.text.NumberFormat
import java.util.Calendar
import java.util.Locale
import kotlin.math.ceil

/** Promoção — espelha a constante PROMOCAO de js/livros.js. */
object Promocao {
    const val nome = "Copa do Mundo"
    const val inicio = "2026-06-11"
    const val fim = "2026-06-29"
    const val descontoUm = 10       // % off em qualquer livro
    const val descontoDupla = 20    // % off levando 2 ou mais
}

/**
 * Preços e promoção — portado de js/precos.js e js/main.js.
 * Garante que o preço mostrado seja o mesmo em toda a loja.
 */
object Pricing {

    private val locale = Locale("pt", "BR")

    private fun isoParaMs(iso: String, fimDoDia: Boolean): Long {
        val p = iso.split("-")
        val cal = Calendar.getInstance()
        cal.clear()
        cal.set(
            p[0].toInt(), p[1].toInt() - 1, p[2].toInt(),
            if (fimDoDia) 23 else 0,
            if (fimDoDia) 59 else 0,
            if (fimDoDia) 59 else 0,
        )
        return cal.timeInMillis
    }

    /** A promoção está ligada hoje? (mesma regra do site) */
    fun promoAtiva(): Boolean {
        val agora = System.currentTimeMillis()
        return agora in isoParaMs(Promocao.inicio, false)..isoParaMs(Promocao.fim, true)
    }

    /** "R$ 45,00" -> 45.0 (ou null se não der para ler). */
    fun precoNumerico(precoTexto: String): Double? {
        val limpo = precoTexto
            .replace(Regex("[^\\d,.-]"), "")
            .replace(".", "")
            .replace(",", ".")
        return limpo.toDoubleOrNull()
    }

    /** Arredonda para o real cheio, a favor do cliente (22,50 -> 22). */
    fun arredondarReal(valor: Double): Int = ceil(valor - 0.5).toInt()

    /** Formata em Reais no padrão brasileiro: 45.0 -> "R$ 45,00". */
    fun formatarBRL(valor: Double): String {
        val nf = NumberFormat.getNumberInstance(locale)
        nf.minimumFractionDigits = 2
        nf.maximumFractionDigits = 2
        return "${Config.SIMBOLO_MOEDA} ${nf.format(valor)}"
    }

    /** Real cheio sem centavos: 18 -> "R$ 18" (usado nos preços promocionais). */
    fun formatarReal(valorInteiro: Int): String = "${Config.SIMBOLO_MOEDA} $valorInteiro"

    /**
     * Preço unitário já considerando a promoção.
     * totalItens = quantidade total de livros no carrinho (desconto "levando 2+").
     * Em telas isoladas (card/modal), passe 1.
     */
    fun precoUnitario(livro: Book, totalItens: Int): Double {
        val base = precoNumerico(livro.preco) ?: return 0.0
        if (!promoAtiva()) return base
        val teto = if (livro.descontoMaximo > 0) livro.descontoMaximo else 100
        val usaDupla = totalItens >= 2
        val pct = minOf(if (usaDupla) Promocao.descontoDupla else Promocao.descontoUm, teto)
        return arredondarReal(base * (1 - pct / 100.0)).toDouble()
    }

    /** Preços promocionais de um livro (sozinho e na dupla). */
    data class Promo(val um: Int, val dupla: Int, val limitado: Boolean)

    fun precosPromo(livro: Book): Promo? {
        val cheio = precoNumerico(livro.preco) ?: return null
        val teto = if (livro.descontoMaximo > 0) livro.descontoMaximo else 100
        val pctUm = minOf(Promocao.descontoUm, teto)
        val pctDupla = minOf(Promocao.descontoDupla, teto)
        return Promo(
            um = arredondarReal(cheio * (1 - pctUm / 100.0)),
            dupla = arredondarReal(cheio * (1 - pctDupla / 100.0)),
            limitado = pctDupla < Promocao.descontoDupla,
        )
    }

    /** Último dia da promoção por extenso (ex.: "29 de junho"). */
    fun dataFimPromo(): String {
        val meses = listOf(
            "janeiro", "fevereiro", "março", "abril", "maio", "junho",
            "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
        )
        val p = Promocao.fim.split("-")
        return "${p[2].toInt()} de ${meses[p[1].toInt() - 1]}"
    }
}
