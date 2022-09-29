"use strict";

export interface Disposable {
	dispose(): void;
}

export namespace Disposables {
	export function from(...disposables: { dispose(): any }[]): Disposable {
		return {
			dispose: function () {
				if (disposables) {
					for (const disposable of disposables) {
						if (disposable && typeof disposable.dispose === "function") {
							disposable.dispose();
						}
					}
					disposables = undefined!;
				}
			},
		};
	}
}
