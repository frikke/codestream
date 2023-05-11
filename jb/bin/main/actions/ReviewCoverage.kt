package com.codestream.actions

import com.codestream.editorService
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAwareAction

class ReviewCoverage : DumbAwareAction() {
    override fun actionPerformed(e: AnActionEvent) {
        e.project?.editorService?.reviewCoverage()
    }
}
