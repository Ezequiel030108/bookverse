package com.bookverse.app.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.RadioButton
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
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bookverse.app.data.Account
import com.bookverse.app.data.Cart
import com.bookverse.app.data.Config
import com.bookverse.app.data.Endereco
import com.bookverse.app.data.ItemPedido
import com.bookverse.app.data.OrderSender
import com.bookverse.app.data.Pedido
import com.bookverse.app.data.Perfil
import com.bookverse.app.data.PixGen
import com.bookverse.app.data.Pricing
import com.bookverse.app.data.QrCode
import com.bookverse.app.ui.components.StarField
import com.bookverse.app.ui.theme.Estrela
import com.bookverse.app.ui.theme.Indigo
import com.bookverse.app.ui.theme.Lavanda
import com.bookverse.app.ui.theme.LavandaClara
import com.bookverse.app.ui.theme.Noite
import com.bookverse.app.ui.theme.NoiteProfunda
import com.bookverse.app.ui.theme.TextoClaro
import com.bookverse.app.ui.theme.TextoDiscreto
import com.bookverse.app.ui.theme.TextoSuave
import com.bookverse.app.ui.theme.Vidro
import com.bookverse.app.ui.theme.fundoBrush
import kotlinx.coroutines.launch

private enum class Etapa { FORM, PIX, DONE }

