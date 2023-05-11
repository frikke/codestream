package com.codestream

import com.codestream.extensions.isTruthy
import com.google.gson.Gson
import javax.swing.JTextArea

val gson = Gson()
val DEBUG =
    java.lang.management.ManagementFactory.getRuntimeMXBean().inputArguments.toString().contains("-agentlib:jdwp")
        || System.getProperty("com.codestream.debug")?.equals("true") ?: false
val WEBVIEW_PATH: String? = System.getProperty("com.codestream.webview")
val AGENT_PATH: String? = System.getProperty("com.codestream.agent")
val RECORD_REQUESTS = System.getProperty("com.codestream.recordRequests")?.equals("true") ?: false
val ENV_DISABLE_JCEF = System.getenv("CODESTREAM_DISABLE_JCEF").isTruthy
