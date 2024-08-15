package com.codestream.settings;

import com.intellij.openapi.ui.ComboBox;
import com.intellij.ui.EnumComboBoxModel;

import javax.swing.*;

public class CodeStreamConfigurableGUI {
    private JPanel rootPanel;
    private JCheckBox autoSignIn;
    private JTextField serverUrl;
    private JCheckBox disableStrictSSL;
    private JTextField extraCerts;
    private JComboBox<ProxySupport> proxySupport;
    private JCheckBox proxyStrictSSL;
    private JCheckBox jcef;
    private JCheckBox showGoldenSignalsInEditor;
    private JTextField goldenSignalsInEditorFormat;

    public JPanel getRootPanel() {
        return rootPanel;
    }

    public JCheckBox getAutoSignIn() {
        return autoSignIn;
    }

    public JTextField getServerUrl() {
        return serverUrl;
    }

    public JCheckBox getDisableStrictSSL() {
        return disableStrictSSL;
    }

    public JComboBox<ProxySupport> getProxySupport() {
        return proxySupport;
    }

    public JCheckBox getProxyStrictSSL() {
        return proxyStrictSSL;
    }

    public JTextField getExtraCerts() {
        return extraCerts;
    }

    public JCheckBox getJcef() {
        return jcef;
    }

    public JCheckBox getShowGoldenSignalsInEditor() {
        return showGoldenSignalsInEditor;
    }

    public JTextField getGoldenSignalsInEditorFormat() {
        return goldenSignalsInEditorFormat;
    }

    private void createUIComponents() {
        proxySupport = new ComboBox(new EnumComboBoxModel(ProxySupport.class));
    }
}
