package com.codestream.review

import com.codestream.gson
import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.intellij.util.Base64
import java.nio.charset.Charset

class CodeStreamDiffUriData(
    val path: String,
    val repoId: String,
    val baseBranch: String,
    val headBranch: String,
    val leftSha: String,
    val rightSha: String,
    val side: String,
    val context: CodeStreamDiffUriContext?
) {
    fun toEncodedPath(): String {
        val byteArray = gson.toJson(this).toByteArray(utf8)
        return "-0-/${Base64.encode(byteArray)}/-0-/$path"
    }
}

class CodeStreamDiffUriContext(
    val pullRequest: CodeStreamDiffUriPullRequest
)

class CodeStreamDiffUriPullRequest(
    val providerId: String,
    val id: String,
    val collaborators: List<CodeStreamDiffUriPullRequestCollaborator>
)

class CodeStreamDiffUriPullRequestCollaborator(
    val id: Int,
    val username: String,
    val avatar: CodeStreamDiffUriPullRequestCollaboratorAvatar
)
class CodeStreamDiffUriPullRequestCollaboratorAvatar(
    val image: String?
)

private val utf8 = Charset.forName("UTF-8")
