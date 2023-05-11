package com.codestream.system

import java.io.IOException
import java.net.URL
import java.net.URLConnection
import java.net.URLStreamHandler

object CodeStreamDiffURLStreamHandler {

    init {
        initUrlHandler()
    }

    private fun initUrlHandler() {
        // CS review diffs use codestream-diff schema. This registration
        // is necessary otherwise URL constructor will throw an exception.
        URL.setURLStreamHandlerFactory { protocol ->
            if (protocol in arrayOf("vcs", "codestream-diff")) object : URLStreamHandler() {
                @Throws(IOException::class)
                override fun openConnection(url: URL?): URLConnection? {
                    return object : URLConnection(url) {
                        @Throws(IOException::class)
                        override fun connect() {
                            println("Connected!")
                        }
                    }
                }
            } else null
        }
    }
}
