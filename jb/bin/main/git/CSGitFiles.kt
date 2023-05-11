package com.codestream.git

import com.intellij.openapi.project.Project
import com.intellij.openapi.vcs.RemoteFilePath
import com.intellij.openapi.vcs.vfs.ContentRevisionVirtualFile
import com.intellij.openapi.vfs.VirtualFile
import com.jetbrains.rd.util.getOrCreate
import git4idea.GitRevisionNumber
import java.net.URI

private val files = mutableMapOf<CSGitContentRevision, VirtualFile>()

fun getCSGitFile(uriString: String, sha: String, project: Project): VirtualFile {
    val path = URI.create(uriString).path
    val filePath = RemoteFilePath(path, false)
    val revisionNumber = GitRevisionNumber(sha)
    val revision = CSGitContentRevision(project, filePath, revisionNumber)

    return files.getOrCreate(revision) { ContentRevisionVirtualFile.create(it) }
}