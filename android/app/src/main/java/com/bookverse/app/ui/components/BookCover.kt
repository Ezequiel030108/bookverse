package com.bookverse.app.ui.components

import android.graphics.BitmapFactory
import android.util.Base64
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.bookverse.app.model.Book
import com.bookverse.app.ui.theme.IndigoClaro
import com.bookverse.app.ui.theme.Indigo
import com.bookverse.app.ui.theme.LavandaClara
import com.bookverse.app.ui.theme.Noite
import com.bookverse.app.ui.theme.Violeta

/**
 * Capa do livro: carrega da pasta assets (ou de uma URL / data URL, no caso
 * dos livros cadastrados pelo admin) via Coil ou, quando não há imagem, mostra
 * uma capa de fallback com a inicial do título (como no site).
 */
@Composable
fun BookCover(book: Book, modifier: Modifier = Modifier) {
    val asset = book.capaAsset
    val bitmapBase64 = remember(book.imagem) { decodificarDataUrl(book.imagem) }

    when {
        bitmapBase64 != null -> {
            Image(
                bitmap = bitmapBase64,
                contentDescription = "Capa de ${book.titulo}",
                contentScale = ContentScale.Crop,
                modifier = modifier,
            )
        }
        asset != null -> {
            AsyncImage(
                model = asset,
                contentDescription = "Capa de ${book.titulo}",
                contentScale = ContentScale.Crop,
                modifier = modifier,
            )
        }
        else -> {
            val variantes = listOf(
                Brush.linearGradient(listOf(Violeta, Noite)),
                Brush.linearGradient(listOf(Indigo, Noite)),
                Brush.linearGradient(listOf(IndigoClaro, Noite)),
            )
            val idx = book.titulo.fold(0) { acc, c -> acc + c.code } % variantes.size
            Box(
                modifier = modifier.background(variantes[idx]),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = book.inicial,
                    color = LavandaClara,
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.Bold,
                    fontSize = 44.sp,
                    modifier = Modifier.padding(8.dp),
                )
            }
        }
    }
}

/** Decodifica uma capa em data URL base64 (as que o admin salva) para bitmap. */
private fun decodificarDataUrl(imagem: String): ImageBitmap? {
    if (!imagem.startsWith("data:", ignoreCase = true)) return null
    val virgula = imagem.indexOf(',')
    if (virgula < 0) return null
    return try {
        val bytes = Base64.decode(imagem.substring(virgula + 1), Base64.DEFAULT)
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size)?.asImageBitmap()
    } catch (e: Exception) {
        null
    }
}
