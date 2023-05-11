package com.codestream.editor

import com.google.gson.JsonElement
import javax.swing.Icon

abstract class InlineTextFieldMentionableUser(
    val username: String
)

class InlineTextFieldMentionableCSUser(
    val id: String,
    username: String,
    val fullName: String?
) : InlineTextFieldMentionableUser(username)

class InlineTextFieldMentionableProviderUser(
    val id: Int,
    username: String,
    val icon: Icon?
) : InlineTextFieldMentionableUser(username)
