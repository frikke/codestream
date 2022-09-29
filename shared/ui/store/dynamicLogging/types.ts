export enum DynamicLoggingActionsTypes {
	AddDynamicLogging = "ADD_DYNAMICLOGGING",
	ClearDynamicLogging = "CLEAR_DYNAMICLOGGING",
}

export type DynamicLoggingState = {
	dynamicLogs: {
		status?: string;
		metaData?: any[];
		results: any[];
	};
};
