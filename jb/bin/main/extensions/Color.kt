package com.codestream.extensions

import java.awt.Color

fun Color.darken(percentage: Int): Color {
    return darken(percentage.toFloat())
}

fun Color.darken(percentage: Float): Color {
    return lighten(-percentage)
}

fun Color.lighten(percentage: Int): Color {
    return lighten(percentage.toFloat())
}

fun Color.lighten(percentage: Float): Color {
    val amount = (255 * percentage) / 100
    return Color(
        adjustLight(red, amount),
        adjustLight(green, amount),
        adjustLight(blue, amount),
        alpha
    )
}

fun Color.opacity(percentage: Int): Color {
    return Color(
        red,
        green,
        blue,
        Math.round(255 * ((alpha / 255) * percentage.toFloat() / 100))
    )
}

private fun adjustLight(light: Int, amount: Float): Int {
    val cc = light + amount
    val c = cc.coerceIn(0F, 255F)
    return Math.round(c)
}

