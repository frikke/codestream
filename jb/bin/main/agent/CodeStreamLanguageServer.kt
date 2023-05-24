package com.codestream.agent

import com.codestream.protocols.agent.LoginResult
import com.codestream.protocols.agent.LoginWithTokenParams
import com.codestream.protocols.agent.TelemetryParams
import com.codestream.protocols.agent.TelemetryResult
import com.codestream.protocols.agent.TextDocumentFromKeyParams
import com.codestream.protocols.agent.TextDocumentFromKeyResult
import org.eclipse.lsp4j.jsonrpc.services.JsonRequest
import org.eclipse.lsp4j.services.LanguageServer
import java.util.concurrent.CompletableFuture

interface CodeStreamLanguageServer : LanguageServer {

    @JsonRequest("codestream/login/token")
    fun loginToken(params: LoginWithTokenParams): CompletableFuture<LoginResult>

    @JsonRequest("codestream/textDocument/fromKey")
    fun textDocumentFromKey(params: TextDocumentFromKeyParams): CompletableFuture<TextDocumentFromKeyResult>

    @JsonRequest("codestream/telemetry")
    fun telemetry(params: TelemetryParams): CompletableFuture<TelemetryResult>
}
