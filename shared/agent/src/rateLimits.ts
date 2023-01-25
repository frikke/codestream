import { setInterval } from "timers";
import { Logger } from "./logger";
import { NRErrorType } from "@codestream/protocols/agent";
import { CodedError } from "./providers/newrelic.types";

const rateLimitByOrigin = new Map<string, number>();

// Time period in seconds in which we evaluate the rate limit
const RATE_LIMIT_INTERVAL = 15;

// Tried to extend SessionContainer.instance().session to to notify when session loaded
// on callback and read current api url but it failed in the most inexplicable way.
const nrApriOrigins = new Set([
	"https://api.eu.newrelic.com",
	"https://api.newrelic.com",
	"https://staging-api.newrelic.com",
]);

// Rate limits
function getRateLimit(origin: string): Limit {
	if (nrApriOrigins.has(origin)) {
		return { warn: 50, block: 10 };
	}
	// Uncomment for testing errors - set block to low-ish number
	// } else if(origin.includes("github")) {
	// 	return { warn: 30, block: 20 };
	// }
	else {
		return { warn: 75, report: 100 };
	}
}

type Violation = "warn" | "block" | "report";

type RateLimit = {
	violation: Violation;
	limit: number;
	count: number;
};

export type Limit = {
	warn: number;
	block?: number;
	report?: number;
};

type Stats = {
	[key: string]: number;
};

export class InternalRateError extends CodedError {
	code: NRErrorType = "INTERNAL_RATE";

	constructor(message: string) {
		super(message);
	}
}

function padNumber(num: number, padding: number): string {
	return num.toString(10).padStart(padding, "0");
}

export function getKeyDatePart(dateTime: Date, bucketSeconds: number): string {
	const timeBucket = getTimeBucket(dateTime, bucketSeconds);
	return `${timeBucket.getFullYear()}${padNumber(timeBucket.getMonth() + 1, 2)}${padNumber(
		timeBucket.getDate(),
		2
	)}T${padNumber(timeBucket.getHours(), 2)}${padNumber(timeBucket.getMinutes(), 2)}${padNumber(
		timeBucket.getSeconds(),
		2
	)}`;
}

export function getTimeBucket(dateTime: Date, seconds: number): Date {
	const dateSeconds = dateTime.getTime() / 1000;
	const rounded = Math.floor(dateSeconds / seconds) * seconds;
	return new Date(rounded * 1000);
}

// Keep size around 100 records - delete oldest
function trim() {
	if (rateLimitByOrigin.size > 100) {
		const trimCount = rateLimitByOrigin.size - 100;
		let deleteCount = 0;
		for (const key of rateLimitByOrigin.keys()) {
			rateLimitByOrigin.delete(key);
			if (++deleteCount >= trimCount) {
				break;
			}
		}
	}
}

setInterval(() => {
	trim();
	if (Logger.isDebugging) {
		const stats: Stats = {};
		for (const [key, value] of rateLimitByOrigin.entries()) {
			stats[key] = value;
		}
		Logger.debug(`rateCounts ${JSON.stringify(stats, null, 2)}`);
	}
}, 60000);

function isOverRateLimit(origin: string): RateLimit | undefined {
	const now = new Date();
	const keyDatePart = getKeyDatePart(now, RATE_LIMIT_INTERVAL);
	const key = `${keyDatePart}|${origin}`;
	const count = (rateLimitByOrigin.get(key) ?? 1) + 1;
	rateLimitByOrigin.set(key, count);
	const limit = getRateLimit(origin);
	if (limit.block && count > limit.block) {
		return { violation: "block", limit: limit.block, count };
	}
	if (limit.report && count > limit.report) {
		return { violation: "report", limit: limit.report, count };
	}
	if (count > limit.warn) {
		return { violation: "warn", limit: limit.warn, count };
	}
	return undefined;
}

export function handleLimit(origin: string) {
	const rateLimit = isOverRateLimit(origin);
	if (rateLimit) {
		switch (rateLimit.violation) {
			case "warn": {
				Logger.warn(
					`${origin} is over internal rate limit warning with count ${rateLimit.limit} in ${RATE_LIMIT_INTERVAL} seconds`
				);
				break;
			}
			case "block":
			case "report": {
				const error = new InternalRateError(
					`${origin} exceeded internal block limit of ${rateLimit.limit} in ${RATE_LIMIT_INTERVAL} seconds`
				);
				Logger.error(error);
				if (rateLimit.violation === "block") {
					throw error;
				}
				break;
			}
		}
	}
}

export function reset() {
	rateLimitByOrigin.clear();
}
