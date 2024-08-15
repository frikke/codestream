// Use the Grammar-Kit plugin to generate the NrqlLexer class: Right click -> Run JFlex Generator.
// Choose codestream/jb as the output directory - the class will be generated under codestream/jb/src/main/gen.

package com.codestream.language;

import com.intellij.lexer.FlexLexer;
import com.intellij.psi.tree.IElementType;
import com.codestream.language.NrqlTypes;
import com.intellij.psi.TokenType;

%%

%class NrqlLexer
%implements FlexLexer
%unicode
%function advance
%type IElementType
%ignorecase

CRLF=\R
WHITE_SPACE=[ \n\t\f]
OPERATOR="="|"<"|">"|":="|"<="|">="|"and"|"or"|"is null"|"is not null"|"in"|"not in"|"like"|"not like"|"\+"|"-"|"\/"|"\*"
SINGLE_QUOTED_STRING='[^']*'
DOUBLE_QUOTED_STRING="[^\"\\n]*"
SINGLE_LINE_COMMENT="//"[^\n]*|"--"[^\n]*
MULTI_LINE_COMMENT="/\\*"[^*]*"\\*/"
PREPROCESSOR="###"
ATTRIBUTE_NAME=([a-zA-Z_][a-zA-Z_0-9]*)
NUMBER=[0-9]+

KEYWORDS=aggregate|ago|alter|asc|as|as of|compare with|day|days|delete from|desc|extrapolate|facet|field keys|from|hour|hours|include zero|insert into|join|limit|measurements|minute|minutes|month|months|of|order by|policies|retention|select|second|seconds|series|show databases|show tag keys|show tag values|since|timeseries|timestamp|until|update|using|values|week|weeks|where|with|with timezone

FUNCTIONS=average|beginningOfMonth|beginningOfWeek|beginningOfYear|compareWith|count|dateOf|endOfMonth|endOfWeek|endOfYear|facet|filter|histogram|monthOf|now|percentage|percentile|previousDay|previousMonth|previousWeek|previousYear|rate|since|stddev|sum|thisDay|thisMonth|thisWeek|thisYear|timeOfDay|timeSlice|timeWindow|uniqueCount|until|yearOf

%%

<YYINITIAL> {KEYWORDS}                                     { return NrqlTypes.KEYWORD; }
<YYINITIAL> {FUNCTIONS}                                    { return NrqlTypes.FUNCTION; }
<YYINITIAL> {OPERATOR}                                     { return NrqlTypes.OPERATOR; }
<YYINITIAL> {SINGLE_QUOTED_STRING}                         { return NrqlTypes.SINGLE_QUOTED_STRING; }
<YYINITIAL> {DOUBLE_QUOTED_STRING}                         { return NrqlTypes.DOUBLE_QUOTED_STRING; }
<YYINITIAL> {SINGLE_LINE_COMMENT}                          { return NrqlTypes.COMMENT; }
<YYINITIAL> {MULTI_LINE_COMMENT}                           { return NrqlTypes.COMMENT; }
<YYINITIAL> {PREPROCESSOR}                                 { return NrqlTypes.PREPROCESSOR; }
<YYINITIAL> {ATTRIBUTE_NAME}                               { return NrqlTypes.ATTRIBUTE_NAME; }
<YYINITIAL> {NUMBER}                                       { return NrqlTypes.NUMBER; }
<YYINITIAL> {WHITE_SPACE}+                                 { return TokenType.WHITE_SPACE; }
<YYINITIAL> .                                              { return TokenType.BAD_CHARACTER; }
