import {
	EntityAccount,
	GetEntityCountRequest,
	GetEntityCountResponse,
	NRErrorType,
	ObservabilityRepo,
} from "@codestream/protocols/agent";
import { CSMe } from "@codestream/protocols/api";

export interface INrqlClient {
	getProductUrl(): string;

	query<T = any>(query: string, variables: any): Promise<T>;

	errorTypeMapper(ex: Error): NRErrorType;

	getEntityCount(request?: GetEntityCountRequest): Promise<GetEntityCountResponse>;

	getRepoName(repoLike: { folder?: { name?: string; uri: string }; path: string }): string;

	runNrql<T>(accountId: number, nrql: string): Promise<T[]>;
	runNrql<T>(accountId: number, nrql: string, timeout: number): Promise<T[]>;

	isConnected(user: CSMe): boolean;

	getObservabilityEntityRepos(repoId: string): Promise<ObservabilityRepo | undefined>;
	getObservabilityEntityRepos(
		repoId: string,
		skipRepoFetch: boolean,
		force: boolean
	): Promise<ObservabilityRepo | undefined>;

	getGoldenSignalsEntity(codestreamUser: CSMe, observabilityRepo: ObservabilityRepo): EntityAccount;

	errorLogIfNotIgnored(ex: Error, message: string, ...params: any[]): void;
}
