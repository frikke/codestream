import { CSUser } from "codestream-common/api-protocol";

export interface UsersState {
	[id: string]: CSUser;
}

export enum UsersActionsType {
	Bootstrap = "BOOTSTRAP_USERS",
	Update = "UPDATE_USER",
	Add = "ADD_USERS",
}
