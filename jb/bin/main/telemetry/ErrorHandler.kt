package com.codestream.telemetry

import com.codestream.agent.AgentService
import com.codestream.protocols.agent.Ide
import com.codestream.protocols.agent.UserLoggedIn
import com.codestream.system.platform
import com.intellij.diagnostic.LogMessage
import com.intellij.openapi.diagnostic.ErrorReportSubmitter
import com.intellij.openapi.diagnostic.IdeaLoggingEvent
import com.intellij.openapi.diagnostic.SubmittedReportInfo
import com.intellij.util.Consumer
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import java.awt.Component

class ErrorHandler : ErrorReportSubmitter() {

    companion object {
        var userLoggedIn: UserLoggedIn? = null
        var agentService: AgentService? = null
        private var _consumer: Consumer<in SubmittedReportInfo>? = null
    }

    override fun getReportActionText(): String {
        return "Report to CodeStream"
    }

    override fun submit(
        events: Array<out IdeaLoggingEvent>,
        additionalInfo: String?,
        parentComponent: Component,
        consumer: Consumer<in SubmittedReportInfo>
    ): Boolean {
        _consumer = consumer

        for (event in events) {
            val logMessage = event.data as? LogMessage
            logMessage?.let {
                GlobalScope.launch {
                    agentService?.reportMessage(it.throwable)
                }
            }
        }

        return true
    }
}
