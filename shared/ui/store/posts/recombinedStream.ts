import { GrokStreamEvent } from "@codestream/webview/store/posts/types";

export type RecombinedStream = {
	items: GrokStreamEvent[];
	content: string;
	done: boolean;
	lastContentIndex?: number;
};

export function advanceRecombinedStream(
	recombinedStream: RecombinedStream,
	payload: GrokStreamEvent[]
) {
	recombinedStream.items = recombinedStream.items.concat(payload);
	recombinedStream.items.sort((a, b) => a.sequence - b.sequence);
	recombinedStream.done = payload.find(it => it.done) !== undefined;
	const start = recombinedStream.lastContentIndex ? recombinedStream.lastContentIndex + 1 : 0;
	// if (start >= recombinedStream.items.length) return;
	for (let i = start; i < recombinedStream.items.length; i++) {
		const item = recombinedStream.items[i];
		if (item.sequence !== i) {
			// recombinedStream.lastContentIndex = i;
			return;
		}
		recombinedStream.content = recombinedStream.content + item.content;
		recombinedStream.lastContentIndex = i;
	}
}
