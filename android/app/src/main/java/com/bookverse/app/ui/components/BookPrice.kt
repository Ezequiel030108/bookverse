package com.bookverse.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bookverse.app.data.Pricing
import com.bookverse.app.model.Book
import com.bookverse.app.ui.theme.Estrela
import com.bookverse.app.ui.theme.TextoDiscreto
import com.bookverse.app.ui.theme.TextoSuave

/**
 * Preço de um livro, no mesmo estilo do site:
 * fora da promoção mostra o preço cheio; durante a promoção mostra o
 * preço cheio riscado + o promocional, e (quando [mostrarDupla]) a
 * linha "levando 2 livros".
 */
@Composable
fun BookPrice(
    book: Book,
    modifier: Modifier = Modifier,
    mostrarDupla: Boolean = true,
    precoStyle: TextStyle = LocalTextStyle.current,
) {
    val promo = if (Pricing.promoAtiva()) Pricing.precosPromo(book) else null
    if (promo == null) {
        Text(
            text = book.preco,
            modifier = modifier,
            style = precoStyle,
            fontWeight = FontWeight.SemiBold,
            color = TextoSuave,
        )
        return
    }
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(1.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                text = book.preco,
                style = precoStyle,
                color = TextoDiscreto,
                textDecoration = TextDecoration.LineThrough,
            )
            Text(
                text = Pricing.formatarReal(promo.um),
                style = precoStyle,
                fontWeight = FontWeight.Bold,
                color = Estrela,
            )
        }
        if (mostrarDupla && !promo.limitado) {
            Text(
                text = "levando 2 livros: ${Pricing.formatarReal(promo.dupla)}",
                fontSize = 11.sp,
                color = TextoSuave,
            )
        }
    }
}
