import { customFetch } from "../../system/fetchCore";
import { memoize } from "lodash-es";
import path from "path";
import fs from "fs";
import { ResponseError } from "vscode-jsonrpc/lib/messages";
import { ERROR_CHATGPT_INVALID_RESPONSE } from "@codestream/protocols/agent";
import os from "os";
import {
	ChatApiResponse,
	ChatGptMessage,
	ChatGptRequest,
	ChatGptResponse,
	isChatGptErrorResponse,
} from "./types";
import { isEmpty } from "lodash";
import { Logger } from "../../logger";

const apiUrl =
	"https://nr-generativeai-api.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2023-03-15-preview";

const codeStreamDirectory = path.join(os.homedir(), ".codestream");

const conversationCache = new Map<string, Array<ChatGptMessage>>();

const getApiKey = memoize((): string | undefined => {
	const licensePath = path.join(codeStreamDirectory, "chatgpt.license");
	if (!fs.existsSync(licensePath)) {
		return undefined;
	}
	const license = fs.readFileSync(licensePath, "utf8");
	return license.trim();
});

export async function getChatResponse(
	id: string,
	prompt: string,
	role = "user",
	clear = false
): Promise<ChatApiResponse> {
	if (clear) {
		conversationCache.clear();
	}
	let conversation = conversationCache.get(id);
	if (!conversation) {
		conversation = new Array<ChatGptMessage>();
		conversationCache.set(id, conversation);
	}
	conversation.push({ role, content: prompt });
	const apiKey = getApiKey();
	if (!apiKey) {
		Logger.warn("Could not find chatgpt license");
	}

	const request: ChatGptRequest = {
		messages: conversation,
		temperature: 0,
	};

	const response = await customFetch(apiUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"api-key": `${getApiKey()}`,
		},
		body: JSON.stringify(request),
	});

	const apiResponse: ChatGptResponse = await response.json();
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
	Logger.log(`*** ChatGPT prompt ${prompt}`);
	Logger.log(`*** ChatGPT response ${JSON.stringify(message)}`);

	return `#Grok#${responseMessage}`;
}
