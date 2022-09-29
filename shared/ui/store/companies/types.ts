import { CSCompany } from "@codestream/protocols/api";

export interface CompaniesState {
	[id: string]: CSCompany;
}

export enum CompaniesActionsType {
	Bootstrap = "@companies/Bootstrap",
	Add = "ADD_COMPANIES",
	Update = "@companies/Update",
}
