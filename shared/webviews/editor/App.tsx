import React from "react";
import { useState } from "react";
import { render } from "react-dom";
import "@formatjs/intl-listformat/polyfill-locales";

import { DidChangeDataNotificationType } from "@codestream/protocols/agent";
import { HostApi } from "editor-api";
export function App({}) {
	const [foo, setFoo] = React.useState("");
	const api = HostApi.locator();
	api.on(DidChangeDataNotificationType, ({ type, data }) => {
		console.log(type, data);
		setFoo(type + " " + JSON.stringify(data) + " " + new Date().getTime());
	});

	return <h1>Hello Editor Webview! {foo}</h1>;
}
