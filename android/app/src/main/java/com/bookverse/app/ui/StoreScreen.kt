package com.bookverse.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.ShoppingCart
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bookverse.app.data.Cart
import com.bookverse.app.data.Catalog
import com.bookverse.app.data.Highlights
import com.bookverse.app.model.Book
import com.bookverse.app.ui.components.BookCard
import com.bookverse.app.ui.components.BookCover
import com.bookverse.app.ui.components.BookPrice
import com.bookverse.app.ui.theme.Estrela
import com.bookverse.app.ui.theme.Lavanda
import com.bookverse.app.ui.theme.LavandaClara
import com.bookverse.app.ui.theme.NoiteProfunda
import com.bookverse.app.ui.theme.TextoClaro
import com.bookverse.app.ui.theme.TextoDiscreto
import com.bookverse.app.ui.theme.TextoSuave
import com.bookverse.app.ui.theme.Vidro
import com.bookverse.app.ui.theme.Violeta
import com.bookverse.app.ui.theme.fundoBrush
import kotlinx.coroutines.delay
import java.text.Normalizer

private fun normalizar(texto: String): String =
    Normalizer.normalize(texto, Normalizer.Form.NFD)
        .replace(Regex("\\p{Mn}+"), "")
        .lowercase()

@Composable
fun StoreScreen(
    onOpenBook: (Book) -> Unit,
    onOpenCart: () -> Unit,
) {
    var busca by remember { mutableStateOf("") }
    // Recalcula os destaques uma vez por entrada na tela.
    val destaques = remember { Highlights.calcular() }
    val idsDestaque = remember(destaques) { destaques.destaques.map { it.id }.toSet() }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(fundoBrush()),
    ) {
        Column(Modifier.fillMaxSize()) {
            TopBar(
                busca = busca,
                onBuscaChange = { busca = it },
                onOpenCart = onOpenCart,
            )

            val termo = normalizar(busca.trim())
            Box(Modifier.weight(1f).fillMaxWidth()) {
                if (termo.isNotEmpty()) {
                    val resultados = Catalog.livros.filter {
                        it.estoque > 0 && normalizar("${it.titulo} ${it.autor}").contains(termo)
                    }
                    SearchResults(resultados, busca, idsDestaque, onOpenBook)
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 32.dp),
                    ) {
                        if (destaques.destaques.isNotEmpty()) {
                            item {
                                HeroCarousel(
                                    livros = destaques.destaques,
                                    temSemana = destaques.temSemana,
                                    onOpenBook = onOpenBook,
                                )
                            }
                        }
                        val generos = buildList {
                            addAll(Catalog.ordemGeneros)
                            Catalog.livros.forEach { if (it.genero !in this) add(it.genero) }
                        }
                        generos.forEach { genero ->
                            val lista = Catalog.livros
                                .filter { it.genero == genero && it.estoque > 0 }
                                .sortedByDescending { it.destaque }
                            if (lista.isNotEmpty()) {
                                item(key = genero) {
                                    BookRow(genero, lista, idsDestaque, onOpenBook)
                                }
                            }
                        }
                        item { Footer() }
                    }
                }
            }
        }
    }
}

