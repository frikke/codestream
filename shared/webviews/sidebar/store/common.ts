import {
	ConnectionStatus,
	DidChangeConnectionStatusNotificationType,
} from "@codestream/protocols/agent";

import { errorDismissed, errorOccurred } from "@codestream/sidebar/store/connectivity/actions";
import { Disposable } from "@codestream/sidebar/utils";
import { HostApi } from "@codestream/sidebar/sidebar-api";

export type StringType = string;

export type PayloadMetaAction<T extends StringType, P, M> = P extends void
	? M extends void
		? { type: T }
		: { type: T; meta: M }
	: M extends void
	? { type: T; payload: P }
	: { type: T; payload: P; meta: M };

export type ActionCreator<T extends StringType = StringType> = (...args: any[]) => Action<T>;

export type ThunkedActionCreator<T extends StringType = StringType> = (
	...args: any[]
) => AsyncActionCreator<T>;

export interface AsyncActionCreator<T> {
	(dispatch: Dispatch, ...args: any[]): Promise<Action<T> | void>;
}

type ActionCreatorMap<T> = { [K in keyof T]: ActionType<T[K]> };

export type ActionType<ActionCreatorOrMap> = ActionCreatorOrMap extends ActionCreator
	? ReturnType<ActionCreatorOrMap>
	: ActionCreatorOrMap extends object
	? ActionCreatorMap<ActionCreatorOrMap>[keyof ActionCreatorOrMap]
	: never;

export function action<T extends StringType, P = undefined, M = undefined>(
	type: T,
	payload?: P,
	meta?: M
): PayloadMetaAction<T, P, M> {
	return { type, payload, meta } as any;
}

export interface Action<T> {
	type: T;
	[key: string]: any;
}

type DispatchReturn<ActionOrAsyncCreator extends any> = ActionOrAsyncCreator extends Action<any>
	? ActionOrAsyncCreator
	: ActionOrAsyncCreator extends AsyncActionCreator<any>
	? ReturnType<ActionOrAsyncCreator>
	: never;

export interface Dispatch {
	<A extends Action<any> | AsyncActionCreator<any>>(actionOrAsyncCreator: A): DispatchReturn<A>;
}

export interface DispatchProp {
	dispatch: Dispatch;
}

export function withExponentialConnectionRetry<T extends object>(
	dispatch,
	fn: () => Promise<T>,
	fnName: string = "function"
): Promise<T> {
	const api = HostApi.sidebarInstance;
	return new Promise<T>(resolve => {
		const delays = [5000, 10000, 30000, 60000, 10 * 60000];
		let disposable: Disposable | undefined;
		let timeoutId;
		async function execute() {
			try {
				disposable?.dispose();
				timeoutId && clearTimeout(timeoutId);
				const result = await fn();
				dispatch(errorDismissed());
				resolve(result);
			} catch (ex) {
				dispatch(errorOccurred(ex.message));
				console.error(ex.message);
				const delay = delays.shift() || 30 * 60000;
				console.log(`Retrying ${fnName} in ${delay}ms`);
				timeoutId = setTimeout(execute, delay);
				disposable = api.on(DidChangeConnectionStatusNotificationType, e => {
					if (e.status === ConnectionStatus.Reconnected) {
						console.log(`Retrying ${fnName} now - reconnection detected`);
						execute();
					}
				});
			}
		}
		void execute();
	});
}

// TODO fix
// On full build this error is thrown by lsp. On esbuild dev mode it is not, hence this workaround
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throwIfError(response: any) {
	if (response?.exception?.responseError?.message) {
		throw response.exception.responseError;
	}
}
