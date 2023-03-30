// import { customFetch } from "../../system/fetchCore";
// import { memoize } from "lodash-es";
// import path from "path";
// import fs from "fs";
// import { ResponseError } from "vscode-jsonrpc/lib/messages";
// import { ERROR_CHATGPT_INVALID_RESPONSE, ERROR_CHATGPT_LICENSE } from "@codestream/protocols/agent";
// import os from "os";
// import {
// 	ChatApiResponse,
// 	ChatGptMessage,
// 	ChatGptRequest,
// 	ChatGptResponse,
// 	isChatGptErrorResponse,
// } from "./types";
// import { isEmpty } from "lodash";

// const apiUrl = "https://api.openai.com/v1/chat/completions";

// const codeStreamDirectory = path.join(os.homedir(), ".codestream");

// const conversationCache = new Map<string, Array<ChatGptMessage>>();

// const getApiKey = memoize((): string | undefined => {
// 	const licensePath = path.join(codeStreamDirectory, "chatgpt.license");
// 	if (!fs.existsSync(licensePath)) {
// 		return undefined;
// 	}
// 	const license = fs.readFileSync(licensePath, "utf8");
// 	return license.trim();
// });

// export async function getChatResponse(
// 	id: string,
// 	prompt: string,
// 	role = "user"
// ): Promise<ChatApiResponse> {
// 	let conversation = conversationCache.get(id);
// 	if (!conversation) {
// 		conversation = new Array<ChatGptMessage>();
// 		conversationCache.set(id, conversation);
// 	}
// 	conversation.push({ role, content: prompt });
// 	const apiKey = getApiKey();
// 	if (!apiKey) {
// 		throw new ResponseError(ERROR_CHATGPT_LICENSE, "Could not find chatgpt license");
// 	}

// 	const request: ChatGptRequest = {
// 		model: "gpt-3.5-turbo",
// 		messages: conversation,
// 		temperature: 0,
// 	};

// 	const response = await customFetch(apiUrl, {
// 		method: "POST",
// 		headers: {
// 			"Content-Type": "application/json",
// 			Authorization: `Bearer ${getApiKey()}`,
// 		},
// 		body: JSON.stringify(request),
// 	});

// 	const apiResponse: ChatGptResponse = await response.json();
// 	if (isChatGptErrorResponse(apiResponse)) {
// 		throw new ResponseError(ERROR_CHATGPT_INVALID_RESPONSE, JSON.stringify(apiResponse));
// 	}

// 	if (isEmpty(apiResponse.choices)) {
// 		throw new ResponseError(ERROR_CHATGPT_INVALID_RESPONSE, JSON.stringify(apiResponse));
// 	}

// 	const message = apiResponse.choices[0].message;
// 	if (!message) {
// 		throw new ResponseError(ERROR_CHATGPT_INVALID_RESPONSE, JSON.stringify(apiResponse));
// 	}
// 	const responseMessage = `${message.content}`;
// 	conversation.push(message);
// 	return `#chatgpt#${responseMessage}`;
// }

// // const error = "FetchError: request to https://source.datanerd.us/api/v3/search/issues?q=archived%3Afalse%20is%3Aissue%20is%3Aopen%20assignee%3A%40me&sort=updated failed, reason: connect ETIMEDOUT 34.210.10.92:443             at ClientRequest.<anonymous> (/Users/ngarcia/.codestream/node_modules/node-fetch/lib/index.js:1491:11)                                                                              /at ClientRequest.emit (node:events:390:28)                                                                   /at TLSSocket.socketErrorListener (node:_http_client:447:9)                                                                                  /at TLSSocket.emit (node:events:390:28)                                                                                     /at emitErrorNT (node:internal/streams/destroy:157:8)                                                                                /at emitErrorCloseNT (node:internal/streams/destroy:122:3)                                                                       /at processTicksAndRejections (node:internal/process/task_queues:83:21)\n" +
// // 	"No logs found\n" +
// // 	"timestamp\n" +
// // 	"Mar 23 7:24 PM\n";

// // const prompt = `Analyze this stack trace:

// // \`\`\`
// // TypeError: Cannot read properties of undefined (reading 'street')
// //     at /app/src/dataSource.js:21:57
// //     at Array.map ()
// //     at collectStreetAddresses (/app/src/dataSource.js:21:32)
// //     at namedMiddlweare (/app/src/index.js:34:16)
// //     at runInContextCb (/app/node_modules/newrelic/lib/shim/shim.js:1315:22)
// //     at LegacyContextManager.runInContext (/app/node_modules/newrelic/lib/context-manager/legacy-context-manager.js:59:23)
// //     at WebFrameworkShim.applySegment (/app/node_modules/newrelic/lib/shim/shim.js:1305:25)
// //     at _applyRecorderSegment (/app/node_modules/newrelic/lib/shim/shim.js:936:20)
// //     at _doRecord (/app/node_modules/newrelic/lib/shim/shim.js:909:17)
// //     at namedMiddlweare (/app/node_modules/newrelic/lib/shim/shim.js:869:24)
// // \`\`\`

// // And tell me how to fix this code:

// // \`\`\`function collectStreetAddresses() {
// //     const addresses = userData.map(data => data.address.street)
// //     return addresses
// // }
// // \`\`\`
// // `

// // // Example usage
// // getChatResponse("1234", prompt).then(response => {
// // 	console.log(response);
// // 	process.exit(0);
// // });
