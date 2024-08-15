package com.codestream.webview

import com.codestream.agentService
import com.codestream.appDispatcher
import com.codestream.authentication.CSLogoutReason
import com.codestream.authenticationService
import com.codestream.clmService
import com.codestream.editorService
import com.codestream.gson
import com.codestream.language.NrqlLanguage
import com.codestream.protocols.agent.SetServerUrlParams
import com.codestream.protocols.webview.ActiveEditorContextResponse
import com.codestream.protocols.webview.BufferOpenRequest
import com.codestream.protocols.webview.CompareLocalFilesRequest
import com.codestream.protocols.webview.EditorCopySymbolRequest
import com.codestream.protocols.webview.EditorCopySymbolResponse
import com.codestream.protocols.webview.EditorRangeHighlightRequest
import com.codestream.protocols.webview.EditorRangeRevealRequest
import com.codestream.protocols.webview.EditorRangeRevealResponse
import com.codestream.protocols.webview.EditorRangeSelectRequest
import com.codestream.protocols.webview.EditorRangeSelectResponse
import com.codestream.protocols.webview.EditorReplaceSymbolRequest
import com.codestream.protocols.webview.EditorReplaceSymbolResponse
import com.codestream.protocols.webview.EditorScrollToRequest
import com.codestream.protocols.webview.EditorSymbolRevealRequest
import com.codestream.protocols.webview.EditorSymbolRevealResponse
import com.codestream.protocols.webview.EditorsCodelensRefreshResponse
import com.codestream.protocols.webview.LogoutRequest
import com.codestream.protocols.webview.MarkerApplyRequest
import com.codestream.protocols.webview.MarkerCompareRequest
import com.codestream.protocols.webview.MarkerInsertTextRequest
import com.codestream.protocols.webview.OpenErrorGroupResponse
import com.codestream.protocols.webview.OpenUrlRequest
import com.codestream.protocols.webview.ReviewShowDiffRequest
import com.codestream.protocols.webview.ReviewShowLocalDiffRequest
import com.codestream.protocols.webview.ShellPromptFolderResponse
import com.codestream.protocols.webview.UpdateConfigurationRequest
import com.codestream.protocols.webview.UpdateServerUrlRequest
import com.codestream.reviewService
import com.codestream.sessionService
import com.codestream.settings.ApplicationSettingsService
import com.codestream.settingsService
import com.codestream.system.SPACE_ENCODED
import com.codestream.system.sanitizeURI
import com.codestream.webViewService
import com.github.salomonbrys.kotson.fromJson
import com.github.salomonbrys.kotson.get
import com.github.salomonbrys.kotson.jsonObject
import com.github.salomonbrys.kotson.nullString
import com.github.salomonbrys.kotson.set
import com.github.salomonbrys.kotson.string
import com.google.gson.JsonElement
import com.google.gson.JsonParser
import com.intellij.ide.BrowserUtil
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.ServiceManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.EditorFactory
import com.intellij.openapi.fileChooser.FileChooser
import com.intellij.openapi.fileChooser.FileChooserDescriptor
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.OpenFileDescriptor
import com.intellij.openapi.fileEditor.TextEditor
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.openapi.vfs.VirtualFileManager
import com.intellij.psi.PsiDocumentManager
import com.intellij.psi.PsiFileFactory
import com.intellij.testFramework.LightVirtualFile
import com.teamdev.jxbrowser.js.JsAccessible
import kotlinx.coroutines.future.await
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject
import org.eclipse.lsp4j.jsonrpc.ResponseErrorException
import org.eclipse.lsp4j.jsonrpc.messages.ResponseError
import org.jetbrains.kotlin.idea.scratch.ScratchFile
import java.io.File
import java.util.concurrent.CompletableFuture
import kotlin.io.path.Path
import kotlin.io.path.createTempDirectory

class WebViewRouter(val project: Project) {
    var webView: WebView? = null
    private val logger = Logger.getInstance(WebViewRouter::class.java)
    private var _isReady = false
    val isReady get() = _isReady
    val initialization = CompletableFuture<Unit>()

    @JsAccessible
    fun handle(rawMessage: String, origin: String?) = appDispatcher.launch {
        val message = try {
            parse(rawMessage)
        } catch (e: Exception) {
            logger.error(e)
            return@launch
        }

        try {
            logger.debug("Handling ${message.method} ${message.id}")
            when (message.target) {
                "host" -> processHostMessage(message)
                "codestream" -> processAgentMessage(message)
                else -> throw IllegalArgumentException("Invalid webview message target: ${message.target}")
            }
        } catch (e: Exception) {
            logger.warn(e)
            if (message.id != null) {
                if (e is ResponseErrorException) {
                    logger.debug("Posting response ${message.id} - Error: ${e.responseError.message}")
                    postResponse(message.id, null, null, e.responseError)
                } else {
                    logger.debug("Posting response ${message.id} - Error: ${e.message}")
                    postResponse(message.id, null, e.message, null)
                }
            }
        }
    }

