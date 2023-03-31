import { isEmpty, memoize } from "lodash";
import fetch, { Request, RequestInfo, RequestInit, Response } from "node-fetch";
import { Logger } from "../logger";
import { Functions } from "./function";
import { handleLimit, InternalRateError } from "../rateLimits";
import os from "os";
import path from "path";
import fs from "fs";
import httpCachedBase from "./staging-api.newrelic.com.json";
import stringSimilarity from "string-similarity";

const RECORD_MODE = false;
const CACHE_MODE = true;

const noLogRetries = ["reason: connect ECONNREFUSED", "reason: getaddrinfo ENOTFOUND"];

function shouldLogRetry(errorMsg: string): boolean {
	const result = noLogRetries.find(e => e.includes(errorMsg));
	return !result;
}

const codeStreamDirectory = path.join(os.homedir(), ".codestream");
const exportDir = path.join(codeStreamDirectory, "export");

export type RequestHistory = {
	timestamp: string;
	url: string;
	method: string;
	requestBody?: string;
	response: string;
};

const requestMap = new Map<string, RequestHistory[]>();

async function recordRequestResponse(
	requestInfo: RequestInfo,
	response: Response,
	init?: RequestInit
) {
	// const responseBody = await getTextFromStream(response.body);
	const cloned = response.clone();
	const responseBody = await cloned.text();

	const urlString =
		typeof requestInfo === "string"
			? requestInfo
			: requestInfo instanceof Request
			? requestInfo.url
			: requestInfo.href;
	const key = requestInfoToUrl(requestInfo)?.host ?? "<unknown>";
	const requestHist: RequestHistory = {
		timestamp: new Date().toISOString(),
		url: urlString,
		method: init?.method!,
		requestBody: typeof init?.body === "string" ? init?.body : undefined,
		response: responseBody,
	};
	const requesetList = requestMap.get(key) ?? new Array<RequestHistory>();
	requesetList.push(requestHist);
	requestMap.set(key, requesetList);
	exportRequestResponse();
}

function exportRequestResponse() {
	if (!fs.existsSync(exportDir)) {
		fs.mkdirSync(exportDir);
	}
	for (const [key, value] of requestMap) {
		const exportFile = path.join(exportDir, `${key}.json`);
		fs.writeFileSync(exportFile, JSON.stringify(value, null, 2));
	}
}

const cachable = [
	"fetchErrorsInboxFacetedData",
	"getErrorGroupGuid",
	"getAssignments",
	"errorGroupById",
	"getErrorTrace",
	"getErrorGroup",
	"getStackTrace",
	"TransactionError",
];

function resolveCached(url: RequestInfo, init?: RequestInit): string | undefined {
	const origin = urlOrigin(url);
	if (!origin.includes("staging-api.newrelic.com")) {
		return undefined;
	}

	const requestBody = typeof init?.body === "string" ? init?.body : undefined;
	if (!requestBody) {
		return undefined;
	}
	// Is it something we should return cached version of?
	const found = cachable.find(fragment => requestBody.includes(fragment));
	if (!found) {
		return undefined;
	}
	// Yeah, find best match
	const httpTransaction = findCached(requestBody);
	return httpTransaction;
}

const findCached = memoize(_findCached);

function _findCached(requestBody: string): string | undefined {
	const httpCached: RequestHistory[] = httpCachedBase;
	const httpTransaction = httpCached.find(
		item => stringSimilarity.compareTwoStrings(item.requestBody!, requestBody) > 0.98
	);
	return httpTransaction?.response ?? undefined;
}

export async function customFetch(url: RequestInfo, init?: RequestInit): Promise<Response> {
	if (CACHE_MODE) {
		const cached = resolveCached(url, init);
		if (cached) {
			const response = new Response(cached, {
				status: 200,
				size: 0,
				timeout: 0,
				url: url as string,
				headers: {
					"content-type": "application/json; charset=utf-8",
				},
			});
			Logger.log(`*** returning http cached for ${url}`);
			return response;
		}
	}
	const responses = await fetchCore(0, url, init);
	const response = responses[0];
	if (RECORD_MODE) {
		await recordRequestResponse(url, response, init);
	}
	return response;
}

const requestInfoToUrl = memoize(_requestInfoToUrl);

function _requestInfoToUrl(requestInfo: RequestInfo): URL | undefined {
	const urlString =
		typeof requestInfo === "string"
			? requestInfo
			: requestInfo instanceof Request
			? requestInfo.url
			: requestInfo.href;
	if (isEmpty(urlString)) {
		undefined;
	}
	if (typeof requestInfo === "string") {
		return new URL(requestInfo);
	}
	return undefined;
}

const urlOrigin = memoize(_urlOrigin);

function _urlOrigin(requestInfo: RequestInfo): string {
	try {
		if (!requestInfo) {
			return "<unknown>";
		}
		const url = requestInfoToUrl(requestInfo);
		return url?.origin ?? "<unknown>";
	} catch (e) {
		// ignore
	}
	return "<unknown>";
}

export async function fetchCore(
	count: number,
	url: RequestInfo,
	init?: RequestInit
): Promise<[Response, number]> {
	const origin = urlOrigin(url);
	try {
		handleLimit(origin);
		const resp = await fetch(url, init);
		if (resp.status < 200 || resp.status > 299) {
			if (resp.status < 400 || resp.status >= 500) {
				count++;
				if (count <= 3) {
					const waitMs = 250 * count;
					if (Logger.isDebugging) {
						const logUrl = `[${init?.method ?? "GET"}] ${origin}`;
						Logger.debug(
							`fetchCore: Retry ${count} for ${logUrl} due to http status ${resp.status} waiting ${waitMs}`
						);
					}
					await Functions.wait(waitMs);
					return fetchCore(count, url, init);
				}
			}
		}
		return [resp, count];
	} catch (ex) {
		if (ex instanceof InternalRateError) {
			throw ex;
		}
		const shouldLog = shouldLogRetry(ex.message);
		if (shouldLog) {
			Logger.error(ex);
		}
		count++;
		if (count <= 3) {
			const waitMs = 250 * count;
			if (Logger.isDebugging) {
				const logUrl = `[${init?.method ?? "GET"}] ${origin}`;
				Logger.debug(
					`fetchCore: Retry ${count} for ${logUrl} due to Error ${ex.message} waiting ${waitMs}`
				);
			}
			await Functions.wait(waitMs);
			return fetchCore(count, url, init);
		}
		throw ex;
	}
}
