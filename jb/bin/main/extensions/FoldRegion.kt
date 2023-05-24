package com.codestream.extensions

import com.intellij.openapi.editor.FoldRegion

val FoldRegion.start get() = document.lspPosition(startOffset)
val FoldRegion.end get() = document.lspPosition(endOffset)
