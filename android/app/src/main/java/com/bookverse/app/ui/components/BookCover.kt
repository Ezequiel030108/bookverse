package com.bookverse.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
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
 * Capa do livro: carrega da pasta assets via Coil ou, quando não há
 * imagem, mostra uma capa de fallback com a inicial do título (como no site).
 */
@Composable
fun BookCover(book: Book, modifier: Modifier = Modifier) {
    val asset = book.capaAsset
    if (asset != null) {
        AsyncImage(
            model = asset,
            contentDescription = "Capa de ${book.titulo}",
            contentScale = ContentScale.Crop,
            modifier = modifier,
        )
    } else {
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
