package com.codestream.language

import com.intellij.lang.Language

class NrqlLanguage : Language("NRQL") {
    companion object {
        val INSTANCE = NrqlLanguage()
    }
}
