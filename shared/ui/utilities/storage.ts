function polyfillLocalStorage() {
	const _localStorage = {};
	// not all methods are implemented, just enough for now
	Object.defineProperty(window, "localStorage", {
		value: {
			setItem(key: string, value: string) {
				_localStorage[key] = value;
			},
			getItem(key: string) {
				return _localStorage[key];
			},
			removeItem(key: string) {
				delete _localStorage[key];
			},
		},
	});
}

class LocalStore {
	set(key: string, value: any) {
		localStorage.setItem(key, JSON.stringify(value));
	}

	get(key: string) {
		const item = localStorage.getItem(key);
		if (item == undefined) {
			return undefined;
		}

		return JSON.parse(item);
	}

	delete(key: string) {
		localStorage.removeItem(key);
	}
}

try {
	window.localStorage.getItem("test");
} catch (error) {
	if (error.message.includes("Failed to read the 'localStorage' property from 'Window'")) {
		polyfillLocalStorage();
	}
}

export const localStore = new LocalStore();
