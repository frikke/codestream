"use strict";

import { request, RequestOptions } from "https";
import { parse } from "url";
import { ServerError } from "../../../src/agentError";

export interface ApiRequesterOptions {
	origin: string;
}

export interface ApiRequestOptions {
	method: string;
	path: string;
	data: object;
	noToken?: boolean;
	token?: string;
}

export interface ApiRequestOverrides {
	method?: string;
	path?: string;
	data?: object;
	noToken?: boolean;
	token?: string;
}

export class ApiRequester {
	private _origin: string;
	private _token: string | undefined;

	constructor(options: ApiRequesterOptions) {
		this._origin = options.origin;
	}

	setToken(token: string) {
		this._token = token;
	}

	async request(options: ApiRequestOptions) {
		return new Promise<any>((resolve, reject) => {
			const callback = (error: any, result?: object) => {
				if (error) {
					reject(error);
				} else {
					resolve(result);
				}
			};
			(() => {
				const url = parse(this._origin);
				const { method, path, data } = options;
				const httpsOptions: RequestOptions = {
					host: url.hostname,
					port: url.port,
					method,
					path,
					rejectUnauthorized: false,
					headers: {
						"content-type": "application/json",
						"x-cs-block-email-sends": "true",
						"x-cs-block-tracking": "true",
						"x-cs-for-testing": "true",
					},
				};
				let token;
				if (options.token) {
					token = options.token;
				} else if (this._token && !options.noToken) {
					token = this._token;
				}
				if (token) {
					httpsOptions.headers!.authorization = `Bearer ${token}`;
				}
				const clientRequest = request(httpsOptions, response => {
					let responseData = "";

					response.on("data", incomingData => {
						responseData += incomingData.toString();
					});

					response.on("end", () => {
						let parsed;
						try {
							parsed = JSON.parse(responseData);
						} catch (error) {
							callback(`error parsing JSON data: ${error}`);
						}
						if (response.statusCode! < 200 || response.statusCode! >= 300) {
							callback(new ServerError("https error", parsed, response.statusCode));
						} else {
							callback(null, parsed);
						}
					});

					response.on("error", error => {
						callback(`https error: ${error}`);
					});
				});

				clientRequest.on("error", error => {
					callback(error);
				});
				if (data) {
					clientRequest.write(JSON.stringify(data));
				}
				clientRequest.end();
			})();
		});
	}
}
