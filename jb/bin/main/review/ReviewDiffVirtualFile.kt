package com.codestream.review

import com.intellij.openapi.fileTypes.FileType
import com.intellij.openapi.fileTypes.FileTypeManager
import com.intellij.openapi.vfs.VirtualFileSystem
import com.intellij.testFramework.LightVirtualFile

class ReviewDiffVirtualFile : LightVirtualFile {
    private val myFullPath: String
    private val mySide: ReviewDiffSide
    private val myCanCreateMarker: Boolean

    private constructor(fullPath: String, side: ReviewDiffSide, path: String, fileType: FileType, content: String, canCreateMarker: Boolean) : super(path, fileType, content) {
        myFullPath = fullPath
        mySide = side
        myCanCreateMarker = canCreateMarker
    }

    companion object {
        fun create(fullPath: String, side: ReviewDiffSide, path: String, content: String, fileType: FileType, canCreateMarker: Boolean): ReviewDiffVirtualFile {
            return ReviewDiffVirtualFile(fullPath, side, path, fileType, content, canCreateMarker)
        }
    }

    val side: ReviewDiffSide get() = mySide

    val canCreateMarker: Boolean get() = myCanCreateMarker

    override fun getFileSystem(): VirtualFileSystem {
        return ReviewDiffFileSystem
    }

    override fun getPath(): String {
        return myFullPath
    }

    override fun toString(): String {
        return "ReviewDiffVirtualFile: $name"
    }
}
