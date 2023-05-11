package com.codestream.extensions

import org.eclipse.lsp4j.Position

operator fun Position.compareTo(another: Position): Int {
    return when {
        another == null -> 1
        line < another.line -> -1
        line > another.line -> 1
        else -> when {
            character < another.character -> -1
            character > another.character -> 1
            else -> 0
        }
    }
}
