package com.bookverse.app.data

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.snapshots.SnapshotStateMap
import com.bookverse.app.model.Book

/** Uma linha resolvida do carrinho (livro + quantidade + preços). */
data class CartLine(
    val book: Book,
    val qty: Int,
    val precoUnit: Double,
    val precoLinha: Double,
)

/** Estado resolvido do carrinho, com preços já calculados (inclui promoção). */
data class CartResolved(
    val itens: List<CartLine>,
    val totalItens: Int,
    val subtotal: Double,
) {
    val vazio: Boolean get() = itens.isEmpty()
}

/**
 * Carrinho de compras — portado de js/cart.js.
 * Guarda id -> quantidade e persiste em SharedPreferences, então o
 * carrinho não some ao reabrir o app. Os detalhes (preço, estoque)
 * são sempre lidos do [Catalog] na hora de resolver.
 */
object Cart {
    private const val PREFS = "bookverse"
    private const val KEY = "carrinho_v1"

    private var prefs: SharedPreferences? = null

    /** id -> quantidade. Observável pelo Compose. */
    val itens: SnapshotStateMap<String, Int> = mutableStateMapOf()

    fun init(context: Context) {
        if (prefs != null) return
        prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        carregar()
    }

    private fun carregar() {
        itens.clear()
        val bruto = prefs?.getString(KEY, "").orEmpty()
        if (bruto.isBlank()) return
        bruto.split(";").forEach { parte ->
            val kv = parte.split("=")
            if (kv.size == 2) {
                val q = kv[1].toIntOrNull() ?: 0
                if (q > 0 && kv[0].isNotBlank()) itens[kv[0]] = q
            }
        }
    }

    private fun salvar() {
        val s = itens.entries.joinToString(";") { "${it.key}=${it.value}" }
        prefs?.edit()?.putString(KEY, s)?.apply()
    }

    fun add(book: Book, qty: Int = 1) {
        val max = if (book.estoque > 0) book.estoque else 1
        val atual = itens[book.id] ?: 0
        itens[book.id] = (atual + qty).coerceAtMost(max)
        salvar()
    }

    fun definirQty(id: String, qty: Int) {
        if (qty <= 0) {
            itens.remove(id)
        } else {
            val max = Catalog.byId[id]?.estoque ?: qty
            itens[id] = qty.coerceAtMost(max)
        }
        salvar()
    }

    fun remover(id: String) {
        itens.remove(id)
        salvar()
    }

    fun limpar() {
        itens.clear()
        salvar()
    }

    val totalItens: Int get() = resolver().totalItens

    /** Resolve uma lista arbitrária de (id, qty) com os preços atuais. */
    fun resolverLista(lista: List<Pair<String, Int>>): CartResolved {
        val validas = lista.mapNotNull { (id, qty) ->
            val b = Catalog.byId[id] ?: return@mapNotNull null
            if (b.estoque <= 0) return@mapNotNull null
            b to qty.coerceIn(1, b.estoque)
        }
        val totalItens = validas.sumOf { it.second }
        val linhas = validas.map { (b, q) ->
            val unit = Pricing.precoUnitario(b, totalItens)
            CartLine(b, q, unit, unit * q)
        }
        val subtotal = linhas.sumOf { it.precoLinha }
        return CartResolved(linhas, totalItens, subtotal)
    }

    /** Resolve o carrinho salvo. */
    fun resolver(): CartResolved =
        resolverLista(itens.entries.map { it.key to it.value })
}
