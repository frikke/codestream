import { Document } from "@codestream/protocols/agent";

export interface DocumentsState {
	[uri: string]: Document;
}

export enum DocumentActionsType {
	Update = "@document/UpdateOne",
	Remove = "@document/RemoveOne",
}
