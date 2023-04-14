import { isEmpty, memoize } from "lodash";
import fetch, { Request, RequestInfo, RequestInit, Response } from "node-fetch";
import { Logger } from "../logger";
import { Functions } from "./function";
import { handleLimit, InternalRateError } from "../rateLimits";
import os from "os";
import path from "path";
import fs from "fs";
import nrStagingApiCachedBase from "./staging-api.newrelic.com.json";
import openaiCachedBase from "./nr-generativeai-api.openai.azure.com.json";
import { compareTwoStrings } from "string-similarity";

const RECORD_MODE = false;
const CACHE_MODE = true;

const noLogRetries = ["reason: connect ECONNREFUSED", "reason: getaddrinfo ENOTFOUND"];

function shouldLogRetry(errorMsg: string): boolean {
	const result = noLogRetries.find(e => e.includes(errorMsg));
	return !result;
}

const codeStreamDirectory = path.join(os.homedir(), ".codestream");
const exportDir = path.join(codeStreamDirectory, "export");

export type HttpTransaction = {
	timestamp: string;
	url: string;
	method: string;
	requestBody?: string;
	response: string;
};

const requestMap = new Map<string, HttpTransaction[]>();

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
	const httpTransaction: HttpTransaction = {
		timestamp: new Date().toISOString(),
		url: urlString,
		method: init?.method ?? "GET",
		requestBody: typeof init?.body === "string" ? init?.body : undefined,
		response: responseBody,
	};
	const requestList = requestMap.get(key) ?? new Array<HttpTransaction>();
	requestList.push(httpTransaction);
	requestMap.set(key, requestList);
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
	"role", //ChatGPT
];

async function resolveCached(url: RequestInfo, init?: RequestInit): Promise<string | undefined> {
	const origin = urlOrigin(url);
	if (!origin.includes("nr-generativeai-api.openai.azure.com")) {
		// && !origin.includes("api.openai.com")
		// !origin.includes("staging-api.newrelic.com")
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
	const host = requestInfoToUrl(url)?.host;
	if (host) {
		const cachedResponse = findCached({ host, requestBody });
		// Don't be too fast
		await Functions.wait(2000);
		return cachedResponse;
	}
	return undefined;
}

const findCached = memoize(_findCached);

function _findCached(params: { host: string; requestBody: string }): string | undefined {
	const { host, requestBody } = params;
	const httpCached: HttpTransaction[] =
		host === "nr-generativeai-api.openai.azure.com" ? openaiCachedBase : nrStagingApiCachedBase;
	const exactMatch = httpCached.find(item => item.requestBody === requestBody);
	if (exactMatch) {
		return exactMatch.response;
	}
	const httpTransaction = httpCached.find(
		item => compareTwoStrings(item.requestBody ?? "", requestBody) > 0.95
	);
	return httpTransaction?.response ?? undefined;
}

export async function customFetch(url: RequestInfo, init?: RequestInit): Promise<Response> {
	if (CACHE_MODE) {
		const cached = await resolveCached(url, init);
		if (cached) {
			const response = new Response(cached, {
				status: 200,
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
