import { Emitter, Event } from "vscode-languageserver";
import { log } from "../../system/decorators/log";

class CacheReset {
	private _onDidRequestReset = new Emitter<void>();
	get onDidRequestReset(): Event<void> {
		return this._onDidRequestReset.event;
	}

	@log()
	reset() {
		this._onDidRequestReset.fire(undefined);
	}
}

const cacheReset = new CacheReset();
export default cacheReset;
