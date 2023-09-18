import { Dispatch, Middleware } from "redux";

export const logging: Middleware<any, any, Dispatch> = store => {
	return next => action => {
		const oldState = store.getState();
		const result = next(action);
		if (oldState.configs.debug) {
			console.groupCollapsed(action.type);
			console.debug(action);
			console.debug("old state", oldState);
			console.debug("new state", store.getState());
			console.groupEnd();
		}
		return result;
	};
};