    private suspend fun processAgentMessage(message: WebViewMessage) {
        val agentService = project.agentService ?: return
        val response = agentService.remoteEndpoint.request(message.method, message.params).await()
        if (message.id != null) {
            logger.debug("Posting response (agent) ${message.id}")
            postResponse(message.id, response)
        }
    }

    private suspend fun processHostMessage(message: WebViewMessage) {
        val authentication = project.authenticationService ?: return

        val response = when (message.method) {
            "host/bootstrap" -> authentication.bootstrap()
            "host/buffer/open" -> bufferOpen(message)
            "host/didInitialize" -> {
                _isReady = true
                initialization.complete(Unit)
            }
            "host/logout" -> logout(message)
            "host/restart" -> restart(message)
            "host/context/didChange" -> contextDidChange(message)
            "host/webview/reload" -> project.webViewService?.load(true)
            "host/marker/compare" -> hostMarkerCompare(message)
            "host/marker/apply" -> hostMarkerApply(message)
            "host/marker/inserttext" -> hostMarkerInsertText(message)
            "host/configuration/update" -> configurationUpdate(message)
            "host/editor/context" -> {
                ActiveEditorContextResponse(project.editorService?.getEditorContext())
            }
            "host/editor/open" -> editorOpen(message)
            "host/editor/range/highlight" -> editorRangeHighlight(message)
            "host/editor/range/reveal" -> editorRangeReveal(message)
            "host/editor/range/select" -> editorRangeSelect(message)
            "host/editor/scrollTo" -> editorScrollTo(message)
            "host/editor/symbol/reveal" -> editorSymbolReveal(message)
            "host/editor/symbol/copy" -> editorSymbolCopy(message)
            "host/editor/symbol/replace" -> editorSymbolReplace(message)
            "host/editors/codelens/refresh" -> editorsCodelensRefresh(message)
            "host/errorGroup/open" -> openErrorGroup(message)
            "host/shell/prompt/folder" -> shellPromptFolder(message)
            "host/review/showDiff" -> reviewShowDiff(message)
            "host/review/showLocalDiff" -> reviewShowLocalDiff(message)
            "host/review/closeDiff" -> reviewClose(message)
            "host/review/changedFiles/next" -> reviewNextFile(message)
            "host/review/changedFiles/previous" -> reviewPreviousFile(message)
            "host/server-url" -> updateServerUrl(message)
            "host/url/open" -> openUrl(message)
            "host/files/compare" -> compareLocalFiles(message)
            "host/files/closeDiff" -> localFilesDiffClose(message)
            else -> logger.warn("Unhandled host message ${message.method}")
        }
        if (message.id != null) {
            logger.debug("Posting response (host) ${message.id}")
            postResponse(message.id, response.orEmptyObject)
        }
    }

    private fun postResponse(id: String, params: Any?, error: String? = null, responseError: ResponseError? = null) {
        val message = if (responseError != null) {
            jsonObject(
                "id" to id,
                "params" to gson.toJsonTree(params),
                "error" to gson.toJsonTree(responseError)
            )
        } else {
            jsonObject(
                "id" to id,
                "params" to gson.toJsonTree(params),
                "error" to error
            )
        }

        webView?.postMessage(message)
    }

    private suspend fun logout(message: WebViewMessage) {
        val authentication = project.authenticationService ?: return
        val request = gson.fromJson<LogoutRequest>(message.params!!)
        authentication.logout(CSLogoutReason.WEBVIEW_MSG, request.newServerUrl)
    }

    private suspend fun restart(message: WebViewMessage) {
        val agent = project.agentService ?: return
        val webview = project.webViewService ?: return
        agent.restart(null, true)
        agent.onDidStart {
            webview.load()
        }
    }

    private fun contextDidChange(message: WebViewMessage) {
        if (message.params == null) return
        val settingsService = project.settingsService ?: return
        settingsService.setWebViewContextJson(message.params["context"])
    }

