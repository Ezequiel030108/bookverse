package com.bookverse.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Brush

private val BookVerseColors = darkColorScheme(
    primary = Estrela,
    onPrimary = NoiteProfunda,
    secondary = Lavanda,
    onSecondary = NoiteProfunda,
    tertiary = AuroraRosa,
    background = Noite,
    onBackground = TextoClaro,
    surface = Indigo,
    onSurface = TextoClaro,
    surfaceVariant = IndigoClaro,
    onSurfaceVariant = TextoSuave,
    outline = VidroBorda,
    error = AuroraRosa,
)

@Composable
fun BookVerseTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = BookVerseColors,
        typography = BookVerseType,
        content = content,
    )
}

/** Gradiente de fundo do site (céu noturno), usado como plano de fundo. */
fun fundoBrush(): Brush = Brush.verticalGradient(
    0.0f to NoiteProfunda,
    0.35f to Noite,
    1.0f to Indigo,
)
