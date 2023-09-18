import { ThirdPartyProviders } from "@codestream/protocols/agent";

export interface ProvidersState extends ThirdPartyProviders {}

export enum ProvidersActionsType {
	Update = "UPDATE_PROVIDERS",
}
