package com.codestream.actions

import com.codestream.agentService
import com.codestream.extensions.selectionOrCurrentLine
import com.codestream.extensions.uri
import com.codestream.protocols.agent.CreatePermalinkParams
import com.codestream.protocols.agent.PermalinkPrivacy
import com.intellij.notification.Notification
import com.intellij.notification.NotificationType
import com.intellij.notification.Notifications
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.ide.CopyPasteManager
import com.intellij.openapi.project.DumbAwareAction
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import java.awt.datatransfer.StringSelection

private val PERMALINK_COPIED = Notification(
    "CodeStream",
    "CodeStream",
    "Permalink copied to clipboard",
    NotificationType.INFORMATION
)

class CopyPermalink : DumbAwareAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val editor = FileEditorManager.getInstance(project).selectedTextEditor ?: return
        val agentService = project.agentService ?: return

        val uri = editor.document.uri
        val selection = editor.selectionOrCurrentLine

        GlobalScope.launch {
            val result = agentService.createPermalink(
                CreatePermalinkParams(uri, selection, PermalinkPrivacy.PRIVATE.value)
            )

            CopyPasteManager.getInstance().setContents(StringSelection(result.linkUrl))
            Notifications.Bus.notify(PERMALINK_COPIED, project)
        }
    }
}
