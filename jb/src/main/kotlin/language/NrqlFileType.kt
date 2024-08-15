package com.codestream.language

import com.intellij.openapi.fileTypes.LanguageFileType
import com.intellij.openapi.util.IconLoader

class NrqlFileType : LanguageFileType(NrqlLanguage.INSTANCE) {
    companion object {
        val INSTANCE = NrqlFileType()
    }

    override fun getName(): String = "NRQL File"

    override fun getDescription(): String = "New Relic Query Language"

    override fun getDefaultExtension(): String = "nrql"

    override fun getIcon() = IconLoader.getIcon("/images/codestream.svg", NrqlFileType::class.java)
}
