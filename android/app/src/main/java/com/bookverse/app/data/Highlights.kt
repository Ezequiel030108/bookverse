package com.bookverse.app.data

import com.bookverse.app.model.Book
import java.util.Calendar

/**
 * "Novidades da Semana" — portado da lógica de js/main.js.
 * Mostra os livros adicionados nos últimos 7 dias; se forem poucos,
 * completa com os mais recentes; se não houver datas, usa os primeiros
 * disponíveis.
 */
object Highlights {
    private const val DIAS_NOVIDADE = 7
    private const val ALVO = 6
    private const val MAX = 10

    private fun dataMs(livro: Book): Long? {
        val iso = livro.dataAdicao ?: return null
        return try {
            val p = iso.split("-")
            val cal = Calendar.getInstance()
            cal.clear()
            cal.set(p[0].toInt(), p[1].toInt() - 1, p[2].toInt(), 0, 0, 0)
            cal.timeInMillis
        } catch (e: Exception) {
            null
        }
    }

    private fun diasDesde(livro: Book): Double {
        val t = dataMs(livro) ?: return Double.POSITIVE_INFINITY
        return (System.currentTimeMillis() - t) / 86_400_000.0
    }

    private fun disponivel(livro: Book) = livro.estoque > 0

    data class Resultado(val destaques: List<Book>, val temSemana: Boolean)

    fun calcular(): Resultado {
        val disp = Catalog.livros.filter { disponivel(it) }
        val porDataDesc = compareByDescending<Book> { dataMs(it) ?: Long.MIN_VALUE }

        val semana = disp.filter { diasDesde(it) <= DIAS_NOVIDADE }.sortedWith(porDataDesc)
        val temSemana = semana.isNotEmpty()

        val destaques = semana.toMutableList()
        if (destaques.size < ALVO) {
            val recentes = disp
                .filter { dataMs(it) != null && it !in destaques }
                .sortedWith(porDataDesc)
            for (l in recentes) {
                if (destaques.size >= ALVO) break
                destaques.add(l)
            }
        }
        if (destaques.isEmpty()) destaques.addAll(disp.take(ALVO))

        return Resultado(destaques.take(MAX), temSemana)
    }
}
