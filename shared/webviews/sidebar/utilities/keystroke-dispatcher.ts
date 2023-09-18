import { logWarning } from "../logger";

interface HandlerOptions {
	/**
	 * Provides an optional source name to see where this handler came from
	 */
	source?: string | undefined;
	/**
	 * level for which this handler runs, -1 or undefined will attach it to the current level
	 */
	level?: number | undefined;
}

interface Handler {
	/**
	 * Unique identifier for this handler
	 */
	id: number;
	/**
	 * the callback function
	 */
	fn: Function;
	/**
	 * additional options
	 */
	options: HandlerOptions;
}

class KeystrokeDispatcher {
	$root: Element | null;
	level: number = 0;
	// hash of keyboard keys (shortcuts) to callback handlers
	handlers: { [key: string]: Handler[] };

	constructor() {
		this.$root = document.querySelector("body.codestream");
		this.level = 0;
		this.handlers = {};
		if (this.$root) {
			this.$root.addEventListener("keydown", (e: any) => this._dispatch(e), { passive: true });
		}
	}

	private _dispatch(e: KeyboardEvent) {
		const handlers = this.handlers[e.key];
		if (!handlers || !handlers.length) return;

		// capture the handlers length
		// the callback could add another handler for this key
		const length = handlers.length;
		for (let i = 0; i < length; i++) {
			const handler = handlers[i];
			if (this.level === handler.options.level) {
				this.log(`handler src=${handler.options.source}`);
				if (handler.fn.call(this, e) === false) {
					this.log(`stopping dispatcher with src=${handler.options.source}`);
					break;
				}
			}
		}
	}

	/**
	 * increment the level and return a disposable function to decrement it
	 */
	withLevel() {
		this.level++;
		this.log(`withLevel=${this.level}`);
		return {
			dispose: () => {
				this.log(`reducing level=${this.level}...`);
				if (this.level > 0) {
					this.level--;
				}
				this.log(`done. level=${this.level}`);
			},
		};
	}

	/**
	 * increments the level
	 */
	levelUp() {
		this.level++;
		this.log(`levelUp=${this.level}`);
	}

	/**
	 * decrements the level
	 */
	levelDown() {
		if (this.level > 0) {
			this.level--;
		} else {
			this.level = 0;
		}
		this.log(`levelDown=${this.level}`);
	}

	/**
	 * Adds a keydown handler
	 *
	 * @param  {string} key the keyboard key name to listen on
	 * @param  {(KeyboardEvent)=>void} fn the callback function
	 * @param  {HandlerOptions={}} options
	 */
	onKeyDown(key: string, fn: (KeyboardEvent) => void, options: HandlerOptions = {}) {
		if (!key || !fn) {
			logWarning("key or fn is missing");
			return {
				dispose: () => {
					// noop
				},
			};
		}
		if (options.level === undefined) {
			options.level = 0;
		} else if (options.level === -1) {
			options.level = this.level;
		}
		this.log(`onKeyDown binding key=${key} options=${JSON.stringify(options)}`);
		if (this.$root) {
			if (!this.handlers[key]) {
				this.handlers[key] = [];
			}
			const id = new Date().getTime();
			this.handlers[key].push({
				id: id,
				fn: fn,
				options: options,
			});
			this.log(`onKeyDown handlers`, this.handlers);
			return {
				dispose: () => {
					// remove handlers for this scope
					this.handlers[key] = this.handlers[key].filter(_ => _ && _.id != id);
				},
			};
		}
		return {
			dispose: () => {
				// noop
			},
		};
	}

	log(...items: any[]) {
		// uncomment for debugging
		// console.log(`KD: ${this.level === 0 ? "" : '\t'.repeat(this.level)}`, ...items);
	}
}

const dispatcher = new KeystrokeDispatcher();

export default dispatcher;
