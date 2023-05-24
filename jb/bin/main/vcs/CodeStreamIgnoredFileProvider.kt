package com.codestream.vcs

import com.intellij.openapi.project.Project
import com.intellij.openapi.util.io.FileUtil
import com.intellij.openapi.vcs.FilePath
import com.intellij.openapi.vcs.changes.IgnoredBeanFactory
import com.intellij.openapi.vcs.changes.IgnoredFileProvider

private const val CODESTREAM_XML = ".idea/codestream.xml"

class CodeStreamIgnoredFileProvider : IgnoredFileProvider {
    override fun isIgnoredFile(project: Project, filePath: FilePath) =
        filePath.path == FileUtil.join(project.basePath, CODESTREAM_XML)

    override fun getIgnoredFiles(project: Project) =
        mutableSetOf(IgnoredBeanFactory.ignoreFile(FileUtil.join(project.basePath, CODESTREAM_XML), project))

    override fun getIgnoredGroupDescription() = "CodeStream ignored files"
}
