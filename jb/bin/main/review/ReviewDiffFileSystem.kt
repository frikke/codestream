package com.codestream.review

import com.intellij.openapi.vfs.DeprecatedVirtualFileSystem
import com.intellij.openapi.vfs.VirtualFile

object ReviewDiffFileSystem : DeprecatedVirtualFileSystem() {
    override fun getProtocol(): String = "codestream-diff"

    override fun findFileByPath(path: String): VirtualFile? = null

    override fun refreshAndFindFileByPath(path: String): VirtualFile? = null

    override fun refresh(asynchronous: Boolean) { }
}
