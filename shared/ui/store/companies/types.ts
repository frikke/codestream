import { CSCompany } from "codestream-common/api-protocol";

export interface CompaniesState {
	[id: string]: CSCompany;
}

export enum CompaniesActionsType {
	Bootstrap = "@companies/Bootstrap",
	Add = "ADD_COMPANIES",
	Update = "@companies/Update",
}