    private fun configurationUpdate(message: WebViewMessage): Any {
        val notification = gson.fromJson<UpdateConfigurationRequest>(message.params!!)
        project.settingsService?.set(notification.name, notification.value)
        project.webViewService?.postNotification(
            "webview/config/didChange",
            jsonObject(notification.name to (notification.value == "true"))
        )
        return emptyMap<String, String>()
    }

    private fun hostMarkerApply(message: WebViewMessage) {
        val request = gson.fromJson<MarkerApplyRequest>(message.params!!)
        project.editorService?.applyMarker(request.marker)
    }

    private fun hostMarkerCompare(message: WebViewMessage) {
        val request = gson.fromJson<MarkerCompareRequest>(message.params!!)
        project.editorService?.compareMarker(request.marker)
    }

    private fun hostMarkerInsertText(message: WebViewMessage) {
        val request = gson.fromJson<MarkerInsertTextRequest>(message.params!!)
        project.editorService?.insertText(request.marker, request.text)
    }

    private fun editorOpen(message: WebViewMessage) {
        val editorManager = FileEditorManager.getInstance(project)
        val file = WebViewEditorFile.create(message.params!!)
        ApplicationManager.getApplication().invokeLater {
            val editor = editorManager.openFile(file, true, true).firstOrNull()
            val webview = (editor as? WebViewEditor)?.webView ?: return@invokeLater
            val ide = message.params.asJsonObject["ide"].asJsonObject
            ide["browserEngine"] = webview.type()
            webview.postNotification(message.method, message.params)
            ApplicationManager.getApplication().invokeLater {
                webview.component?.repaint()
            }
        }
    }

    private fun editorRangeHighlight(message: WebViewMessage) {
        val request = gson.fromJson<EditorRangeHighlightRequest>(message.params!!)

        // Numbers greater than Integer.MAX_VALUE are deserialized as -1. It should not happen,
        // but some versions of the plugin might do that trying to represent a whole line.
        request.range?.end?.let {
            if (it.character == -1) {
                it.character = Integer.MAX_VALUE
            }
        }

        project.editorService?.toggleRangeHighlight(request.range, request.highlight)
    }

    private suspend fun editorRangeReveal(message: WebViewMessage): EditorRangeRevealResponse {
        val request = gson.fromJson<EditorRangeRevealRequest>(message.params!!)
        val success = project.editorService?.reveal(request.uri, request.ref, request.range, request.atTop)
            ?: false
        return EditorRangeRevealResponse(success)
    }

    private suspend fun editorSymbolReveal(message: WebViewMessage): EditorSymbolRevealResponse {
        val request = gson.fromJson<EditorSymbolRevealRequest>(message.params!!)
        val success = project.clmService?.revealSymbol(request.codeFilepath, request.codeNamespace, request.codeFunction)
            ?: false
        return EditorSymbolRevealResponse(success)
    }

    private suspend fun editorSymbolCopy(message: WebViewMessage): EditorCopySymbolResponse {
        val request = gson.fromJson<EditorCopySymbolRequest>(message.params!!)
        val response = project.clmService?.copySymbol(request.uri, request.namespace, request.symbolName, request.ref)
        return EditorCopySymbolResponse(response != null, response?.functionText, response?.range, response?.language)
    }

    private suspend fun editorSymbolReplace(message: WebViewMessage): EditorReplaceSymbolResponse {
        val request = gson.fromJson<EditorReplaceSymbolRequest>(message.params!!)
        val response = project.clmService?.replaceSymbol(request.uri, request.symbolName, request.codeBlock, request.namespace)
        return EditorReplaceSymbolResponse(response ?: false)
    }

    private suspend fun editorRangeSelect(message: WebViewMessage): EditorRangeSelectResponse {
        val request = gson.fromJson<EditorRangeSelectRequest>(message.params!!)
        val success =
            project.editorService?.select(request.uri, request.selection, request.preserveFocus ?: false)
                ?: false
        return EditorRangeSelectResponse(success)
    }

    private fun editorScrollTo(message: WebViewMessage) {
        val request = gson.fromJson<EditorScrollToRequest>(message.params!!)
        project.editorService?.scroll(sanitizeURI(request.uri)!!, request.position, request.atTop)
    }

    private fun editorsCodelensRefresh(message: WebViewMessage): EditorsCodelensRefreshResponse {
        project.sessionService?.didChangeCodelenses()
        return EditorsCodelensRefreshResponse(true)
    }

    private fun openErrorGroup(message: WebViewMessage): OpenErrorGroupResponse {
        val webview = project.webViewService ?: return OpenErrorGroupResponse(false)
        webview.postNotification("webview/errorGroup/open", message.params)
        return OpenErrorGroupResponse(true)
    }

