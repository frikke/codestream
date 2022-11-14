import { Document } from "codestream-common/agent-protocol";

export interface DocumentsState {
	[uri: string]: Document;
}

export enum DocumentActionsType {
	Update = "@document/UpdateOne",
	Remove = "@document/RemoveOne",
}
