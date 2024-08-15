package com.codestream.language

import com.intellij.extapi.psi.PsiFileBase
import com.intellij.openapi.fileTypes.FileType
import com.intellij.psi.FileViewProvider

class NrqlFile(viewProvider: FileViewProvider) : PsiFileBase(viewProvider, NrqlLanguage.INSTANCE) {
    override fun getFileType(): FileType = NrqlFileType.INSTANCE

    override fun toString(): String = "NRQL File"
}
