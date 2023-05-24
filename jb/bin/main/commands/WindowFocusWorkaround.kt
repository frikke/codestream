package com.codestream.commands

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.openapi.diagnostic.Logger
import java.lang.management.ManagementFactory
import java.util.Scanner
import java.util.concurrent.TimeUnit

object WindowFocusWorkaround {
    private val logger = Logger.getInstance(
        WindowFocusWorkaround::class.java
    )

    fun bringToFront(): Boolean {
        try {
            val osName = System.getProperty("os.name").toLowerCase()
            val isMacOs = osName.startsWith("mac os x")
            if (!isMacOs) {
                logger.debug(
                    String.format(
                        "bringToFront not attempting, os=%s is not 'mac os x'",
                        osName
                    )
                )
                return false
            }
            val pid = ManagementFactory.getRuntimeMXBean().name.split("@")[0]
            logger.info(String.format("bringToFront beginning with pid=%s", pid))

            try {
               val process = GeneralCommandLine(
                    "osascript",
                    "-e",
                        "tell application \"System Events\"",
                    "-e",
                        "set frontmost of every process whose unix id is $pid to true",
                    "-e",
                        "end tell"
                ).createProcess()
                captureErrorStream(process)
                captureExitCode(process)
                logger.info(String.format("bringToFront completed with pid=%s", pid))
                return true
            } catch (e: Exception) {
                logger.warn(String.format("bringToFront failed with pid=%s", pid))
                logger.warn(e)
            }
        } catch (e: Exception) {
            logger.warn("bringToFront failed")
            logger.warn(e)
        }
        return false
    }

    private fun captureErrorStream(process: Process) {
        Thread(Runnable {
            val sc = Scanner(process.errorStream)
            while (sc.hasNextLine()) {
                val nextLine = sc.nextLine()
                logger.warn(nextLine)
            }
        }).start()
    }

    private fun captureExitCode(process: Process) {
        Thread(Runnable {
            val code = process.waitFor(5000, TimeUnit.MILLISECONDS)
            logger.info("bringToFront terminated with exit code $code")
        }).start()
    }
}