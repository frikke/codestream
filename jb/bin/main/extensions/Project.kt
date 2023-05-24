package com.codestream.extensions

import com.codestream.system.CLOSE_SQUARE_BRACKET_ENCODED
import com.codestream.system.HASH_ENCODED
import com.codestream.system.OPEN_SQUARE_BRACKET_ENCODED
import com.codestream.system.SPACE_ENCODED
import com.codestream.system.replaceReservedUriCharacters
import com.codestream.system.sanitizeURI
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.module.ModuleManager
import com.intellij.openapi.module.impl.scopes.ModuleWithDependenciesScope
import com.intellij.openapi.project.Project
import com.intellij.openapi.project.rootManager
import com.intellij.openapi.vfs.VirtualFile
import org.eclipse.lsp4j.WorkspaceFolder
import java.io.File
import java.net.URL

private val logger = Logger.getInstance(Project::class.java)

val Project.workspaceFolders: Set<WorkspaceFolder>
    get() {
        var folders = mutableSetOf(baseWorkspaceFolder)
        val moduleManager = ModuleManager.getInstance(this)
        for (module in moduleManager.modules) {
            val moduleFolders = module.rootManager.contentRoots
                .filter { it.isDirectory && it.uri != null }
                .map { WorkspaceFolder(it.uri) }
            folders.addAll(moduleFolders)
        }
        return folders
    }

val Project.baseWorkspaceFolder: WorkspaceFolder
    get() {
        return WorkspaceFolder(baseUri)
    }

val Project.baseUri: String?
    get() {
        return try {
            val url = "file://" + File(basePath).canonicalPath
            sanitizeURI(
                URL(
                    url.replaceReservedUriCharacters()
                ).toURI().toString()
            )
        } catch (e: Exception) {
            logger.warn(e)
            null
        }
    }

val Project.projectPaths: Set<String>
    get() {
        var paths = basePath?.let { mutableSetOf(it) } ?: mutableSetOf()
        val moduleManager = ModuleManager.getInstance(this)
        for (module in moduleManager.modules) {
            val roots = (module.moduleContentScope as? ModuleWithDependenciesScope)?.roots ?: continue
            val modulePaths = roots.map { it.path }
            paths.addAll(modulePaths)
        }
        return paths
    }
