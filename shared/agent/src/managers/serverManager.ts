import * as qs from "querystring";
import { ParsedUrlQueryInput } from "querystring";

import {
	CodeStreamApiDeleteRequestType,
	CodeStreamApiGetRequestType,
	CodeStreamApiPostRequestType,
	CodeStreamApiPutRequestType,
} from "@codestream/protocols/agent";

import { Logger } from "../logger";
import { lsp, lspHandler } from "../system";
import { ApiClient } from "../api/codestream/api/apiClient";

@lsp
export class ServerManager {
	constructor(private apiClient: ApiClient) {}

	public static inject = ["apiClient"] as const;

	@lspHandler(CodeStreamApiGetRequestType)
	async get(request: { url: string; queryData: ParsedUrlQueryInput }): Promise<any> {
		try {
			if (request.queryData) {
				request.url += `?${qs.stringify(request.queryData)}`;
			}
			return this.apiClient.get(request.url);
		} catch (e) {
			Logger.error(e, "Could not GET", {
				url: request.url,
			});
		}
	}

	@lspHandler(CodeStreamApiPostRequestType)
	async post(request: { url: string; body?: any }): Promise<any> {
		try {
			return this.apiClient.post(request.url, request.body);
		} catch (e) {
			Logger.error(e, "Could not POST", {
				url: request.url,
			});
		}
	}

	@lspHandler(CodeStreamApiPutRequestType)
	async put(request: { url: string; body?: any }): Promise<any> {
		try {
			return this.apiClient.put(request.url, request.body);
		} catch (e) {
			Logger.error(e, "Could not PUT", {
				url: request.url,
			});
		}
	}

	@lspHandler(CodeStreamApiDeleteRequestType)
	async delete(request: { url: string }): Promise<any> {
		try {
			return this.apiClient.delete(request.url);
		} catch (e) {
			Logger.error(e, "Could not DELETE", {
				url: request.url,
			});
		}
	}
}
