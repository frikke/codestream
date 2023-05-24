package com.codestream.actions

import com.codestream.webViewService
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAwareAction

class WebViewZoomReset : DumbAwareAction() {
    override fun actionPerformed(e: AnActionEvent) {
        e.project?.webViewService?.webView?.resetZoom()
    }
}
