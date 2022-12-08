package com.codestream.clm

import com.intellij.openapi.project.Project

class CLMService(val project: Project) {

    private val _languageComponents = mutableListOf<CLMLanguageComponent<*>>()

    fun registerLanguageComponent(component: CLMLanguageComponent<*>) {
        _languageComponents.add(component)
    }

    fun filterNamespaces(namespaces: List<String>): List<String> {
        val filteredNamespaces = mutableListOf<String>()
        _languageComponents.forEach {
            filteredNamespaces.addAll(it.filterNamespaces(namespaces))
        }
        return filteredNamespaces
    }
}
