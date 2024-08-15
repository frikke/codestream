package com.codestream.language.psi

import com.codestream.language.NrqlLanguage
import com.intellij.psi.tree.IElementType

class NrqlElementType(debugName: String) : IElementType(debugName, NrqlLanguage.INSTANCE) {
}
