package com.codestream.agent

import com.codestream.agentService
import com.codestream.extensions.uri
import com.codestream.extensions.workspaceFolders
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.module.Module
import com.intellij.openapi.module.impl.scopes.ModuleWithDependenciesScope
import com.intellij.openapi.project.ModuleListener
import com.intellij.openapi.project.Project
import com.intellij.openapi.project.rootManager
import org.eclipse.lsp4j.DidChangeWorkspaceFoldersParams
import org.eclipse.lsp4j.WorkspaceFolder
import org.eclipse.lsp4j.WorkspaceFoldersChangeEvent

class ModuleListenerImpl(project: Project) : ModuleListener {

    private val logger = Logger.getInstance(ModuleListenerImpl::class.java)

    override fun moduleAdded(project: Project, module: Module) {
        if (module.isDisposed || project.isDisposed) return
        val existingFolders = project.workspaceFolders
        val folders = module.rootManager.contentRoots
            .filter { it.isDirectory && it.uri != null }
            .map { WorkspaceFolder(it.uri) }
            .filter { !existingFolders.contains(it) }
        if (folders.isEmpty()) return

        logger.info("Workspace folders added: ${folders.joinToString()}")
        project.agentService?.let {
            it.onDidStart {
                it.agent.workspaceService.didChangeWorkspaceFolders(
                    DidChangeWorkspaceFoldersParams(
                        WorkspaceFoldersChangeEvent(
                            folders.toMutableList(),
                            mutableListOf()
                        )
                    )
                )

            }
        }
    }

    override fun moduleRemoved(project: Project, module: Module) {
        if (module.isDisposed || project.isDisposed) return
        val folders = module.rootManager.contentRoots
            .filter { it.isDirectory && it.uri != null }
            .map { WorkspaceFolder(it.uri) }

        logger.info("Workspace folders removed: ${folders.joinToString()}")
        project.agentService?.let {
            it.onDidStart {
                it.agent.workspaceService.didChangeWorkspaceFolders(
                    DidChangeWorkspaceFoldersParams(
                        WorkspaceFoldersChangeEvent(
                            mutableListOf(),
                            folders.toMutableList()
                        )
                    )
                )
            }
        }
    }
}