@Composable
private fun TopBar(
    busca: String,
    onBuscaChange: (String) -> Unit,
    onOpenCart: () -> Unit,
) {
    val total = Cart.totalItens
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(NoiteProfunda.copy(alpha = 0.85f))
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(horizontal = 16.dp, vertical = 10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = Icons.Rounded.Star,
                contentDescription = null,
                tint = Estrela,
                modifier = Modifier.size(26.dp),
            )
            Spacer(Modifier.width(8.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    text = "BookVerse",
                    color = TextoClaro,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp,
                )
                Text(
                    text = "Juazeirinho",
                    color = Lavanda,
                    fontSize = 11.sp,
                )
            }
            BadgedBox(
                badge = {
                    if (total > 0) {
                        Badge(containerColor = Estrela, contentColor = NoiteProfunda) {
                            Text("$total")
                        }
                    }
                },
            ) {
                IconButton(onClick = onOpenCart) {
                    Icon(
                        imageVector = Icons.Rounded.ShoppingCart,
                        contentDescription = "Abrir carrinho",
                        tint = TextoClaro,
                    )
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = busca,
            onValueChange = onBuscaChange,
            singleLine = true,
            leadingIcon = {
                Icon(Icons.Rounded.Search, contentDescription = null, tint = Lavanda)
            },
            placeholder = { Text("Pesquisar livros e autores…", color = TextoDiscreto) },
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = Vidro,
                unfocusedContainerColor = Vidro,
                focusedBorderColor = Lavanda,
                unfocusedBorderColor = TextoDiscreto,
                focusedTextColor = TextoClaro,
                unfocusedTextColor = TextoClaro,
                cursorColor = Estrela,
            ),
            shape = RoundedCornerShape(24.dp),
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun HeroCarousel(
    livros: List<Book>,
    temSemana: Boolean,
    onOpenBook: (Book) -> Unit,
) {
    val pager = rememberPagerState(pageCount = { livros.size })

    // Avança sozinho, estilo "stories".
    LaunchedEffect(livros.size) {
        if (livros.size <= 1) return@LaunchedEffect
        while (true) {
            delay(3500)
            val prox = (pager.currentPage + 1) % livros.size
            pager.animateScrollToPage(prox)
        }
    }

    Column(Modifier.padding(top = 16.dp)) {
        Column(Modifier.padding(horizontal = 16.dp)) {
            Text(
                text = if (temSemana) "Acabou de chegar" else "Da nossa estante",
                color = Estrela,
                fontWeight = FontWeight.SemiBold,
                fontSize = 12.sp,
            )
            Text(
                text = if (temSemana) "Novidades da Semana" else "Livros Novos",
                color = TextoClaro,
                fontWeight = FontWeight.Bold,
                fontSize = 22.sp,
            )
        }
        Spacer(Modifier.height(12.dp))
        HorizontalPager(
            state = pager,
            pageSpacing = 12.dp,
            contentPadding = PaddingValues(horizontal = 16.dp),
        ) { page ->
            HeroSlide(livros[page], onOpenBook)
        }
        Spacer(Modifier.height(10.dp))
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
        ) {
            repeat(livros.size) { i ->
                val ativo = i == pager.currentPage
                Box(
                    Modifier
                        .padding(horizontal = 3.dp)
                        .size(if (ativo) 9.dp else 7.dp)
                        .background(
                            if (ativo) Estrela else TextoDiscreto,
                            CircleShape,
                        ),
                )
            }
        }
    }
}

@Composable
private fun HeroSlide(book: Book, onOpenBook: (Book) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                androidx.compose.ui.graphics.Brush.linearGradient(
                    listOf(Violeta.copy(alpha = 0.55f), NoiteProfunda.copy(alpha = 0.4f)),
                ),
                RoundedCornerShape(16.dp),
            )
            .clickable { onOpenBook(book) }
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        BookCover(
            book = book,
            modifier = Modifier
                .width(96.dp)
                .aspectRatio(2f / 3f)
                .clip(RoundedCornerShape(10.dp)),
        )
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(
                text = book.titulo,
                color = TextoClaro,
                fontWeight = FontWeight.Bold,
                fontSize = 17.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = book.autor,
                color = LavandaClara,
                fontSize = 13.sp,
                modifier = Modifier.padding(top = 2.dp),
            )
            Text(
                text = book.sinopse,
                color = TextoSuave,
                fontSize = 12.sp,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 6.dp),
            )
            Spacer(Modifier.height(8.dp))
            BookPrice(book, mostrarDupla = false)
        }
    }
}

@Composable
private fun BookRow(
    titulo: String,
    livros: List<Book>,
    idsDestaque: Set<String>,
    onOpenBook: (Book) -> Unit,
) {
    Column(Modifier.padding(top = 22.dp)) {
        Text(
            text = titulo,
            color = TextoClaro,
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
        )
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(livros, key = { it.id }) { book ->
                BookCard(
                    book = book,
                    isNovo = book.id in idsDestaque,
                    onOpen = onOpenBook,
                    modifier = Modifier.width(132.dp),
                )
            }
        }
    }
}

@Composable
private fun SearchResults(
    resultados: List<Book>,
    termo: String,
    idsDestaque: Set<String>,
    onOpenBook: (Book) -> Unit,
) {
    if (resultados.isEmpty()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text("Esse a gente não achou…", color = TextoClaro, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Spacer(Modifier.height(8.dp))
            Text(
                "Tente outro título ou autor — ou chame a gente no Instagram.",
                color = TextoSuave,
                fontSize = 14.sp,
            )
        }
        return
    }
    Column {
        Text(
            text = "Resultados para \"$termo\"",
            color = TextoClaro,
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp,
            modifier = Modifier.padding(16.dp),
        )
        LazyVerticalGrid(
            columns = GridCells.Adaptive(120.dp),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            gridItems(resultados, key = { it.id }) { book ->
                BookCard(
                    book = book,
                    isNovo = book.id in idsDestaque,
                    onOpen = onOpenBook,
                )
            }
        }
    }
}

@Composable
private fun Footer() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("© BookVerse · Juazeirinho", color = TextoSuave, fontSize = 12.sp)
        Text(
            "Feito com carinho para nossos leitores ✦",
            color = TextoDiscreto,
            fontSize = 11.sp,
            modifier = Modifier.padding(top = 2.dp),
        )
    }
}
