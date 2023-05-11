package com.codestream.git

import com.codestream.agentService
import com.codestream.protocols.agent.GetFileContentsAtRevisionParams
import com.intellij.openapi.project.Project
import com.intellij.openapi.vcs.FilePath
import com.intellij.openapi.vcs.changes.ContentRevision
import com.intellij.openapi.vcs.history.VcsRevisionNumber
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import java.util.concurrent.CompletableFuture

class CSGitContentRevision(val project: Project, val filePath: FilePath, val revision: VcsRevisionNumber) :
    ContentRevision {

    override fun getContent(): String? {
        val contentFuture = CompletableFuture<String?>()

        GlobalScope.launch {
            val fileContents = project.agentService?.getFileContentsAtRevision(
                GetFileContentsAtRevisionParams(
                    null,
                    filePath.path,
                    revision.asString()
                )
            )
            contentFuture.complete(fileContents?.content)
        }

        return contentFuture.get()
    }

    override fun getFile(): FilePath {
        return filePath
    }

    override fun getRevisionNumber(): VcsRevisionNumber {
        return revision
    }

    override fun equals(other: Any?): Boolean {
        if (other is CSGitContentRevision) {
            return filePath == other.filePath && revision == other.revision
        }
        return false
    }

    override fun hashCode(): Int {
        return "$filePath@$revision".hashCode()
    }
}