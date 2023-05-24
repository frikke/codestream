package com.codestream.extensions

import com.intellij.openapi.editor.event.DocumentEvent
import org.eclipse.lsp4j.Position

val DocumentEvent.lspPosition: Position
    get() = document.lspPosition(offset)