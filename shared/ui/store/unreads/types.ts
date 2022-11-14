import { Unreads } from "codestream-common/agent-protocol";

export interface UnreadsState extends Unreads {}

export enum UnreadsActionsType {
	Update = "@umis/Update",
	ResetLastReads = "@umis/ResetLastReads",
	ResetLastReadItems = "@umis/ResetLastReadItems",
}