    private suspend fun shellPromptFolder(message: WebViewMessage): ShellPromptFolderResponse {
        val fileFuture = CompletableFuture<VirtualFile?>()
        ApplicationManager.getApplication().invokeLater {
            val file = FileChooser.chooseFile(
                FileChooserDescriptor(false, true, false, false, false, false),
                null, null
            )
            fileFuture.complete(file)
        }
        val file = fileFuture.await()
        return ShellPromptFolderResponse(file?.path, file != null)
    }

    private suspend fun reviewShowDiff(message: WebViewMessage) {
        val request = gson.fromJson<ReviewShowDiffRequest>(message.params!!)
        val reviewService = project.reviewService ?: return

        reviewService.showDiff(request.reviewId, request.repoId, request.checkpoint, request.path)
    }

    private suspend fun reviewShowLocalDiff(message: WebViewMessage) {
        val request = gson.fromJson<ReviewShowLocalDiffRequest>(message.params!!)
        val reviewService = project.reviewService ?: return

        reviewService.showLocalDiff(
            request.repoId,
            request.path,
            request.oldPath,
            request.includeSaved,
            request.includeStaged,
            request.editingReviewId,
            request.baseSha,
            request.headSha
        )
    }

    private fun reviewClose(message: WebViewMessage) {
        val reviewService = project.reviewService ?: return
        reviewService.closeDiff()
    }

    private fun reviewNextFile(message: WebViewMessage) {
        val reviewService = project.reviewService ?: return
        reviewService.nextDiff()
    }

    private fun reviewPreviousFile(message: WebViewMessage) {
        val reviewService = project.reviewService ?: return
        reviewService.previousDiff()
    }

    private suspend fun updateServerUrl(message: WebViewMessage) {
        val request = gson.fromJson<UpdateServerUrlRequest>(message.params!!)
        val settings = ServiceManager.getService(ApplicationSettingsService::class.java)
        val currentServerUrl = settings.serverUrl
        settings.serverUrl = request.serverUrl
        settings.disableStrictSSL = request.disableStrictSSL
        if (request.copyToken && request.currentTeamId != null) {
            project.authenticationService?.copyAccessToken(currentServerUrl, request.serverUrl, request.currentTeamId, request.currentTeamId)
        }
        project.agentService?.setServerUrl(SetServerUrlParams(request.serverUrl, request.disableStrictSSL, request.environment))
    }

    private fun openUrl(message: WebViewMessage) {
        val request = gson.fromJson<OpenUrlRequest>(message.params!!)
        BrowserUtil.browse(request.url.replace(" ", SPACE_ENCODED))
    }

    private suspend fun compareLocalFiles(message: WebViewMessage) {
        val request = gson.fromJson<CompareLocalFilesRequest>(message.params!!)
        val reviewService = project.reviewService ?: return

        with(request) {
            reviewService.showRevisionsDiff(
                repoId,
                filePath,
                previousFilePath,
                headSha,
                headBranch,
                baseSha,
                baseBranch,
                context
            )
        }
    }

    private fun localFilesDiffClose(message: WebViewMessage) {
        val reviewService = project.reviewService ?: return
        reviewService.closeDiff()
    }

    private fun bufferOpen(message: WebViewMessage) {
        val request = gson.fromJson<BufferOpenRequest>(message.params!!)
        val tempDir = createTempDirectory("codestream").toFile().also { it.deleteOnExit() }
        val tempFile = File(tempDir, "temp.${request.contentType}")
        tempFile.writeText(request.data, Charsets.UTF_8)
        val vFile = VirtualFileManager.getInstance().findFileByNioPath(Path(tempFile.path))
        ApplicationManager.getApplication().invokeLater {
            try {
                vFile?.let {
                    FileEditorManager.getInstance(project).openFile(it, true)
                }
            } catch (ex: Exception) {
                ex.printStackTrace()
            }
        }
    }

    private fun parse(json: String): WebViewMessage {
        val parser = JsonParser()
        val jsonObject = parser.parse(json).asJsonObject

        val id = jsonObject.get("id").nullString
        val method = jsonObject.get("method").string
        val params = jsonObject.get("params")
        val error = jsonObject.get("error").nullString

        return WebViewMessage(id, method, params, error)
    }

    class WebViewMessage(
        val id: String?,
        val method: String,
        val params: JsonElement?,
        val error: String?
    ) {
        val target: String = method.split("/")[0]
    }
}

private val Any?.orEmptyObject: Any?
    get() =
        if (this == null || this is Unit) jsonObject()
        else this

