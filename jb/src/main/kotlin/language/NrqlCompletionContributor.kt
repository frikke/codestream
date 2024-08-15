package com.codestream.language

import com.codestream.agentService
import com.codestream.extensions.lspPosition
import com.codestream.extensions.textDocumentIdentifier
import com.intellij.codeInsight.completion.CompletionContributor
import com.intellij.codeInsight.completion.CompletionParameters
import com.intellij.codeInsight.completion.CompletionProvider
import com.intellij.codeInsight.completion.CompletionResultSet
import com.intellij.codeInsight.completion.CompletionType
import com.intellij.codeInsight.lookup.LookupElementBuilder
import com.intellij.patterns.PlatformPatterns
import com.intellij.util.ProcessingContext
import com.intellij.util.io.await
import org.eclipse.lsp4j.CompletionParams

class NrqlCompletionContributor : CompletionContributor() {
    init {
        extend(CompletionType.BASIC, PlatformPatterns.psiElement().withLanguage(NrqlLanguage.INSTANCE), NrqlCompletionProvider())
    }
}

class NrqlCompletionProvider : CompletionProvider<CompletionParameters>() {
    override fun addCompletions(parameters: CompletionParameters, context: ProcessingContext, result: CompletionResultSet) {
        try {
            val agentService = parameters.editor.project?.agentService ?: return
            if (!agentService.initialization.isDone) return
            val future = agentService.agent.textDocumentService.completion(CompletionParams(parameters.editor.document.textDocumentIdentifier, parameters.editor.document.lspPosition(parameters.offset)))
            val either = future.join()
            either.left?.forEach {
                result.addElement(LookupElementBuilder.create(it.label))
            }
        } catch (ex: Exception) {
            ex.printStackTrace()
        }
    }
}
