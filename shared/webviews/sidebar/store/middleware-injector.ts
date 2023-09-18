import { Middleware } from "redux";
import { Disposable } from "../utils";

/**
 * This class is a hack.
 * Its purpose is to provide a mechanism to create and apply redux middleware at will.
 * The specific problem that inspired this is the codemark form in spatial view. See it's usage in InlineCodemarks.tsx
 */
class MiddlewareInjector {
	private middleware = new Map<string, Set<Function>>();

	// Create the root middleware that is used during creation of the redux store
	createMiddleware() {
		const middleware: Middleware = _store => {
			return next => action => {
				let result = action;

				try {
					const injectedMiddleware = this.middleware.get(action.type);

					if (injectedMiddleware != undefined && injectedMiddleware.size > 0) {
						result.payload = [...injectedMiddleware.keys()].reduce(
							(payload, transform) => transform(payload),
							action.payload
						);
					}
				} catch (error) {}

				return next(result);
			};
		};

		return middleware;
	}

	/**
	 * @param type The action type to observe for
	 * @param fn The callback that will receive the payload of the action. It must return a payload
	 * @return A disposable that will remove the middleware when disposed
	 */
	inject(type: string, fn: (payload: any) => any): Disposable {
		const middlewareForType = this.middleware.has(type)
			? this.middleware.get(type)
			: this.middleware.set(type, new Set()).get(type);

		middlewareForType!.add(fn);

		return {
			dispose: () => {
				middlewareForType!.delete(fn);
			},
		};
	}
}

export const middlewareInjector = new MiddlewareInjector();
