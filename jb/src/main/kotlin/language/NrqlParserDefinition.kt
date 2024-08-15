package com.codestream.language

import com.intellij.lang.ASTNode
import com.intellij.lang.ParserDefinition
import com.intellij.lang.PsiParser
import com.intellij.lexer.Lexer
import com.intellij.openapi.project.Project
import com.intellij.psi.FileViewProvider
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.tree.IFileElementType
import com.intellij.psi.tree.TokenSet


class NrqlParserDefinition : ParserDefinition {
    companion object {
        val FILE: IFileElementType = IFileElementType(NrqlLanguage.INSTANCE)
    }

    override fun createLexer(project: Project?): Lexer = NrqlLexerAdapter()

    override fun getCommentTokens(): TokenSet = NrqlTokenSets.COMMENTS

    override fun getStringLiteralElements(): TokenSet = NrqlTokenSets.STRING_LITERALS

    override fun createParser(project: Project?): PsiParser = NrqlParser()

    override fun getFileNodeType(): IFileElementType = FILE

    override fun createFile(viewProvider: FileViewProvider): PsiFile = NrqlFile(viewProvider)

    override fun createElement(node: ASTNode?): PsiElement = NrqlTypes.Factory.createElement(node)
}
