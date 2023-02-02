import { Entity, GetFileLevelTelemetryResponse, NRErrorType } from "@codestream/protocols/agent";

export abstract class CodedError extends Error {
	abstract code: NRErrorType;
}

export class GraphqlNrqlError extends CodedError {
	errors: Array<GraphqlNrqlErrorItem>;
	code: NRErrorType = "NR_GENERIC";

	constructor(errors: Array<GraphqlNrqlErrorItem>, message?: string) {
		super(message);
		this.errors = errors;
	}
}

export class GraphqlNrqlTimeoutError extends GraphqlNrqlError {
	code: NRErrorType = "NR_TIMEOUT";
}

export function isGraphqlNrqlError(error: unknown): error is GraphqlNrqlErrorResponse {
	const err = error as GraphqlNrqlErrorResponse;
	return err?.errors && err?.errors?.length > 0 && !!err?.errors[0]?.extensions?.errorClass;
}

export function isGetFileLevelTelemetryResponse(obj: any): obj is GetFileLevelTelemetryResponse {
	return (
		Object.prototype.hasOwnProperty.call(obj, "repo") &&
		Object.prototype.hasOwnProperty.call(obj, "isConnected") &&
		Object.prototype.hasOwnProperty.call(obj, "relativeFilePath")
	);
}

export interface GraphqlNrqlErrorItem {
	extensions?: {
		errorClass: string;
		nrOnly: object;
	};
	locations?: Array<{
		column: number;
		line: number;
	}>;
	message?: string;
	path: Array<string>;
}

export interface GraphqlNrqlErrorResponse {
	errors: Array<GraphqlNrqlErrorItem>;
}

export interface RepoEntitiesByRemotesResponse {
	entities?: Entity[];
	remotes?: string[];
}

export type ClmSpanData = {
	name: string;
	"code.function": string;
	"entity.guid": string;
};

export function isClmSpanData(obj: unknown): obj is ClmSpanData {
	if (obj === null || obj === undefined) {
		return false;
	}
	return (
		Object.prototype.hasOwnProperty.call(obj, "name") &&
		Object.prototype.hasOwnProperty.call(obj, "code.function") &&
		Object.prototype.hasOwnProperty.call(obj, "entity.guid")
	);
}
