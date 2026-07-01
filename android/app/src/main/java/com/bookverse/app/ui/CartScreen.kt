package com.bookverse.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bookverse.app.data.Cart
import com.bookverse.app.data.Pricing
import com.bookverse.app.ui.components.BookCover
import com.bookverse.app.ui.components.StarField
import com.bookverse.app.ui.theme.Estrela
import com.bookverse.app.ui.theme.Indigo
import com.bookverse.app.ui.theme.LavandaClara
import com.bookverse.app.ui.theme.NoiteProfunda
import com.bookverse.app.ui.theme.TextoClaro
import com.bookverse.app.ui.theme.TextoDiscreto
import com.bookverse.app.ui.theme.TextoSuave
import com.bookverse.app.ui.theme.Vidro
import com.bookverse.app.ui.theme.fundoBrush

@Composable
fun CartScreen(
    onBack: () -> Unit,
    onCheckout: () -> Unit,
) {
    val carrinho = Cart.resolver()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(fundoBrush()),
    ) {
        StarField(Modifier.fillMaxSize())

        Column(Modifier.fillMaxSize()) {
        // Barra superior
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(NoiteProfunda.copy(alpha = 0.85f))
                .windowInsetsPadding(WindowInsets.statusBars)
                .padding(horizontal = 8.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Voltar", tint = TextoClaro)
            }
            Text("✦", color = Estrela, fontSize = 14.sp)
            Spacer(Modifier.width(8.dp))
            Text(
                text = "Seu carrinho",
                color = TextoClaro,
                fontFamily = FontFamily.Serif,
                fontWeight = FontWeight.Bold,
                fontSize = 19.sp,
            )
        }

        if (carrinho.vazio) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text("Seu carrinho está vazio", color = TextoClaro, fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Spacer(Modifier.height(8.dp))
                Text(
                    "Explore a estante e adicione os livros que quiser levar.",
                    color = TextoSuave,
                    fontSize = 14.sp,
                )
                Spacer(Modifier.height(20.dp))
                OutlinedButton(onClick = onBack) {
                    Text("Ver livros", color = TextoClaro)
                }
            }
            return
        }

        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(carrinho.itens, key = { it.book.id }) { linha ->
                CartRow(linha)
            }
        }

        // Rodapé com subtotal + finalizar
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(NoiteProfunda.copy(alpha = 0.9f))
                .padding(16.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text("Subtotal", color = TextoSuave, fontSize = 15.sp)
                Text(
                    Pricing.formatarBRL(carrinho.subtotal),
                    color = TextoClaro,
                    fontWeight = FontWeight.Bold,
                    fontSize = 17.sp,
                )
            }
            Spacer(Modifier.height(4.dp))
            Text(
                "A entrega é combinada na próxima etapa.",
                color = TextoDiscreto,
                fontSize = 12.sp,
            )
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = onCheckout,
                colors = ButtonDefaults.buttonColors(containerColor = Estrela, contentColor = NoiteProfunda),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Finalizar compra", fontWeight = FontWeight.Bold)
            }
        }
        }
    }
}

@Composable
private fun CartRow(linha: com.bookverse.app.data.CartLine) {
    val book = linha.book
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Indigo.copy(alpha = 0.5f))
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        BookCover(
            book = book,
            modifier = Modifier
                .width(52.dp)
                .aspectRatio(2f / 3f)
                .clip(RoundedCornerShape(6.dp)),
        )
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                book.titulo,
                color = TextoClaro,
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Text(book.autor, color = TextoDiscreto, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(6.dp))
            Text(
                Pricing.formatarBRL(linha.precoUnit),
                color = Estrela,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
            )
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Stepper(
                    icon = Icons.Rounded.Remove,
                    descricao = "Diminuir",
                    onClick = { Cart.definirQty(book.id, linha.qty - 1) },
                )
                Text(
                    "${linha.qty}",
                    color = TextoClaro,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 14.dp),
                )
                Stepper(
                    icon = Icons.Rounded.Add,
                    descricao = "Aumentar",
                    onClick = { Cart.definirQty(book.id, linha.qty + 1) },
                    habilitado = linha.qty < book.estoque,
                )
                Spacer(Modifier.weight(1f))
                IconButton(onClick = { Cart.remover(book.id) }) {
                    Icon(Icons.Rounded.DeleteOutline, contentDescription = "Remover", tint = TextoDiscreto)
                }
            }
        }
    }
}

@Composable
private fun Stepper(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    descricao: String,
    onClick: () -> Unit,
    habilitado: Boolean = true,
) {
    Box(
        modifier = Modifier
            .size(30.dp)
            .clip(CircleShape)
            .background(if (habilitado) Vidro else Vidro.copy(alpha = 0.3f))
            .clickable(enabled = habilitado, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            icon,
            contentDescription = descricao,
            tint = if (habilitado) LavandaClara else TextoDiscreto,
            modifier = Modifier.size(18.dp),
        )
    }
}
