// This is a generated file. Not intended for manual editing.
package com.codestream.language;

import com.intellij.psi.tree.IElementType;
import com.intellij.psi.PsiElement;
import com.intellij.lang.ASTNode;
import com.codestream.language.psi.NrqlElementType;
import com.codestream.language.psi.NrqlTokenType;
import com.codestream.language.psi.impl.*;

public interface NrqlTypes {

  IElementType ITEM = new NrqlElementType("ITEM");

  IElementType ATTRIBUTE_NAME = new NrqlTokenType("ATTRIBUTE_NAME");
  IElementType COMMENT = new NrqlTokenType("COMMENT");
  IElementType DOUBLE_QUOTED_STRING = new NrqlTokenType("DOUBLE_QUOTED_STRING");
  IElementType FUNCTION = new NrqlTokenType("FUNCTION");
  IElementType KEYWORD = new NrqlTokenType("KEYWORD");
  IElementType NUMBER = new NrqlTokenType("NUMBER");
  IElementType OPERATOR = new NrqlTokenType("OPERATOR");
  IElementType PREPROCESSOR = new NrqlTokenType("PREPROCESSOR");
  IElementType SINGLE_QUOTED_STRING = new NrqlTokenType("SINGLE_QUOTED_STRING");

  class Factory {
    public static PsiElement createElement(ASTNode node) {
      IElementType type = node.getElementType();
      if (type == ITEM) {
        return new NrqlItemImpl(node);
      }
      throw new AssertionError("Unknown element type: " + type);
    }
  }
}
