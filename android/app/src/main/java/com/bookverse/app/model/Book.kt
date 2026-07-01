package com.bookverse.app.model

import java.text.Normalizer

/**
 * Um livro do catálogo. Espelha os campos usados em js/livros.js.
 * O [id] é derivado de título+autor (mesma regra do site, cart.js),
 * então o carrinho continua estável entre execuções.
 */
data class Book(
    val titulo: String,
    val autor: String,
    val genero: String,
    val preco: String,
    val estoque: Int,
    val estado: String,
    val sinopse: String,
    val imagem: String = "",
    val destaque: Boolean = false,
    val descontoMaximo: Int = 100,
    val dataAdicao: String? = null,
) {
    val id: String get() = slug("$titulo-$autor")

    /** URL Coil para a capa dentro de assets, ou null quando não há imagem. */
    val capaAsset: String?
        get() = if (imagem.isNotBlank()) "file:///android_asset/$imagem" else null

    /** Primeira letra do título — usada na capa de fallback. */
    val inicial: String get() = titulo.trim().take(1).uppercase()

    companion object {
        fun slug(texto: String): String {
            val semAcento = Normalizer.normalize(texto, Normalizer.Form.NFD)
                .replace(Regex("\\p{Mn}+"), "")
            return semAcento.lowercase()
                .replace(Regex("[^a-z0-9]+"), "-")
                .trim('-')
        }
    }
}
