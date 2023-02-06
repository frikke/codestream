"use strict";
import {
	FetchCompaniesRequest,
	FetchCompaniesRequestType,
	FetchCompaniesResponse,
} from "@codestream/protocols/agent";
import { CSCompany } from "@codestream/protocols/api";

import { lsp, lspHandler } from "../system";
import { CachedEntityManagerBase, Id } from "./entityManager";
import { CodeStreamSession } from "../session";

@lsp
export class CompaniesManager extends CachedEntityManagerBase<CSCompany> {
	constructor(private readonly session: CodeStreamSession) {
		super();
	}

	@lspHandler(FetchCompaniesRequestType)
	async get(request?: FetchCompaniesRequest): Promise<FetchCompaniesResponse> {
		let companies = await this.getAllCached();
		if (request != null) {
			if (request.companyIds != null && request.companyIds.length !== 0) {
				companies = companies.filter(t => request.companyIds!.includes(t.id));
			}
		}

		return { companies };
	}

	protected async loadCache() {
		const response = await this.session.api.fetchCompanies({ mine: true });
		const { companies, ...rest } = response;
		this.cache.reset(companies);
		this.cacheResponse(rest);
	}

	protected async fetchById(companyId: Id): Promise<CSCompany> {
		const response = await this.session.api.getCompany({ companyId });
		return response.company;
	}

	protected getEntityName(): string {
		return "Company";
	}
}
