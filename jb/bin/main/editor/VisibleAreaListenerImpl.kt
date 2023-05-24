package com.codestream.editor

import com.codestream.editorService
import com.codestream.extensions.gitSha
import com.codestream.extensions.selections
import com.codestream.extensions.uri
import com.codestream.extensions.visibleRanges
import com.codestream.protocols.webview.EditorNotifications
import com.codestream.webViewService
import com.intellij.openapi.editor.event.VisibleAreaEvent
import com.intellij.openapi.editor.event.VisibleAreaListener
import com.intellij.openapi.project.Project
import org.eclipse.lsp4j.Range

class VisibleAreaListenerImpl(val project: Project) : VisibleAreaListener {

    private var lastVisibleRanges: List<Range>? = null

    override fun visibleAreaChanged(e: VisibleAreaEvent) {
        if (e.oldRectangle == null || e.oldRectangle.isEmpty && !e.newRectangle.isEmpty) {
            project.editorService?.updateMarkers(e.editor.document)
        }
        if (e.newRectangle.isEmpty) return

        val editorService = project.editorService ?: return
        if (e.editor != editorService.activeEditor) return

        val visibleRanges = e.editor.visibleRanges
        if (visibleRanges.hasEqualLines(lastVisibleRanges)) return

        lastVisibleRanges = visibleRanges
        project.webViewService?.postNotification(
            EditorNotifications.DidChangeVisibleRanges(
                e.editor.document.uri,
                e.editor.document.gitSha,
                e.editor.selections,
                visibleRanges,
                e.editor.document.lineCount
            )
        )
    }
}

private fun List<Range>.hasEqualLines(otherRanges: List<Range>?): Boolean {
    if (this.size != otherRanges?.size) return false

    val pairList = this.zip(otherRanges)
    return pairList.all { (range1, range2) ->
        range1.start.line == range2.start.line
            && range1.end.line == range2.end.line
    }
}
