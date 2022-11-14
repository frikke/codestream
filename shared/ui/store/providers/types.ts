import { ThirdPartyProviders } from "codestream-common/agent-protocol";

export interface ProvidersState extends ThirdPartyProviders {}

export enum ProvidersActionsType {
	Update = "UPDATE_PROVIDERS",
}
