import React from "react";
import { render } from "react-dom";
import "@formatjs/intl-listformat/polyfill-locales";

export async function initialize(selector: string) {
	render(<h1>Hello Editor Webview!</h1>, document.querySelector(selector));
}
