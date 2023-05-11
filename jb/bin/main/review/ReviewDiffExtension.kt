package com.codestream.review

import com.codestream.editorService
import com.intellij.diff.DiffContext
import com.intellij.diff.DiffExtension
import com.intellij.diff.FrameDiffTool
import com.intellij.diff.requests.DiffRequest
import com.intellij.diff.tools.util.side.TwosideTextDiffViewer
import com.intellij.openapi.application.ApplicationManager

class ReviewDiffExtension : DiffExtension() {
    override fun onViewerCreated(viewer: FrameDiffTool.DiffViewer, context: DiffContext, request: DiffRequest) {
        if (request.getUserData(REVIEW_DIFF) != true) {
            return
        }
        ApplicationManager.getApplication().invokeLater {
            val editor = viewer as? TwosideTextDiffViewer
            editor?.let {
                it.project?.editorService?.activeEditor = it.editor2
            }
        }
    }
}

