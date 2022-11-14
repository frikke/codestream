import { Emitter, Event } from "vscode-languageserver";
import { CSMePreferences } from "codestream-common/api-protocol";

export class CodeStreamPreferences {
	private _onDidChange = new Emitter<CSMePreferences>();
	get onDidChange(): Event<CSMePreferences> {
		return this._onDidChange.event;
	}

	constructor(private _preferences: CSMePreferences = {}) {}

	update(preferences: CSMePreferences) {
		this._preferences = preferences;
		this._onDidChange.fire(preferences);
	}

	get() {
		return this._preferences;
	}
}
