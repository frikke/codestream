package com.codestream.protocols.webview

import com.codestream.protocols.CodemarkType
import com.codestream.protocols.agent.CSRepo
import com.codestream.protocols.agent.FileLevelTelemetryOptions
import com.codestream.protocols.agent.ObservabilityAnomaly
import com.codestream.protocols.agent.PixieDynamicLoggingFunctionParameter
import com.google.gson.JsonObject
import org.eclipse.lsp4j.Range
import org.eclipse.lsp4j.TextDocumentIdentifier

interface WebViewNotification {
    fun getMethod(): String
}

object EditorNotifications {

    class DidChangeVisibleRanges(
        val uri: String?,
        val gitSha: String?,
        val selections: List<EditorSelection>,
        val visibleRanges: List<Range>,
        val lineCount: Number
    ) : WebViewNotification {
        override fun getMethod() = "webview/editor/didChangeVisibleRanges"
    }

    class DidChangeSelection(
        val uri: String?,
        val gitSha: String?,
        val selections: List<EditorSelection>?,
        val visibleRanges: List<Range>?,
        val lineCount: Number
    ) : WebViewNotification {
        override fun getMethod() = "webview/editor/didChangeSelection"
    }

    class DidChangeActive(val editor: EditorInformation?) : WebViewNotification {
        override fun getMethod() = "webview/editor/didChangeActive"
    }

    class DidChangeLayout(val sidebar: Sidebar): WebViewNotification {
        override fun getMethod() = "webview/editor/didChangeLayout"
    }
}

object CodemarkNotifications {

    class Show(
        val codemarkId: String,
        val sourceUri: String? = null,
        val simulated: Boolean? = null
    ) : WebViewNotification {
        override fun getMethod() = "webview/codemark/show"
    }

    class New(
        val uri: String?,
        val range: Range,
        val type: CodemarkType,
        val source: String?,
        val defaultCodemarkText: String? = null
    ) : WebViewNotification {
        override fun getMethod() = "webview/codemark/new"
    }
}

object ReviewNotifications {
    class Show(
        val reviewId: String,
        val codemarkId: String? = null,
        val openFirstDiff: Boolean? = null,
        val sourceUri: String? = null,
        val simulated: Boolean? = null
    ) : WebViewNotification {
        override fun getMethod() = "webview/review/show"
    }

    class New(
        val uri: String?,
        val range: Range,
        val source: String?,
        val includeLatestCommit: Boolean = false
    ) : WebViewNotification {
        override fun getMethod() = "webview/review/new"
    }
}

object WorkNotifications {
    class Start(
        val uri: String?,
        val source: String?
    ) : WebViewNotification {
        override fun getMethod() = "webview/work/start"
    }
}

object PullRequestNotifications {
    class New(
        val uri: String?,
        val range: Range,
        val source: String?
    ) : WebViewNotification {
        override fun getMethod() = "webview/pullRequest/new"
    }

    class Show(
        val providerId: String,
        val id: String,
        val commentId: String? = null
    ) : WebViewNotification {
        override fun getMethod() = "webview/pullRequest/show"
    }

    class HandleDirectives(
        val pullRequest: JsonObject?,
        val directives: JsonObject?
    ) : WebViewNotification {
        override fun getMethod() = "webview/pullRequest/handleDirectives"
    }
}

object StreamNotifications {
    class Show(
        val streamId: String,
        val threadId: String? = null
    ) : WebViewNotification {
        override fun getMethod(): String = "webview/stream/show"
    }
}

object FocusNotifications {
    class DidChange(
        val focused: Boolean
    ) : WebViewNotification {
        override fun getMethod(): String = "webview/focus/didChange"
    }
}

object VisibilityNotifications {
    class DidChange(
        val visibility: Boolean
    ) : WebViewNotification {
        override fun getMethod(): String = "webview/visibility/didChange"
    }
}

object HostNotifications {
    class DidReceiveRequest(
        val url: String?
    ) : WebViewNotification {
        override fun getMethod(): String = "webview/request/parse"
    }
}

class DidChangeApiVersionCompatibility : WebViewNotification {
    override fun getMethod(): String = "codestream/didChangeApiVersionCompatibility"
}

class DidLogout() : WebViewNotification {
    override fun getMethod(): String = "webview/didLogout"
}

object PixieNotifications {
    class DynamicLogging(
        val functionName: String,
        val functionParameters: List<PixieDynamicLoggingFunctionParameter>,
        val functionReceiver: String?,
        val packageName: String
    ) : WebViewNotification {
        override fun getMethod(): String = "webview/pixie/dynamicLogging"
    }
}

object ObservabilityAnomalyNotifications {
    class View(
        val anomaly: ObservabilityAnomaly,
        val entityGuid: String
    ) : WebViewNotification {
        override fun getMethod(): String = "webview/anomaly/view"
    }
}

object MethodLevelTelemetryNotifications {
    class View(
        val error: Any?,
        val repo: CSRepo,
        val codeNamespace: String?,
        val filePath: String,
        val relativeFilePath: String?,
        val languageId: String,
        val range: Range?,
        val functionName: String?,
        val newRelicAccountId: Int?,
        val newRelicEntityGuid: String?,
        val methodLevelTelemetryRequestOptions: FileLevelTelemetryOptions?,
        val metricTimesliceNameMapping: MetricTimesliceNameMapping?
    ) : WebViewNotification {
        override fun getMethod(): String = "webview/mlt/view"

        class MetricTimesliceNameMapping(
            val duration: String?,
            val sampleSize: String?,
            val errorRate: String?,
            val source: String?
        )
    }
}

object ShowProgressIndicator {
    class Start(
        val progressStatus: Boolean = true
    ) : WebViewNotification {
        override fun getMethod() = "webview/system/progressIndicator"
    }
}

object DocumentMarkerNotifications {
    class DidChange(
        val textDocument: TextDocumentIdentifier
    ) : WebViewNotification {
        override fun getMethod(): String = "codestream/didChangeDocumentMarkers"
    }
}

object LogsNotifications {
    class Search(
        val query: String?,
        val entryPoint: String = "context_menu"
    ) : WebViewNotification {
        override fun getMethod(): String = "webview/logs/search"
    }
}

object NrqlNotifications {
    class Execute(
        val query: String?,
        val entryPoint: String = "context_menu"
    ) : WebViewNotification {
        override fun getMethod(): String = "webview/nrql/execute"
    }
}
