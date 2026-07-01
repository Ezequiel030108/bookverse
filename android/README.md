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
- **Contas (login com Google)** via Firebase: perfil editável (dados +
  endereço), preenchimento automático do checkout e **histórico de pedidos**.
- **Administração** dentro de "Minha conta" (para os e-mails de `ADMIN_EMAILS`):
  marcar cada livro como **disponível / reservado / vendido**. A loja esconde os
  reservados/vendidos e mescla os livros que o admin cadastrou pelo site.
- As **capas dos livros** vão embarcadas no app (em `assets/img/`).

> ⚠️ **Para o login com Google funcionar** você precisa fazer dois cadastros no
> Firebase — o **SHA-1** do app e o **Web client ID** em `Config.kt`. Veja a
> seção **"👤 Contas e administração"** mais abaixo.

> As configurações (chave Pix, nome/cidade do recebedor, Web3Forms, fretes,
> Instagram) ficam em `app/src/main/java/com/bookverse/app/data/Config.kt`,
> espelhando o `js/config.js` do site. O catálogo fica em
> `.../data/Catalog.kt` (espelha `js/livros.js`).

## 🚧 O que ainda não está no app (fica pra próxima fase)

- **Cadastrar/editar livros pelo próprio app** (com foto e IA para gerar sinopse
  / classificar categoria). Isso continua só no site por enquanto; o app **lê** o
  catálogo do admin e permite marcar disponibilidade, mas ainda não adiciona
  livros novos.
- **Confirmação automática do Pix pelo Mercado Pago** — depende do backend na
  Vercel (`api/`). O app usa o modo Pix **manual** (você confere o pagamento no
  app do banco), que também é suportado pelo site.

## 👤 Contas e administração (login com Google)

As contas são **opcionais**: se o Firebase não estiver configurado, o app roda
normalmente, só sem login (o botão de conta nem aparece). Os dados do Firebase
já vêm preenchidos em `Config.kt` (são os mesmos do site e podem ser públicos).
O app inicializa o Firebase por `FirebaseOptions` em tempo de execução, então
**não** usa `google-services.json` nem o plugin `google-services`.

Falta só **um passo manual** para o login funcionar (o Google exige que o app
seja reconhecido pela sua assinatura):

1. **Pegue o SHA-1 do app.** No Android Studio: aba *Gradle* → `app` →
   *Tasks → android → signingReport* (ou, no terminal, dentro de `android/`:
   `./gradlew signingReport`). Copie o **SHA-1** da variante *debug* (e o de
   *release*, quando for publicar).
2. **Cadastre o SHA-1 no Firebase.** [Firebase Console](https://console.firebase.google.com/)
   → projeto **bookverse-69878** → *Project settings* → seu app **Android**
   (`com.bookverse.app`) → *Add fingerprint* → cole o SHA-1.
   - Se ainda não existir um app Android no projeto, clique em *Add app →
     Android*, use o pacote `com.bookverse.app` e cole o SHA-1. Pode **ignorar**
     o download do `google-services.json` — o app não precisa dele.
3. **Copie o "Web client ID".** Em *Authentication → Sign-in method → Google →*
   (expandir) *Web SDK configuration*, copie o **Web client ID** (algo como
   `xxxxx.apps.googleusercontent.com`). Cole-o em
   `app/.../data/Config.kt` na constante:

   ```kotlin
   const val GOOGLE_WEB_CLIENT_ID = "COLE_AQUI.apps.googleusercontent.com"
   ```

   > Use o client **Web**, não o Android. É esse ID que o app pede no
   > `requestIdToken(...)` para trocar o login do Google por uma sessão Firebase.
4. **Rebuild e instale** o app. Agora o botão **Entrar com Google** funciona.

Outras chaves em `Config.kt`:

- `EXIGIR_CONTA` — se `true`, o checkout pede login antes de finalizar (só vale
  quando o login está de fato disponível; enquanto o `GOOGLE_WEB_CLIENT_ID`
  estiver vazio, o checkout segue funcionando sem conta).
- `ADMIN_EMAILS` — e-mails que enxergam a aba **Admin** em "Minha conta", onde dá
  para marcar disponível/reservado/vendido. É o mesmo `admin.emails` do site.

O schema no Firestore é o mesmo do site: `users/{uid}` (perfil + carrinho),
`users/{uid}/pedidos/{codigo}`, `disponibilidade/{idLivro}` e `catalogo/{id}`.

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
│           ├── MainActivity.kt       ← navegação (loja → carrinho → checkout → conta)
│           ├── model/Book.kt
│           ├── data/                 ← Catalog, Config, Pricing, Cart, PixGen, Account, ...
│           └── ui/                   ← StoreScreen, BookDetailSheet, CartScreen,
│                                        CheckoutScreen, AccountScreen
├── build.gradle.kts
├── settings.gradle.kts
└── gradlew / gradle/                 ← Gradle wrapper (8.9)
```

## 🔧 Stack

- Kotlin 2.0 · Jetpack Compose (Material 3) · Navigation Compose
- Coil (carregamento das capas) · ZXing (QR Code do Pix)
- Firebase Auth + Firestore (contas/pedidos/admin) · Google Play Services Auth
  (login com Google) — inicializados por `FirebaseOptions`, sem
  `google-services.json`
- minSdk 24 (Android 7.0) · targetSdk 34
