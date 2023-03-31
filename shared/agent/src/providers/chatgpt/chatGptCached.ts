import { RequestHistory } from "../../system/fetchCore";
import { ResponseError } from "vscode-jsonrpc/lib/messages";
import { ERROR_CHATGPT_INVALID_RESPONSE } from "@codestream/protocols/agent";
import {
	ChatApiResponse,
	ChatGptMessage,
	ChatGptRequest,
	ChatGptResponse,
	isChatGptErrorResponse,
} from "./types";
import { isEmpty } from "lodash";
import cachedHttpBase from "./api.openai.com.json";
import stringSimilarity from "string-similarity";
import { Functions } from "../../system/function";

const conversationCache = new Map<string, Array<ChatGptMessage>>();

export async function getChatResponseCached(
	id: string,
	prompt: string,
	role = "user"
): Promise<ChatApiResponse> {
	let conversation = conversationCache.get(id);
	if (!conversation) {
		conversation = new Array<ChatGptMessage>();
		conversationCache.set(id, conversation);
	}
	conversation.push({ role, content: prompt });

	const cachedHttp: RequestHistory[] = cachedHttpBase;

	const request: ChatGptRequest = {
		model: "gpt-3.5-turbo",
		messages: conversation,
		temperature: 0,
	};

	const requestStr = JSON.stringify(request);

	const httpTransaction = cachedHttp.find(
		http => stringSimilarity.compareTwoStrings(http.requestBody!, requestStr) > 0.9
	);

	if (!httpTransaction) {
		throw new Error("Invalid cached ChatGPT request");
	}

	// Simulate http response delay
	await Functions.wait(750);

	const apiResponse: ChatGptResponse = JSON.parse(httpTransaction.response);

	if (isChatGptErrorResponse(apiResponse)) {
		throw new ResponseError(ERROR_CHATGPT_INVALID_RESPONSE, JSON.stringify(apiResponse));
	}

	if (isEmpty(apiResponse.choices)) {
		throw new ResponseError(ERROR_CHATGPT_INVALID_RESPONSE, JSON.stringify(apiResponse));
	}

	const message = apiResponse.choices[0].message;
	if (!message) {
		throw new ResponseError(ERROR_CHATGPT_INVALID_RESPONSE, JSON.stringify(apiResponse));
	}
	const responseMessage = `${message.content}`;
	conversation.push(message);
	return `#chatgpt#${responseMessage}`;
}
