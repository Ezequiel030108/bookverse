package com.bookverse.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bookverse.app.model.Book
import com.bookverse.app.ui.theme.Estrela
import com.bookverse.app.ui.theme.EstrelaClara
import com.bookverse.app.ui.theme.Lavanda
import com.bookverse.app.ui.theme.NoiteProfunda
import com.bookverse.app.ui.theme.TextoClaro

/**
 * Card de livro no estilo MOBILE do site: capa 2/3 com o selo redondo
 * "Novo", e abaixo — centralizados — título serifado, autor em itálico e
 * preço. Sem botão de "+": no celular adiciona-se pelo toque (abre o
 * detalhe), como no site.
 */
@Composable
fun BookCard(
    book: Book,
    isNovo: Boolean,
    onOpen: (Book) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.clickable { onOpen(book) },
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Card(
            shape = RoundedCornerShape(10.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 10.dp),
        ) {
            Box {
                BookCover(
                    book = book,
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(2f / 3f),
                )
                if (isNovo) {
                    Box(
                        modifier = Modifier
                            .padding(8.dp)
                            .rotate(-5f)
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(NoiteProfunda.copy(alpha = 0.55f))
                            .border(1.dp, Estrela.copy(alpha = 0.55f), CircleShape)
                            .align(Alignment.TopStart),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = "NOVO",
                            color = EstrelaClara,
                            fontWeight = FontWeight.Bold,
                            fontSize = 8.sp,
                            letterSpacing = 0.5.sp,
                        )
                    }
                }
            }
        }
        Text(
            text = book.titulo,
            color = TextoClaro,
            fontFamily = FontFamily.Serif,
            fontWeight = FontWeight.SemiBold,
            fontSize = 14.sp,
            lineHeight = 17.sp,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
        )
        Text(
            text = book.autor,
            color = Lavanda,
            fontStyle = FontStyle.Italic,
            fontSize = 11.sp,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.fillMaxWidth().padding(top = 1.dp),
        )
        BookPrice(
            book = book,
            mostrarDupla = false,
            centralizado = true,
            modifier = Modifier.fillMaxWidth().padding(top = 6.dp, bottom = 2.dp),
        )
    }
}
