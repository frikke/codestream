package com.codestream.language

import com.intellij.lexer.Lexer
import com.intellij.openapi.editor.DefaultLanguageHighlighterColors
import com.intellij.openapi.editor.HighlighterColors
import com.intellij.openapi.editor.colors.TextAttributesKey
import com.intellij.openapi.editor.colors.TextAttributesKey.createTextAttributesKey
import com.intellij.openapi.fileTypes.SyntaxHighlighter
import com.intellij.openapi.fileTypes.SyntaxHighlighterBase
import com.intellij.psi.TokenType
import com.intellij.psi.tree.IElementType


class NrqlSyntaxHighlighter : SyntaxHighlighterBase() {
    override fun getHighlightingLexer(): Lexer {
        return NrqlLexerAdapter()
    }

    val OPERATOR: TextAttributesKey = createTextAttributesKey("NRQL_OPERATOR", DefaultLanguageHighlighterColors.OPERATION_SIGN)
    val ATTRIBUTE_NAME: TextAttributesKey = createTextAttributesKey("NRQL_ATTRIBUTE_NAME", DefaultLanguageHighlighterColors.LOCAL_VARIABLE)
    val NUMBER: TextAttributesKey = createTextAttributesKey("NRQL_NUMBER", DefaultLanguageHighlighterColors.NUMBER)
    val SINGLE_QUOTED_STRING: TextAttributesKey = createTextAttributesKey("NRQL_SINGLE_QUOTED_STRING", DefaultLanguageHighlighterColors.STRING)
    val COMMENT: TextAttributesKey = createTextAttributesKey("NRQL_COMMENT", DefaultLanguageHighlighterColors.LINE_COMMENT)
    val KEYWORD: TextAttributesKey = createTextAttributesKey("NRQL_KEYWORD", DefaultLanguageHighlighterColors.KEYWORD)
    val PREPROCESSOR: TextAttributesKey = createTextAttributesKey("NRQL_PREPROCESSOR", DefaultLanguageHighlighterColors.METADATA)
    val FUNCTION: TextAttributesKey = createTextAttributesKey("NRQL_FUNCTION", DefaultLanguageHighlighterColors.FUNCTION_CALL)
    val DOUBLE_QUOTED_STRING: TextAttributesKey = createTextAttributesKey("NRQL_DOUBLE_QUOTED_STRING", DefaultLanguageHighlighterColors.STRING)
    val BAD_CHARACTER: TextAttributesKey = createTextAttributesKey("NRQL_BAD_CHARACTER", HighlighterColors.BAD_CHARACTER)


    private val OPERATOR_KEYS = arrayOf(OPERATOR)
    private val ATTRIBUTE_NAME_KEYS = arrayOf(ATTRIBUTE_NAME)
    private val NUMBER_KEYS = arrayOf(NUMBER)
    private val SINGLE_QUOTED_STRING_KEYS = arrayOf(SINGLE_QUOTED_STRING)
    private val COMMENT_KEYS = arrayOf(COMMENT)
    private val KEYWORD_KEYS = arrayOf(KEYWORD)
    private val PREPROCESSOR_KEYS = arrayOf(PREPROCESSOR)
    private val FUNCTION_KEYS = arrayOf(FUNCTION)
    private val DOUBLE_QUOTED_STRING_KEYS = arrayOf(DOUBLE_QUOTED_STRING)
    private val BAD_CHARACTER_KEYS = arrayOf(BAD_CHARACTER)
    private val EMPTY_KEYS = emptyArray<TextAttributesKey>()

    override fun getTokenHighlights(elementType: IElementType?): Array<TextAttributesKey> = when (elementType) {
        NrqlTypes.OPERATOR -> OPERATOR_KEYS
        NrqlTypes.ATTRIBUTE_NAME -> ATTRIBUTE_NAME_KEYS
        NrqlTypes.NUMBER -> NUMBER_KEYS
        NrqlTypes.SINGLE_QUOTED_STRING -> SINGLE_QUOTED_STRING_KEYS
        NrqlTypes.COMMENT -> COMMENT_KEYS
        NrqlTypes.KEYWORD -> KEYWORD_KEYS
        NrqlTypes.PREPROCESSOR -> PREPROCESSOR_KEYS
        NrqlTypes.FUNCTION -> FUNCTION_KEYS
        NrqlTypes.DOUBLE_QUOTED_STRING -> DOUBLE_QUOTED_STRING_KEYS
        TokenType.BAD_CHARACTER -> BAD_CHARACTER_KEYS
        else -> EMPTY_KEYS
    }
}
