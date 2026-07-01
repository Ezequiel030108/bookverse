package com.bookverse.app.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.heightIn
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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ChevronLeft
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.ShoppingCart
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bookverse.app.data.Account
import com.bookverse.app.data.Cart
import com.bookverse.app.data.Catalog
import com.bookverse.app.data.Highlights
import com.bookverse.app.model.Book
import com.bookverse.app.ui.components.BookCard
import com.bookverse.app.ui.components.BookCover
import com.bookverse.app.ui.components.StarField
import com.bookverse.app.ui.theme.AuroraRosa
import com.bookverse.app.ui.theme.Estrela
import com.bookverse.app.ui.theme.EstrelaClara
import com.bookverse.app.ui.theme.IndigoClaro
import com.bookverse.app.ui.theme.Lavanda
import com.bookverse.app.ui.theme.LavandaClara
import com.bookverse.app.ui.theme.NoiteProfunda
import com.bookverse.app.ui.theme.TextoClaro
import com.bookverse.app.ui.theme.TextoDiscreto
import com.bookverse.app.ui.theme.TextoSuave
import com.bookverse.app.ui.theme.Vidro
import com.bookverse.app.ui.theme.VidroBorda
import com.bookverse.app.ui.theme.Violeta
import com.bookverse.app.ui.theme.fundoBrush
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.Normalizer

private fun normalizar(texto: String): String =
    Normalizer.normalize(texto, Normalizer.Form.NFD)
        .replace(Regex("\\p{Mn}+"), "")
        .lowercase()

@Composable
fun StoreScreen(
    onOpenBook: (Book) -> Unit,
    onOpenCart: () -> Unit,
    onOpenAccount: () -> Unit,
) {
    var busca by remember { mutableStateOf("") }
    var buscaAberta by remember { mutableStateOf(false) }

    // Catálogo mesclado com o do admin; leituras de snapshot fazem a loja
    // recompor quando a disponibilidade/catálogo chegam do Firestore.
    val extras = Account.catalogoAdmin.toList()
    val livros = remember(extras) { Catalog.mesclarComAdmin(extras) }
    fun disponivel(b: Book) = b.estoque > 0 && !Account.indisponivel(b.id)

    val destaques = Highlights.calcular(livros) { Account.indisponivel(it) }
    val idsDestaque = destaques.destaques.map { it.id }.toSet()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(fundoBrush()),
    ) {
        StarField(Modifier.fillMaxSize())

        Column(Modifier.fillMaxSize()) {
            MobileTopBar(
                busca = busca,
                onBuscaChange = { busca = it },
                buscaAberta = buscaAberta,
                onToggleBusca = {
                    buscaAberta = !buscaAberta
                    if (!buscaAberta) busca = ""
                },
                onOpenCart = onOpenCart,
                onOpenAccount = onOpenAccount,
                mostrarConta = Account.configurado,
            )

            val termo = normalizar(busca.trim())
            Box(Modifier.weight(1f).fillMaxWidth()) {
                if (termo.isNotEmpty()) {
                    val resultados = livros.filter {
                        disponivel(it) && normalizar("${it.titulo} ${it.autor}").contains(termo)
                    }
                    SearchResults(resultados, busca, idsDestaque, onOpenBook)
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 40.dp),
                    ) {
                        if (destaques.destaques.isNotEmpty()) {
                            item {
                                HeroBillboard(destaques.destaques, destaques.temSemana, onOpenBook)
                            }
                        }
                        val generos = buildList {
                            addAll(Catalog.ordemGeneros)
                            livros.forEach { if (it.genero !in this) add(it.genero) }
                        }
                        generos.forEach { genero ->
                            val lista = livros
                                .filter { it.genero == genero && disponivel(it) }
                                .sortedByDescending { it.destaque }
                            if (lista.isNotEmpty()) {
                                item(key = genero) { BookRow(genero, lista, idsDestaque, onOpenBook) }
                            }
                        }
                        item { Footer() }
                    }
                }
            }
        }
    }
}

/* ------------------------------------------------------------------ */
/*  Top bar (mobile): marca à esquerda; busca e carrinho como ícones   */
/* ------------------------------------------------------------------ */

