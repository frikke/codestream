package com.codestream.extensions

import com.codestream.system.HASH_ENCODED
import com.codestream.system.SPACE_ENCODED
import com.codestream.system.sanitizeURI
import com.intellij.openapi.vfs.VirtualFile
import java.net.URL

val VirtualFile.uri: String?
    get() {
        return try {
            sanitizeURI(
                URL(
                    url
                        .replace(" ", SPACE_ENCODED)
                        .replace("#", HASH_ENCODED)
                ).toURI().toString()
            )
        } catch (e: Exception) {
            // LOG.warn(e)
            null
        }
    }
