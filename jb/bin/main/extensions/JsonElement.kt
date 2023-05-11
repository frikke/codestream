package com.codestream.extensions

import com.github.salomonbrys.kotson.set
import com.google.gson.JsonElement
import com.google.gson.JsonObject

fun JsonElement.merge(json: JsonObject): JsonElement {
    val out = deepCopy()
    for (entry in json.entrySet()) {
        out[entry.key] = entry.value
    }
    return out
}
