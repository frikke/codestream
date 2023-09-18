export interface ConnectivityState {
	offline: boolean;
	error: undefined | { message: string; details?: string };
}

export enum ConnectivityActionsType {
	Online = "ONLINE",
	Offline = "OFFLINE",
	ErrorOccurred = "CONNECTIVITY_ERROR_OCCURRED",
	ErrorDismissed = "CONNECTIVITY_ERROR_DISMISSED",
}
