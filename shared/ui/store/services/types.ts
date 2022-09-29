export enum ServicesActionsType {
	Bootstrap = "BOOTSTRAP_SERVICES",
}

export interface ServicesState {
	[name: string]: boolean;
}
