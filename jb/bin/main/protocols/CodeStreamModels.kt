package com.codestream.protocols

import com.google.gson.annotations.SerializedName

enum class CodemarkType {
    @SerializedName("comment")
    COMMENT,
    @SerializedName("issue")
    ISSUE,
    @SerializedName("link")
    LINK
}
