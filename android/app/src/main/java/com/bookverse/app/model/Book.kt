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
    /**
     * Id fixo, usado pelos livros vindos do catálogo do admin (Firestore):
     * lá o id do documento é a fonte da verdade, então preservamos-o em vez
     * de recalcular pelo título/autor (que pode ter sido editado).
     */
    val idOverride: String? = null,
) {
    val id: String get() = idOverride ?: slug("$titulo-$autor")

    /**
     * Fonte da capa para o Coil, ou null quando não há imagem.
     * Livros da loja usam um caminho relativo dentro de assets; livros
     * cadastrados pelo admin podem trazer uma URL http(s) ou um data URL
     * (base64), que passam direto.
     */
    val capaAsset: String?
        get() = when {
            imagem.isBlank() -> null
            imagem.startsWith("http", ignoreCase = true) -> imagem
            imagem.startsWith("data:", ignoreCase = true) -> imagem
            else -> "file:///android_asset/$imagem"
        }

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
