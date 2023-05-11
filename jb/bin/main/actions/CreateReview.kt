package com.codestream.actions

import com.codestream.codeStream
import com.codestream.extensions.selectionOrCurrentLine
import com.codestream.extensions.uri
import com.codestream.protocols.webview.ReviewNotifications
import com.codestream.webViewService
import com.intellij.codeInsight.intention.IntentionAction
import com.intellij.codeInsight.intention.LowPriorityAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.DumbAwareAction
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.IconLoader
import com.intellij.openapi.util.Iconable
import com.intellij.psi.PsiFile
import java.awt.event.KeyEvent

class CreateReview : DumbAwareAction(), IntentionAction, LowPriorityAction, Iconable {
    private fun execute(project: Project, source: String) {
        FileEditorManager.getInstance(project).selectedTextEditor?.run {
            project.codeStream?.show {
                project.webViewService?.postNotification(
                    ReviewNotifications.New(
                        document.uri,
                        selectionOrCurrentLine,
                        source
                    )
                )
            }
        }
    }

    override fun actionPerformed(e: AnActionEvent) {
        val source = when {
            e.isFromContextMenu -> "Context Menu"
            e.inputEvent is KeyEvent -> "Shortcut"
            else -> "Action List"
        }
        e.project?.let { execute(it, source) }
    }

    override fun invoke(project: Project, editor: Editor?, file: PsiFile?) {
        execute(project, "Lightbulb Menu")
    }

    override fun startInWriteAction() = true

    override fun getFamilyName() = "CodeStream"

    override fun isAvailable(project: Project, editor: Editor?, file: PsiFile?) = true

    override fun getText() = "Request feedback"

    override fun getIcon(flags: Int) = IconLoader.getIcon("/images/review.svg")
}
