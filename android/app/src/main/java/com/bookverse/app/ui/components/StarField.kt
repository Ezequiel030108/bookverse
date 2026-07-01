package com.bookverse.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import com.bookverse.app.ui.theme.Estrela
import java.util.Random

private data class Estrela1(val x: Float, val y: Float, val r: Float, val alpha: Float, val dourada: Boolean)

/**
 * Céu estrelado discreto (como o fundo do site). Desenhado uma vez, com
 * posições fixas — estrelinhas brancas e algumas douradas.
 */
@Composable
fun StarField(
    modifier: Modifier = Modifier,
    quantidade: Int = 70,
    semente: Long = 42L,
) {
    val estrelas = remember(quantidade, semente) {
        val rnd = Random(semente)
        List(quantidade) {
            Estrela1(
                x = rnd.nextFloat(),
                y = rnd.nextFloat(),
                r = 0.8f + rnd.nextFloat() * 1.8f,
                alpha = 0.25f + rnd.nextFloat() * 0.6f,
                dourada = rnd.nextInt(5) == 0,
            )
        }
    }
    Canvas(modifier) {
        estrelas.forEach { e ->
            drawCircle(
                color = if (e.dourada) Estrela.copy(alpha = e.alpha) else Color.White.copy(alpha = e.alpha),
                radius = e.r,
                center = Offset(e.x * size.width, e.y * size.height),
            )
        }
    }
}
