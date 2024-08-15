package com.codestream.language;

import com.intellij.psi.tree.TokenSet;

public interface NrqlTokenSets {
    TokenSet COMMENTS = TokenSet.create(NrqlTypes.COMMENT);
    TokenSet STRING_LITERALS = TokenSet.create(NrqlTypes.SINGLE_QUOTED_STRING, NrqlTypes.DOUBLE_QUOTED_STRING);
}
