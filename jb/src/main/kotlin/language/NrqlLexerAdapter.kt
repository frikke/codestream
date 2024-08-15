package com.codestream.language

import com.intellij.lexer.FlexAdapter

class NrqlLexerAdapter : FlexAdapter(NrqlLexer(null))
