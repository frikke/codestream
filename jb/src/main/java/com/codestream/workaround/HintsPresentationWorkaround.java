package com.codestream.workaround;

import com.intellij.codeInsight.hints.presentation.InlayTextMetricsStorage;
import com.intellij.codeInsight.hints.presentation.PresentationFactory;
import com.intellij.openapi.editor.impl.EditorImpl;

import java.lang.reflect.InvocationTargetException;

public class HintsPresentationWorkaround {

    public static PresentationFactory newPresentationFactory(EditorImpl editor) throws InvocationTargetException, InstantiationException, IllegalAccessException {
        try {
            return new PresentationFactory(editor);
        } catch (Throwable ignore) {
            return (PresentationFactory) PresentationFactory.class.getConstructors()[0].newInstance(editor);
        }
    }

    public static InlayTextMetricsStorage newTextMetricsStorage(EditorImpl editor) throws InvocationTargetException, InstantiationException, IllegalAccessException {
        try {
            return new InlayTextMetricsStorage(editor);
        } catch (Throwable ignore) {
            return (InlayTextMetricsStorage) InlayTextMetricsStorage.class.getConstructors()[0].newInstance(editor);
        }
    }

}