@Composable
private fun MobileTopBar(
    busca: String,
    onBuscaChange: (String) -> Unit,
    buscaAberta: Boolean,
    onToggleBusca: () -> Unit,
    onOpenCart: () -> Unit,
    onOpenAccount: () -> Unit,
    mostrarConta: Boolean,
) {
    val total = Cart.totalItens
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    listOf(NoiteProfunda.copy(alpha = 0.96f), NoiteProfunda.copy(alpha = 0.6f)),
                ),
            )
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(horizontal = 14.dp, vertical = 8.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.Star, contentDescription = null, tint = Estrela, modifier = Modifier.size(28.dp))
            Spacer(Modifier.width(9.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("BookVerse", color = TextoClaro, fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 22.sp)
                    Text(" ✦", color = Estrela, fontSize = 12.sp)
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.LocationOn, contentDescription = null, tint = Lavanda, modifier = Modifier.size(11.dp))
                    Spacer(Modifier.width(3.dp))
                    Text("Juazeirinho", color = TextoDiscreto, fontSize = 11.sp)
                }
            }
            GlassIcon(
                icon = if (buscaAberta) Icons.Rounded.Close else Icons.Rounded.Search,
                descricao = "Buscar",
                onClick = onToggleBusca,
            )
            if (mostrarConta) {
                Spacer(Modifier.width(6.dp))
                GlassIcon(Icons.Rounded.Person, "Minha conta", onOpenAccount)
            }
            Spacer(Modifier.width(6.dp))
            BadgedBox(
                badge = { if (total > 0) Badge(containerColor = Estrela, contentColor = NoiteProfunda) { Text("$total") } },
            ) {
                GlassIcon(Icons.Rounded.ShoppingCart, "Abrir carrinho", onOpenCart)
            }
        }

        AnimatedVisibility(visible = buscaAberta) {
            OutlinedTextField(
                value = busca,
                onValueChange = onBuscaChange,
                singleLine = true,
                leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null, tint = Lavanda) },
                placeholder = { Text("Pesquisar livros e autores…", color = TextoDiscreto) },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
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
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            )
        }
    }
}

@Composable
private fun GlassIcon(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    descricao: String,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(44.dp)
            .clip(CircleShape)
            .background(Vidro)
            .border(1.dp, VidroBorda, CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = descricao, tint = TextoClaro, modifier = Modifier.size(22.dp))
    }
}

/* ------------------------------------------------------------------ */
/*  Hero — billboard vertical dentro de uma moldura com céu estrelado   */
/* ------------------------------------------------------------------ */

@Composable
private fun HeroBillboard(
    livros: List<Book>,
    temSemana: Boolean,
    onOpenBook: (Book) -> Unit,
) {
    val pager = rememberPagerState(pageCount = { livros.size })
    val scope = rememberCoroutineScope()

    LaunchedEffect(livros.size) {
        if (livros.size <= 1) return@LaunchedEffect
        while (true) {
            delay(3500)
            pager.animateScrollToPage((pager.currentPage + 1) % livros.size)
        }
    }

    Column(Modifier.padding(top = 14.dp, start = 14.dp, end = 14.dp)) {
        // Cabeçalho centralizado
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("✦", color = Estrela, fontSize = 12.sp)
            Text(
                text = if (temSemana) "  ACABOU DE CHEGAR  " else "  DA NOSSA ESTANTE  ",
                color = AuroraRosa,
                fontWeight = FontWeight.Bold,
                fontSize = 11.sp,
                letterSpacing = 2.2.sp,
            )
            Text("✦", color = Estrela, fontSize = 12.sp)
        }
        Text(
            text = if (temSemana) "Novidades da Semana" else "Livros Novos",
            style = TextStyle(
                brush = Brush.linearGradient(listOf(Estrela, Color.White, LavandaClara)),
                fontFamily = FontFamily.Serif,
                fontWeight = FontWeight.Bold,
                fontSize = 28.sp,
            ),
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(top = 4.dp, bottom = 14.dp),
        )

        // Moldura (vitrine) com céu estrelado
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(22.dp))
                .background(Brush.verticalGradient(listOf(Color(0xFF241463), Color(0xFF0A0628))))
                .border(1.dp, VidroBorda, RoundedCornerShape(22.dp)),
        ) {
            StarField(Modifier.matchParentSize(), quantidade = 45, semente = 7L)
            HorizontalPager(
                state = pager,
                modifier = Modifier.height(360.dp),
            ) { page ->
                HeroSlide(livros[page], onOpenBook)
            }
        }

        // Navegação: seta · bolinhas · seta
        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (livros.size > 1) {
                HeroArrow(Icons.Rounded.ChevronLeft, "Anterior") {
                    scope.launch { pager.animateScrollToPage((pager.currentPage - 1 + livros.size) % livros.size) }
                }
                Spacer(Modifier.width(14.dp))
            }
            repeat(livros.size) { i ->
                val ativo = i == pager.currentPage
                Box(
                    Modifier
                        .padding(horizontal = 3.dp)
                        .height(8.dp)
                        .width(if (ativo) 26.dp else 8.dp)
                        .clip(CircleShape)
                        .background(
                            if (ativo) Brush.horizontalGradient(listOf(Estrela, EstrelaClara))
                            else Brush.horizontalGradient(listOf(LavandaClara.copy(alpha = 0.35f), LavandaClara.copy(alpha = 0.35f))),
                        ),
                )
            }
            if (livros.size > 1) {
                Spacer(Modifier.width(14.dp))
                HeroArrow(Icons.Rounded.ChevronRight, "Próxima") {
                    scope.launch { pager.animateScrollToPage((pager.currentPage + 1) % livros.size) }
                }
            }
        }
    }
}

