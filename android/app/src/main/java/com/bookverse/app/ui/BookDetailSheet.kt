package com.bookverse.app.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ChatBubbleOutline
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bookverse.app.data.Config
import com.bookverse.app.data.Pricing
import com.bookverse.app.model.Book
import com.bookverse.app.ui.components.BookCover
import com.bookverse.app.ui.theme.Estrela
import com.bookverse.app.ui.theme.LavandaClara
import com.bookverse.app.ui.theme.Noite
import com.bookverse.app.ui.theme.NoiteProfunda
import com.bookverse.app.ui.theme.TextoClaro
import com.bookverse.app.ui.theme.TextoSuave

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookDetailSheet(
    book: Book,
    onDismiss: () -> Unit,
    onBuyNow: (Book) -> Unit,
    onAddToCart: (Book) -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val context = LocalContext.current
    val promo = if (Pricing.promoAtiva()) Pricing.precosPromo(book) else null

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Noite,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(start = 20.dp, end = 20.dp, bottom = 28.dp),
        ) {
            Row {
                BookCover(
                    book = book,
                    modifier = Modifier
                        .width(120.dp)
                        .aspectRatio(2f / 3f)
                        .clip(RoundedCornerShape(10.dp)),
                )
                Spacer(Modifier.width(16.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        text = book.titulo,
                        color = TextoClaro,
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp,
                    )
                    Text(
                        text = book.autor,
                        color = LavandaClara,
                        fontSize = 14.sp,
                        modifier = Modifier.padding(top = 2.dp),
                    )
                    Spacer(Modifier.height(10.dp))
                    Badge("Estado", book.estado)
                    Badge(
                        "Estoque",
                        if (book.estoque > 0) "${book.estoque} unidade${if (book.estoque > 1) "s" else ""}" else "Esgotado",
                    )
                    if (promo != null) {
                        Badge("Preço", "${book.preco}  →  ${Pricing.formatarReal(promo.um)}")
                    } else {
                        Badge("Preço", book.preco)
                    }
                }
            }

            Spacer(Modifier.height(16.dp))
            Text(
                text = book.sinopse,
                color = TextoSuave,
                fontSize = 14.sp,
                lineHeight = 20.sp,
            )

            if (promo != null) {
                Spacer(Modifier.height(12.dp))
                Text(
                    text = if (promo.limitado)
                        "⚽ ${com.bookverse.app.data.Promocao.nome}: este livro participa com ${com.bookverse.app.data.Promocao.descontoUm}% de desconto. Válida até ${Pricing.dataFimPromo()}."
                    else
                        "⚽ ${com.bookverse.app.data.Promocao.nome}: levando 2 livros ou mais, este sai por ${Pricing.formatarReal(promo.dupla)} (${com.bookverse.app.data.Promocao.descontoDupla}% off). Válida até ${Pricing.dataFimPromo()}.",
                    color = Estrela,
                    fontSize = 12.sp,
                    lineHeight = 17.sp,
                )
            }

            Spacer(Modifier.height(20.dp))
            val semEstoque = book.estoque <= 0
            Button(
                onClick = { onBuyNow(book) },
                enabled = !semEstoque,
                colors = ButtonDefaults.buttonColors(containerColor = Estrela, contentColor = NoiteProfunda),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (semEstoque) "Esgotado" else "Comprar agora", fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(8.dp))
            OutlinedButton(
                onClick = { onAddToCart(book) },
                enabled = !semEstoque,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Adicionar ao carrinho", color = TextoClaro)
            }

            Spacer(Modifier.height(4.dp))
            TextButton(
                onClick = {
                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(Config.linkInstagram())))
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.Rounded.ChatBubbleOutline, contentDescription = null, tint = LavandaClara)
                Spacer(Modifier.width(8.dp))
                Text("Dúvidas sobre o livro? Fale no Instagram", color = LavandaClara, fontSize = 13.sp)
            }
        }
    }
}

@Composable
private fun Badge(rotulo: String, valor: String) {
    Row(
        modifier = Modifier.padding(vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = "$rotulo: ",
            color = TextoSuave,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Text(text = valor, color = TextoClaro, fontSize = 13.sp)
    }
}
