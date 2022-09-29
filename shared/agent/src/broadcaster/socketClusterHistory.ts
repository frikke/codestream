// Retrieves recent history of messages from SocketCluster, in case of disconnect or gaps in the session

"use strict";

import { AGClientSocket } from "socketcluster-client";
import UUID from "uuid";
import { BroadcasterHistoryOutput, BroadcasterMessage } from "./broadcaster";

export interface SocketClusterHistoryInput {
	socket: AGClientSocket;
	channels: string[];
	since: number;
	debug?(msg: string, info?: any): void; // for debug messages
}

export interface SocketClusterHistoryAPIInput {
	requestId: string;
	channels: string[];
	since: number;
}

export interface SocketClusterHistoryOutput {
	messages: BroadcasterMessage[];
	channels: string[];
}

export interface SocketClusterHistoryAPIOutput {
	requestId: string;
	messages: BroadcasterMessage[];
	channels: string[];
	error?: string;
}

export class SocketClusterHistory {
	private _socket: AGClientSocket | undefined;
	private _allMessages: BroadcasterMessage[] = [];
	private _debug: (msg: string, info?: any) => void = () => {};
	private _historyPromise:
		| {
				resolve(): void;
				reject(error: any): void;
		  }
		| undefined;
	private _numRequests: number = 0;
	private _requestId: string = "";
	private _historyTimer: NodeJS.Timer | undefined;

	async fetchHistory(options: SocketClusterHistoryInput): Promise<BroadcasterHistoryOutput> {
		this._socket = options.socket;
		if (options.debug) {
			this._debug = options.debug;
		}

		const output: BroadcasterHistoryOutput = {};

		// split into slices of 500 channels, which we may never reach, but it's here if we do
		let startSlice = 0;
		let done = false;
		let channels = [];
		const sliceSize = 100; // batch history is limited to 100 channels
		do {
			channels = options.channels.slice(startSlice, sliceSize);
			if (channels.length > 0) {
				if (await this.fetchByChannelSlice(channels, options.since)) {
					startSlice += sliceSize;
				} else {
					output.reset = true;
					done = true;
				}
			}
		} while (!done && channels.length > 0);

		if (!output.reset) {
			this._allMessages.sort((a, b) => {
				return a.timestamp - b.timestamp;
			});
			if (this._allMessages.length > 0) {
				// store the last message received, so we know where to start from next time
				output.messages = this._allMessages.map(message => message.message);
				output.timestamp = this._allMessages[this._allMessages.length - 1].timestamp;
			}
		}
		return output;
	}

	// fetch historical messages for a slice of 500 channels
	private async fetchByChannelSlice(channels: string[], since: number): Promise<boolean> {
		try {
			await this.retrieveBatchHistory(channels, since);
		} catch (error) {
			// if we reached a "RESET" condition, break out and inform the client, we'll proceed no further
			if (error instanceof Error && error.message === "RESET") {
				return false;
			} else {
				const message = error instanceof Error ? error.message : JSON.stringify(error);
				throw error;
			}
		}
		return true;
	}

	// retrieve historical messages in batch
	private async retrieveBatchHistory(channels: string[], since: number): Promise<void> {
		this._requestId = UUID();
		const historyMessage = {
			requestId: this._requestId,
			channels,
			since,
		} as SocketClusterHistoryAPIInput;

		let response: any;
		try {
			response = await this._socket!.invoke("history", historyMessage);
		} catch (error) {
			const message = error instanceof Error ? error.message : JSON.stringify(error);
			throw new Error(`history fetch error: ${message}`);
		}

		await this.handleHistory(response as SocketClusterHistoryAPIOutput);
	}

	private async handleHistory(output: SocketClusterHistoryAPIOutput) {
		if (output.requestId !== this._requestId) {
			return;
		}
		this._allMessages.push(...output.messages);
		if (output.messages.length >= 100) {
			this._numRequests++;
			if (this._numRequests === 10) {
				throw new Error("RESET");
			}
			const since = output.messages[output.messages.length - 1].timestamp;
			await this.retrieveBatchHistory(output.channels, since);
		}
	}
}
