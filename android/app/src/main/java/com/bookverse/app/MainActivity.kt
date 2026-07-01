package com.bookverse.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.bookverse.app.data.Account
import com.bookverse.app.data.Cart
import com.bookverse.app.model.Book
import com.bookverse.app.ui.AccountScreen
import com.bookverse.app.ui.BookDetailSheet
import com.bookverse.app.ui.CartScreen
import com.bookverse.app.ui.CheckoutScreen
import com.bookverse.app.ui.StoreScreen
import com.bookverse.app.ui.theme.BookVerseTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Cart.init(applicationContext)
        Account.init(applicationContext)
        setContent {
            BookVerseTheme {
                BookVerseApp()
            }
        }
    }
}

@Composable
private fun BookVerseApp() {
    val nav = rememberNavController()
    var selecionado by remember { mutableStateOf<Book?>(null) }

    NavHost(navController = nav, startDestination = "store") {
        composable("store") {
            StoreScreen(
                onOpenBook = { selecionado = it },
                onOpenCart = { nav.navigate("cart") },
                onOpenAccount = { nav.navigate("conta") },
            )
        }
        composable("cart") {
            CartScreen(
                onBack = { nav.popBackStack() },
                onCheckout = { nav.navigate("checkout") },
            )
        }
        composable("conta") {
            AccountScreen(onBack = { nav.popBackStack() })
        }
        composable(
            route = "checkout?book={book}",
            arguments = listOf(
                navArgument("book") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                },
            ),
        ) { entry ->
            CheckoutScreen(
                directBookId = entry.arguments?.getString("book"),
                onBack = { nav.popBackStack() },
                onFinish = { nav.popBackStack("store", inclusive = false) },
                onOpenAccount = { nav.navigate("conta") },
            )
        }
    }

    selecionado?.let { book ->
        BookDetailSheet(
            book = book,
            onDismiss = { selecionado = null },
            onBuyNow = {
                selecionado = null
                nav.navigate("checkout?book=${it.id}")
            },
            onAddToCart = {
                Cart.add(it, 1)
                selecionado = null
                nav.navigate("cart")
            },
        )
    }
}
