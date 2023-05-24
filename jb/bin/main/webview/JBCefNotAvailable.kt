package com.codestream.webview

import com.google.gson.JsonElement
import com.intellij.ui.HyperlinkLabel
import javax.swing.JComponent

class JBCefNotAvailable : WebView {
    override val component: JComponent = HyperlinkLabel(
        "JCEF not available. Click for more information."
    ).also {
        it.setHyperlinkTarget("https://blog.jetbrains.com/platform/2020/07/javafx-and-jcef-in-the-intellij-platform")
    }

    override fun loadUrl(url: String) {
    }

    override fun dispose() {
    }

    override fun postMessage(message: JsonElement) {
    }

    override fun focus() {
    }

    override fun openDevTools() {
    }

    override fun zoomIn() {
    }

    override fun zoomOut() {
    }

    override fun resetZoom() {
    }
}
