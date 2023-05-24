package com.codestream.webview

import com.google.gson.JsonElement
import javax.swing.JComponent

interface WebView {
    val component: JComponent?
    fun loadUrl(url: String)
    fun dispose()
    fun postMessage(message: JsonElement)
    fun focus()
    fun openDevTools()
    fun zoomIn()
    fun zoomOut()
    fun resetZoom()
}
