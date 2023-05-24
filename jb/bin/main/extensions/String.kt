package com.codestream.extensions

fun String?.ifNullOrBlank(defaultValue: () -> String): String =
    if (this.isNullOrBlank()) defaultValue() else this


val String?.isTruthy: Boolean
    get() {
        return when(this?.toLowerCase()) {
            null -> false
            "true" -> true
            "1" -> true
            else -> false
        }
    }

fun String.escapeUnicode(): String {
    var escaped = this
    val len = escaped.length
    var i = 0
    while (i < len) {
        var ch = escaped[i]
        if (ch.toInt() > 255) {
            val buf = StringBuilder()
            buf.append(escaped.substring(0, i))
            while (i < len) {
                ch = escaped[i]
                if (ch.toInt() > 255) {
                    buf.append("\\u")
                    buf.append(Character.forDigit((ch.toInt() shr 12) % 16, 16))
                    buf.append(Character.forDigit((ch.toInt() shr 8) % 16, 16))
                    buf.append(Character.forDigit((ch.toInt() shr 4) % 16, 16))
                    buf.append(Character.forDigit(ch.toInt() % 16, 16))
                } else {
                    buf.append(ch)
                }
                i++
            }
            escaped = buf.toString()
        } else {
            i++
        }
    }
    return escaped
}