@Composable
fun CheckoutScreen(
    directBookId: String?,
    onBack: () -> Unit,
    onFinish: () -> Unit,
    onOpenAccount: () -> Unit,
) {
    val ehDireto = directBookId != null
    val pedido = remember(directBookId) {
        if (directBookId != null) Cart.resolverLista(listOf(directBookId to 1))
        else Cart.resolver()
    }

    // Exige conta quando EXIGIR_CONTA está ligado (e o login está disponível).
    if (Account.exigeConta && Account.usuario == null) {
        Column(
            modifier = Modifier.fillMaxSize().background(fundoBrush()).padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                "Entre na sua conta para finalizar",
                color = TextoClaro, fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 20.sp,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "Assim seus dados já ficam preenchidos e você acompanha o pedido no histórico.",
                color = TextoSuave, fontSize = 14.sp, textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = onOpenAccount,
                colors = ButtonDefaults.buttonColors(containerColor = Estrela, contentColor = NoiteProfunda),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Ir para Minha conta", fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(8.dp))
            OutlinedButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) {
                Text("Voltar", color = TextoClaro)
            }
        }
        return
    }

    // Carrinho vazio (ex.: chegou aqui sem itens) — volta.
    if (pedido.vazio) {
        Column(
            modifier = Modifier.fillMaxSize().background(fundoBrush()).padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text("Não há itens para finalizar.", color = TextoClaro, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(16.dp))
            OutlinedButton(onClick = onBack) { Text("Voltar", color = TextoClaro) }
        }
        return
    }

    var etapa by remember { mutableStateOf(Etapa.FORM) }
    var nome by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var whatsapp by remember { mutableStateOf("") }
    var instagram by remember { mutableStateOf("") }
    var freteId by remember { mutableStateOf(Config.fretes.first().id) }
    var cep by remember { mutableStateOf("") }
    var rua by remember { mutableStateOf("") }
    var numero by remember { mutableStateOf("") }
    var bairro by remember { mutableStateOf("") }
    var complemento by remember { mutableStateOf("") }
    var cidade by remember { mutableStateOf("") }
    var uf by remember { mutableStateOf("") }

    var codigo by remember { mutableStateOf("") }
    var payload by remember { mutableStateOf("") }
    var enviando by remember { mutableStateOf(false) }
    var emailOk by remember { mutableStateOf(true) }

    val frete = Config.fretes.first { it.id == freteId }
    val total = pedido.subtotal + frete.valor
    val scope = rememberCoroutineScope()
    val clipboard = LocalClipboardManager.current
    val context = LocalContext.current

    // Preenche os dados a partir da conta (nome/e-mail do login + perfil salvo).
    LaunchedEffect(Account.usuario?.uid) {
        val u = Account.usuario ?: return@LaunchedEffect
        if (nome.isBlank()) nome = u.nome
        if (email.isBlank()) email = u.email
        val p = Account.perfil() ?: return@LaunchedEffect
        if (p.nome.isNotBlank()) nome = p.nome
        if (p.email.isNotBlank()) email = p.email
        if (p.telefone.isNotBlank()) whatsapp = p.telefone
        if (p.instagram.isNotBlank()) instagram = p.instagram
        cep = p.endereco.cep
        rua = p.endereco.rua
        numero = p.endereco.numero
        complemento = p.endereco.complemento
        bairro = p.endereco.bairro
        cidade = p.endereco.cidade
        uf = p.endereco.uf
    }

    val enderecoValido = !frete.pedeEndereco ||
        (rua.isNotBlank() && numero.isNotBlank() && bairro.isNotBlank())
    val formValido = nome.isNotBlank() && email.contains("@") && enderecoValido

    fun enderecoTexto(): String {
        if (!frete.pedeEndereco) return "Entrega a combinar"
        val comp = if (complemento.isNotBlank()) ", $complemento" else ""
        val cidUf = listOf(cidade, uf).filter { it.isNotBlank() }.joinToString("/")
        val extra = listOf(cidUf, if (cep.isNotBlank()) "CEP $cep" else "").filter { it.isNotBlank() }.joinToString(", ")
        return "$rua, $numero — $bairro$comp" + if (extra.isNotBlank()) ", $extra" else ""
    }

    fun itensTexto(): String = pedido.itens.joinToString("\n") {
        "• ${it.book.titulo} (${it.book.autor}) x${it.qty} — ${Pricing.formatarBRL(it.precoLinha)}"
    }

    // ----- Salvar na conta (perfil + pedido) e reservar os livros -----
    val idsPedido = pedido.itens.map { it.book.id }
    fun perfilAtual() = Perfil(
        nome = nome.trim(),
        email = email.trim(),
        telefone = whatsapp.trim(),
        instagram = instagram.trim().removePrefix("@"),
        endereco = Endereco(
            cep = cep.trim(), rua = rua.trim(), numero = numero.trim(),
            complemento = complemento.trim(), bairro = bairro.trim(),
            cidade = cidade.trim(), uf = uf.trim().uppercase(),
        ),
    )
    fun pedidoConta(status: String) = Pedido(
        codigo = codigo,
        status = status,
        total = total,
        subtotal = pedido.subtotal,
        frete = frete.valor.toDouble(),
        entrega = frete.titulo,
        endereco = if (frete.pedeEndereco) enderecoTexto() else "",
        itens = pedido.itens.map { ItemPedido(it.book.id, it.book.titulo, it.book.autor, it.qty, it.precoLinha) },
    )
    suspend fun salvarNaConta(status: String) {
        if (Account.usuario == null) return
        val p = perfilAtual()
        Account.salvarPerfil(p.copy(cadastroCompleto = Account.perfilCompleto(p)))
        Account.salvarPedido(pedidoConta(status))
        Account.reservarLivros(idsPedido)
    }

    Box(
        modifier = Modifier.fillMaxSize().background(fundoBrush()),
    ) {
        StarField(Modifier.fillMaxSize())

        Column(Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(NoiteProfunda.copy(alpha = 0.85f))
                .windowInsetsPadding(WindowInsets.statusBars)
                .padding(horizontal = 8.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = { if (etapa == Etapa.FORM) onBack() else etapa = Etapa.FORM }) {
                Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Voltar", tint = TextoClaro)
            }
            Text("✦", color = Estrela, fontSize = 14.sp)
            Spacer(Modifier.width(8.dp))
            Text(
                text = when (etapa) {
                    Etapa.FORM -> "Finalizar compra"
                    Etapa.PIX -> "Pagamento via Pix"
                    Etapa.DONE -> "Pedido recebido"
                },
                color = TextoClaro,
                fontFamily = FontFamily.Serif,
                fontWeight = FontWeight.Bold,
                fontSize = 19.sp,
            )
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
        ) {
            when (etapa) {
                Etapa.FORM -> {
                    // Resumo do pedido
                    Secao("Seu pedido") {
                        pedido.itens.forEach { linha ->
                            Row(Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
                                Text(
                                    "${linha.qty}× ${linha.book.titulo}",
                                    color = TextoSuave, fontSize = 13.sp, modifier = Modifier.weight(1f),
                                )
                                Text(Pricing.formatarBRL(linha.precoLinha), color = TextoClaro, fontSize = 13.sp)
                            }
                        }
                    }

                    Secao("Seus dados") {
                        Campo(nome, { nome = it }, "Nome completo")
                        Campo(email, { email = it }, "E-mail")
                        Campo(whatsapp, { whatsapp = it }, "WhatsApp (com DDD)")
                        Campo(instagram, { instagram = it }, "Instagram (opcional)")
                    }

                    Secao("Entrega") {
                        Config.fretes.forEach { opcao ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .selectable(selected = freteId == opcao.id, onClick = { freteId = opcao.id })
                                    .padding(vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                RadioButton(selected = freteId == opcao.id, onClick = { freteId = opcao.id })
                                Spacer(Modifier.width(4.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(opcao.titulo, color = TextoClaro, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                                    Text(opcao.descricao, color = TextoDiscreto, fontSize = 12.sp)
                                }
                            }
                        }
                        if (frete.pedeEndereco) {
                            Spacer(Modifier.height(8.dp))
                            Row {
                                Box(Modifier.weight(1f)) { Campo(cep, { cep = it }, "CEP") }
                                Spacer(Modifier.width(8.dp))
                                Box(Modifier.weight(2f)) { Campo(rua, { rua = it }, "Rua") }
                            }
                            Row {
                                Box(Modifier.weight(1f)) { Campo(numero, { numero = it }, "Número") }
                                Spacer(Modifier.width(8.dp))
                                Box(Modifier.weight(2f)) { Campo(bairro, { bairro = it }, "Bairro") }
                            }
                            Campo(complemento, { complemento = it }, "Complemento / referência (opcional)")
                            Row {
                                Box(Modifier.weight(2f)) { Campo(cidade, { cidade = it }, "Cidade") }
                                Spacer(Modifier.width(8.dp))
                                Box(Modifier.weight(1f)) { Campo(uf, { uf = it }, "UF") }
                            }
                        }
                    }

                    Spacer(Modifier.height(8.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Total", color = TextoSuave, fontSize = 16.sp)
                        Text(Pricing.formatarBRL(total), color = Estrela, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                    }
                    Spacer(Modifier.height(16.dp))
                    Button(
                        onClick = {
                            codigo = PixGen.gerarCodigoPedido()
                            payload = PixGen.gerarPayload(
                                chave = Config.PIX_CHAVE,
                                nome = Config.PIX_NOME,
                                cidade = Config.PIX_CIDADE,
                                valor = total,
                                txid = codigo,
                            )
                            // Logado: salva perfil+pedido e reserva os livros
                            // (saem da loja enquanto o Pix está em aberto).
                            scope.launch { salvarNaConta("pendente") }
                            etapa = Etapa.PIX
                        },
                        enabled = formValido,
                        colors = ButtonDefaults.buttonColors(containerColor = Estrela, contentColor = NoiteProfunda),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Gerar Pix", fontWeight = FontWeight.Bold)
                    }
                    if (!formValido) {
                        Text(
                            "Preencha nome, e-mail" + if (frete.pedeEndereco) " e endereço." else ".",
                            color = TextoDiscreto, fontSize = 12.sp,
                            modifier = Modifier.padding(top = 6.dp),
                        )
                    }
                }

                Etapa.PIX -> {
                    Text(
                        "Escaneie o QR Code no app do seu banco ou use o Pix Copia e Cola.",
                        color = TextoSuave, fontSize = 14.sp,
                    )
                    Spacer(Modifier.height(16.dp))
                    val qr = remember(payload) { QrCode.gerar(payload) }
                    if (qr != null) {
                        Box(
                            modifier = Modifier
                                .align(Alignment.CenterHorizontally)
                                .clip(RoundedCornerShape(12.dp))
                                .background(androidx.compose.ui.graphics.Color.White)
                                .padding(10.dp),
                        ) {
                            Image(
                                bitmap = qr,
                                contentDescription = "QR Code do Pix",
                                modifier = Modifier.size(220.dp),
                            )
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Valor", color = TextoSuave, fontSize = 14.sp)
                        Text(Pricing.formatarBRL(total), color = Estrela, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Código do pedido", color = TextoSuave, fontSize = 14.sp)
                        Text(codigo, color = TextoClaro, fontSize = 14.sp)
                    }
                    Spacer(Modifier.height(12.dp))
                    Text("Pix Copia e Cola", color = TextoSuave, fontSize = 13.sp)
                    Spacer(Modifier.height(4.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(Vidro)
                            .padding(12.dp),
                    ) {
                        Text(payload, color = TextoClaro, fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                    }
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(
                        onClick = { clipboard.setText(AnnotatedString(payload)) },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Icon(Icons.Rounded.ContentCopy, contentDescription = null, tint = LavandaClara)
                        Spacer(Modifier.width(8.dp))
                        Text("Copiar código Pix", color = TextoClaro)
                    }
                    Spacer(Modifier.height(16.dp))
                    Button(
                        onClick = {
                            enviando = true
                            scope.launch {
                                emailOk = OrderSender.enviar(
                                    OrderSender.Pedido(
                                        codigo = codigo,
                                        nome = nome,
                                        email = email,
                                        whatsapp = whatsapp,
                                        entrega = frete.titulo,
                                        endereco = enderecoTexto(),
                                        itens = itensTexto(),
                                        total = Pricing.formatarBRL(total),
                                    ),
                                )
                                // Atualiza o pedido na conta (aguardando confirmação do Pix).
                                salvarNaConta("aguardando")
                                enviando = false
                                if (!ehDireto) Cart.limpar()
                                etapa = Etapa.DONE
                            }
                        },
                        enabled = !enviando,
                        colors = ButtonDefaults.buttonColors(containerColor = Estrela, contentColor = NoiteProfunda),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        if (enviando) {
                            CircularProgressIndicator(color = NoiteProfunda, strokeWidth = 2.dp, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                        }
                        Text("Já fiz o pagamento", fontWeight = FontWeight.Bold)
                    }
                }

                Etapa.DONE -> {
                    Spacer(Modifier.height(24.dp))
                    Icon(
                        Icons.Rounded.CheckCircle,
                        contentDescription = null,
                        tint = Estrela,
                        modifier = Modifier.size(64.dp).align(Alignment.CenterHorizontally),
                    )
                    Spacer(Modifier.height(12.dp))
                    Text(
                        "Pedido recebido!",
                        color = TextoClaro, fontWeight = FontWeight.Bold, fontSize = 22.sp,
                        modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center,
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "Código: $codigo",
                        color = LavandaClara, fontSize = 14.sp,
                        modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center,
                    )
                    Spacer(Modifier.height(16.dp))
                    Text(
                        if (emailOk)
                            "Recebemos seu pedido. Assim que confirmarmos o pagamento, combinamos a entrega com você. 💜"
                        else
                            "Anote o código do pedido. Se puder, nos mande o comprovante pelo Instagram para agilizar. 💜",
                        color = TextoSuave, fontSize = 14.sp,
                        modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center,
                    )
                    Spacer(Modifier.height(20.dp))
                    OutlinedButton(
                        onClick = {
                            val url = if (Config.WHATSAPP.isNotBlank())
                                "https://wa.me/${Config.WHATSAPP}?text=" +
                                    Uri.encode("Olá! Fiz o pedido $codigo no app BookVerse e quero enviar o comprovante.")
                            else Config.linkInstagram()
                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            if (Config.WHATSAPP.isNotBlank()) "Enviar comprovante (WhatsApp)" else "Falar no Instagram",
                            color = TextoClaro,
                        )
                    }
                    Spacer(Modifier.height(8.dp))
                    Button(
                        onClick = onFinish,
                        colors = ButtonDefaults.buttonColors(containerColor = Estrela, contentColor = NoiteProfunda),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Voltar à loja", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
        }
    }
}

@Composable
private fun Secao(titulo: String, conteudo: @Composable () -> Unit) {
    Column(Modifier.padding(bottom = 18.dp)) {
        Text(titulo, color = Lavanda, fontWeight = FontWeight.Bold, fontSize = 13.sp)
        Spacer(Modifier.height(8.dp))
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(Indigo.copy(alpha = 0.4f))
                .padding(12.dp),
        ) { conteudo() }
    }
}

@Composable
private fun Campo(valor: String, onChange: (String) -> Unit, rotulo: String) {
    OutlinedTextField(
        value = valor,
        onValueChange = onChange,
        label = { Text(rotulo, color = TextoDiscreto) },
        singleLine = true,
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = Noite,
            unfocusedContainerColor = Noite,
            focusedBorderColor = Lavanda,
            unfocusedBorderColor = TextoDiscreto,
            focusedTextColor = TextoClaro,
            unfocusedTextColor = TextoClaro,
            cursorColor = Estrela,
        ),
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
    )
}
