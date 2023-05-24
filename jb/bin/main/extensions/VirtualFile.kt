package com.codestream.extensions

import com.codestream.system.replaceReservedUriCharacters
import com.codestream.system.sanitizeURI
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.vfs.VirtualFile
import java.net.URL

private val logger = Logger.getInstance(VirtualFile::class.java)

val VirtualFile.uri: String?
    get() {
        val isCsDiff = url.startsWith("codestream-diff://")
        val workingUrl = if (isCsDiff) url.replace(Regex("""^codestream-diff://"""), "file://") else url
        return try {
            val uriStrEncoded = workingUrl.replaceReservedUriCharacters()
            val uriStr = try {
                URL(uriStrEncoded).toURI().toString()
            } catch (e: Exception) {
                uriStrEncoded
            }
            val finalUrl = if (isCsDiff) uriStr.replace(Regex("""^file://"""), "codestream-diff://") else uriStr
            sanitizeURI(finalUrl)
        } catch (e: Exception) {
            logger.warn("Error in VirtualFile.uri", e)
            null
        }
    }
