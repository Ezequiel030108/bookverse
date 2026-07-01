package com.bookverse.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bookverse.app.data.Cart
import com.bookverse.app.model.Book
import com.bookverse.app.ui.theme.Estrela
import com.bookverse.app.ui.theme.NoiteProfunda
import com.bookverse.app.ui.theme.TextoClaro
import com.bookverse.app.ui.theme.TextoDiscreto

/**
 * Card de livro usado nas fileiras e na grade de busca. Espelha o
 * .card-livro do site: capa com selo "Novo", botão de adicionar ao
 * carrinho, título, autor e preço.
 */
@Composable
fun BookCard(
    book: Book,
    isNovo: Boolean,
    onOpen: (Book) -> Unit,
    modifier: Modifier = Modifier,
    onAdded: (Book) -> Unit = {},
) {
    Column(
        modifier = modifier.clickable { onOpen(book) },
    ) {
        Card(
            shape = RoundedCornerShape(10.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        ) {
            Box {
                BookCover(
                    book = book,
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(2f / 3f),
                )
                if (isNovo) {
                    Surface(
                        color = Estrela,
                        shape = RoundedCornerShape(bottomEnd = 8.dp),
                        modifier = Modifier.align(Alignment.TopStart),
                    ) {
                        Text(
                            text = "Novo",
                            color = NoiteProfunda,
                            fontWeight = FontWeight.Bold,
                            fontSize = 10.sp,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        )
                    }
                }
                if (book.estoque > 0) {
                    Surface(
                        color = Estrela,
                        shape = CircleShape,
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(6.dp)
                            .size(30.dp)
                            .clip(CircleShape)
                            .clickable {
                                Cart.add(book, 1)
                                onAdded(book)
                            },
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Add,
                            contentDescription = "Adicionar ${book.titulo} ao carrinho",
                            tint = NoiteProfunda,
                            modifier = Modifier.padding(5.dp),
                        )
                    }
                }
            }
        }
        Text(
            text = book.titulo,
            color = TextoClaro,
            fontWeight = FontWeight.SemiBold,
            fontSize = 13.sp,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 8.dp),
        )
        Text(
            text = book.autor,
            color = TextoDiscreto,
            fontSize = 12.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 1.dp),
        )
        BookPrice(
            book = book,
            mostrarDupla = false,
            modifier = Modifier.padding(top = 3.dp, bottom = 2.dp),
        )
    }
}
