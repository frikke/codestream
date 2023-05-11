package com.codestream.editor

import com.codestream.protocols.agent.Codemark
import java.awt.Color

val aqua = CodemarkColor(0x5ABFDC, "aqua")
val blue = CodemarkColor(0x3578BA, "blue")
val gray = CodemarkColor(0x7F7F7F, "gray")
val green = CodemarkColor(0x7ABA5D, "green")
val orange = CodemarkColor(0xF1A340, "orange")
val purple = CodemarkColor(0xB87CDA, "purple")
val red = CodemarkColor(0xD9634F, "red")
val yellow = CodemarkColor(0xEDD648, "yellow")

class CodemarkColor(rgb: Int, val name: String) : Color(rgb)

fun Codemark.color(): CodemarkColor = when {
    pinned != true -> gray
    status == "closed" -> purple
    else -> green
}
