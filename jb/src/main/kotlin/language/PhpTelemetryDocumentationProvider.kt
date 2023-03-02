package com.codestream.language

import com.codestream.agentService
import com.codestream.appDispatcher
import com.codestream.protocols.agent.FileLevelTelemetryOptions
import com.codestream.protocols.agent.FileLevelTelemetryParams
import com.codestream.protocols.agent.FunctionLocator
import com.intellij.psi.PsiElement
import com.jetbrains.php.lang.documentation.PhpDocumentationProvider
import com.jetbrains.php.lang.psi.PhpPsiUtil
import com.jetbrains.php.lang.psi.elements.PhpReference
import com.jetbrains.php.lang.psi.elements.Statement
import com.jetbrains.php.lang.psi.elements.impl.MethodImpl
import com.jetbrains.php.lang.psi.elements.impl.MethodReferenceImpl
import kotlinx.coroutines.launch
import java.util.concurrent.CompletableFuture

class PhpTelemetryDocumentationProvider: PhpDocumentationProvider() {

    override fun generateHoverDoc(element: PsiElement, originalElement: PsiElement?): String? {
        val doc = super.generateHoverDoc(element, originalElement)
        val ref = PhpPsiUtil.getParentByCondition<PsiElement>(
            originalElement,
            false,
            PhpReference.INSTANCEOF,
            Statement.INSTANCEOF
        ) as PhpReference? ?: return doc


        if (originalElement == null) return doc
        val agent = element.project.agentService ?: return doc

        val future = CompletableFuture<String>()
        // val source = getDocSourceFor(element, originalElement)
        // val classReference = (ref as? MethodReferenceImpl)?.classReference ?: return doc
        // val searchScope = GlobalSearchScopes.projectProductionScope(element.project)
        // ClassInheritorsSearch.search(classReference., searchScope, false).findAll()

        // val containingClass = (element as? PhpClassMember)?.name?.substring(1) ?: return doc

        val methodCandidates = (element as? MethodReferenceImpl)?.resolveGlobal(true) ?: return doc
        val classNames = mutableListOf<String>()
        methodCandidates.forEach {
            val method = (it as? MethodImpl)
            method?.containingClass?.let {
                classNames.add((it.namespaceName + it.name).substring(1))
                it.superClass?.let {
                    classNames.add((it.namespaceName + it.name).substring(1))
                }
            }
        }

        appDispatcher.launch {
            try {
                val result = agent.fileLevelTelemetry(FileLevelTelemetryParams(
                    element.containingFile.virtualFile.url,
                    "php",
                    FunctionLocator(classNames, ref.name),
                    null,
                    null,
                    false,
                    FileLevelTelemetryOptions(true, true, true)
                ))
                future.complete("Average duration: ${result?.averageDuration?.first()?.averageDuration}")
            } catch (ex: Exception) {
                future.complete(ex.message)
            }
        }

        return doc + future.join()
    }
}
