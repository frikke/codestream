import React from "react";
import { render } from "react-dom";
import "@formatjs/intl-listformat/polyfill-locales";

export function setupCommunication(host: { postMessage: (message: any) => void }) {
	Object.defineProperty(window, "acquireCodestreamHostForEditor", {
		value() {
			return host;
		},
	});
}
export async function initialize(selector: string) {
	render(<h1>Hello Editor Webview!</h1>, document.querySelector(selector));
}
