# 📱 BookVerse — App Android nativo

Este é o **aplicativo Android nativo** da BookVerse, escrito em **Kotlin + Jetpack
Compose**. Não é uma WebView: as telas, o catálogo, o carrinho, os preços/promoção
e a geração do **Pix** foram reescritos em código nativo, reproduzindo o visual e o
comportamento do site.

## ✨ O que já funciona

- **Loja** com o mesmo layout do site (fundo cósmico, carrossel "Novidades da
  Semana" que passa sozinho e fileiras por categoria que rolam para o lado).
- **Busca** por título e autor.
- **Detalhe do livro** (folha deslizante) com sinopse, estado, estoque e preço.
- **Carrinho** persistente (não some ao fechar o app), com quantidade e subtotal.
- **Promoção** automática por data — mesma regra do site (`js/livros.js`).
- **Checkout** com dados do cliente, opções de entrega e endereço.
- **Pix** gerado no próprio aparelho: "Copia e Cola" (BR Code / EMV do Banco
  Central) + **QR Code**, com o valor exato do pedido. O algoritmo é o mesmo de
  `js/pix.js` (CRC16-CCITT) — os payloads são idênticos.
- **Pedido por e-mail** via **Web3Forms** (mesma Access Key do site).
- As **capas dos livros** vão embarcadas no app (em `assets/img/`).

> As configurações (chave Pix, nome/cidade do recebedor, Web3Forms, fretes,
> Instagram) ficam em `app/src/main/java/com/bookverse/app/data/Config.kt`,
> espelhando o `js/config.js` do site. O catálogo fica em
> `.../data/Catalog.kt` (espelha `js/livros.js`).

## 🚧 O que ainda não está no app (fica pra próxima fase)

- **Login com Google / histórico de pedidos** (Firebase) e o **painel de
  administração** com IA (gerar sinopse / classificar categoria).
- **Confirmação automática do Pix pelo Mercado Pago** — depende do backend na
  Vercel (`api/`). O app usa o modo Pix **manual** (você confere o pagamento no
  app do banco), que também é suportado pelo site.

## 🛠️ Como gerar o APK

Você precisa do **Android Studio** (que já traz o Android SDK). Este ambiente aqui
não tem o SDK, então o APK é compilado na sua máquina.

### Opção A — Android Studio (recomendado)

1. Abra o **Android Studio** → *Open* → selecione a pasta `android/`.
2. Espere o Gradle sincronizar (ele baixa as dependências na primeira vez).
3. Ligue o celular por USB (com *depuração USB*) **ou** crie um emulador.
4. Clique em **Run ▶**. O app instala e abre.
5. Para gerar um APK instalável: menu **Build → Build App Bundle(s) / APK(s) →
   Build APK(s)**. O arquivo sai em `app/build/outputs/apk/debug/app-debug.apk`.

### Opção B — Linha de comando

Requisitos: JDK 17 e o Android SDK instalado, com a variável `ANDROID_HOME`
apontando para ele (ou um arquivo `android/local.properties` com
`sdk.dir=/caminho/do/Android/Sdk`).

```bash
cd android
./gradlew assembleDebug        # gera app/build/outputs/apk/debug/app-debug.apk
# instalar no aparelho conectado:
./gradlew installDebug
```

Para uma versão de release assinada, configure sua *keystore* e rode
`./gradlew assembleRelease` (veja a documentação do Android sobre assinatura).

## 🧱 Estrutura

```
android/
├── app/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── assets/img/               ← capas dos livros
│       ├── res/                      ← ícone, tema, cores
│       └── java/com/bookverse/app/
│           ├── MainActivity.kt       ← navegação (loja → carrinho → checkout)
│           ├── model/Book.kt
│           ├── data/                 ← Catalog, Config, Pricing, Cart, PixGen, ...
│           └── ui/                   ← StoreScreen, BookDetailSheet, CartScreen, CheckoutScreen
├── build.gradle.kts
├── settings.gradle.kts
└── gradlew / gradle/                 ← Gradle wrapper (8.9)
```

## 🔧 Stack

- Kotlin 2.0 · Jetpack Compose (Material 3) · Navigation Compose
- Coil (carregamento das capas) · ZXing (QR Code do Pix)
- minSdk 24 (Android 7.0) · targetSdk 34
