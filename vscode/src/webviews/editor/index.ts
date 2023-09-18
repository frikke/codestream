"use strict";
import { initialize } from "@codestream/editor/index";
import { initializeColorPalette } from "./theme";

declare function acquireVsCodeApi();

const api = acquireVsCodeApi();

function getLocalStorage() {
	const state = api.getState() || { localStorage: {} };
	return state.localStorage;
}
Object.defineProperty(window, "codestreamInitialized", {
	value: true
});

// LocalStorage polyfill
Object.defineProperty(window, "localStorage", {
	value: {
		setItem(key: string, value: string) {
			const localStorage = getLocalStorage();
			api.setState({ localStorage: { ...localStorage, [key]: value } });
		},
		getItem(key: string) {
			return getLocalStorage()[key];
		},
		removeItem(key: string) {
			const localStorage = getLocalStorage();
			delete localStorage[key];
			api.setState({ localStorage: localStorage });
		}
	}
});

initializeColorPalette();

initialize("#app");
