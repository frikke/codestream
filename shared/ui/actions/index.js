export const updateConfigs = configs => ({ type: "UPDATE_CONFIGS", payload: configs });

export const updateUnreads = unreads => ({ type: "UPDATE_UNREADS", payload: unreads });

export const reset = () => ({ type: "RESET" });

export const bootstrap = (data = {}) => async dispatch => {
	dispatch({ type: "BOOTSTRAP_USERS", payload: data.users || [] });
	dispatch({ type: "BOOTSTRAP_TEAMS", payload: data.teams || [] });
	dispatch({ type: "BOOTSTRAP_STREAMS", payload: data.streams || [] });
	dispatch({ type: "BOOTSTRAP_REPOS", payload: data.repos || [] });
	dispatch({ type: "BOOTSTRAP_COMPLETE" });
};