@Composable
private fun HeroArrow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    descricao: String,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(40.dp)
            .clip(CircleShape)
            .background(Vidro)
            .border(1.dp, VidroBorda, CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = descricao, tint = TextoClaro, modifier = Modifier.size(24.dp))
    }
}

@Composable
private fun HeroSlide(book: Book, onOpenBook: (Book) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 360.dp)
            .padding(horizontal = 20.dp, vertical = 18.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        BookCover(
            book = book,
            modifier = Modifier
                .width(150.dp)
                .aspectRatio(2f / 3f)
                .clip(RoundedCornerShape(12.dp))
                .clickable { onOpenBook(book) },
        )
        Spacer(Modifier.height(14.dp))
        Text(
            text = book.titulo,
            color = Color.White,
            fontFamily = FontFamily.Serif,
            fontWeight = FontWeight.Bold,
            fontSize = 22.sp,
            lineHeight = 25.sp,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            text = book.autor,
            color = LavandaClara,
            fontStyle = FontStyle.Italic,
            fontSize = 13.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 4.dp),
        )
        Spacer(Modifier.height(14.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            val promo = if (com.bookverse.app.data.Pricing.promoAtiva()) com.bookverse.app.data.Pricing.precosPromo(book) else null
            if (promo != null) {
                Text(
                    text = book.preco,
                    color = TextoDiscreto,
                    fontSize = 14.sp,
                    textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough,
                )
                Spacer(Modifier.width(6.dp))
                Text(
                    text = com.bookverse.app.data.Pricing.formatarReal(promo.um),
                    color = EstrelaClara,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                )
            } else {
                Text(text = book.preco, color = EstrelaClara, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            }
            Spacer(Modifier.width(16.dp))
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .background(Brush.linearGradient(listOf(Violeta, IndigoClaro)))
                    .clickable { onOpenBook(book) }
                    .padding(horizontal = 22.dp, vertical = 11.dp),
            ) {
                Text("Ver detalhes", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            }
        }
    }
}

/* ------------------------------------------------------------------ */
/*  Fileiras por categoria                                             */
/* ------------------------------------------------------------------ */

@Composable
private fun BookRow(
    titulo: String,
    livros: List<Book>,
    idsDestaque: Set<String>,
    onOpenBook: (Book) -> Unit,
) {
    Column(Modifier.padding(top = 22.dp)) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("✦", color = Estrela, fontSize = 14.sp)
            Spacer(Modifier.width(8.dp))
            Text(
                text = titulo,
                color = TextoClaro,
                fontFamily = FontFamily.Serif,
                fontWeight = FontWeight.Bold,
                fontSize = 19.sp,
            )
        }
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            items(livros, key = { it.id }) { book ->
                BookCard(
                    book = book,
                    isNovo = book.id in idsDestaque,
                    onOpen = onOpenBook,
                    modifier = Modifier.width(140.dp),
                )
            }
        }
    }
}

/* ------------------------------------------------------------------ */
/*  Resultados de busca (grade de 2 colunas, como no mobile do site)   */
/* ------------------------------------------------------------------ */

@Composable
private fun SearchResults(
    resultados: List<Book>,
    termo: String,
    idsDestaque: Set<String>,
    onOpenBook: (Book) -> Unit,
) {
    if (resultados.isEmpty()) {
        Column(
            modifier = Modifier.fillMaxSize().padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text("Esse a gente não achou…", color = TextoClaro, fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Spacer(Modifier.height(8.dp))
            Text(
                "Tente outro título ou autor — ou chame a gente no Instagram.",
                color = TextoSuave, fontSize = 14.sp, textAlign = TextAlign.Center,
            )
        }
        return
    }
    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp),
    ) {
        item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(2) }) {
            Text(
                text = "Resultados para \"$termo\"",
                color = TextoClaro, fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 18.sp,
            )
        }
        gridItems(resultados, key = { it.id }) { book ->
            BookCard(book = book, isNovo = book.id in idsDestaque, onOpen = onOpenBook)
        }
    }
}

@Composable
private fun Footer() {
    Column(
        modifier = Modifier.fillMaxWidth().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("© BookVerse · Juazeirinho", color = TextoSuave, fontSize = 12.sp)
        Text("Feito com carinho para nossos leitores ✦", color = TextoDiscreto, fontSize = 11.sp, modifier = Modifier.padding(top = 2.dp))
    }
}
