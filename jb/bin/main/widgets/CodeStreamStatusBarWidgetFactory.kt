package com.codestream.widgets

import com.codestream.agentService
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.StatusBar
import com.intellij.openapi.wm.StatusBarWidget
import com.intellij.openapi.wm.StatusBarWidgetFactory

class CodeStreamStatusBarWidgetFactory : StatusBarWidgetFactory {
    var codeStreamStatusBarWidget: CodeStreamStatusBarWidget? = null

    override fun createWidget(project: Project): StatusBarWidget {
        return CodeStreamStatusBarWidget(project).let {
            codeStreamStatusBarWidget = it
            it
        }
    }

    override fun disposeWidget(widget: StatusBarWidget) {
        widget.dispose()
    }

    override fun canBeEnabledOn(statusBar: StatusBar): Boolean {
        return true
    }

    override fun isAvailable(project: Project): Boolean {
        return project.agentService != null
    }

    override fun getId(): String {
        return "com.codestream.jetbrains-codestream"
    }

    override fun getDisplayName(): String {
        return "New Relic CodeStream: GitHub, GitLab, PRs and Code Review"
    }
}
