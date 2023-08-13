import { describe, expect, it } from "@jest/globals";
import {
	advanceRecombinedStream,
	RecombinedStream,
} from "@codestream/webview/store/posts/recombinedStream";

describe("posts reducer RecombinedStream", () => {
	it("should not have content when sequence 0 is missing", () => {
		const recombinedStream = {
			items: [
				{
					sequence: 1,
					streamId: "streamId",
					postId: "postId",
					content: "hot",
					done: false,
				},
			],
			content: "",
			done: false,
		};
		advanceRecombinedStream(recombinedStream, [
			{
				sequence: 2,
				streamId: "streamId",
				postId: "postId",
				content: " sauce",
				done: false,
			},
		]);
		expect(recombinedStream.content).toBe("");
		expect(recombinedStream.done).toBe(false);
		expect(recombinedStream.items.length).toBe(2);
	});

	it("should have content when sequence 0 is present", () => {
		const recombinedStream = {
			items: [
				{
					sequence: 0,
					streamId: "streamId",
					postId: "postId",
					content: "hot",
					done: false,
				},
			],
			content: "",
			done: false,
		};
		advanceRecombinedStream(recombinedStream, [
			{
				sequence: 1,
				streamId: "streamId",
				postId: "postId",
				content: " sauce",
				done: false,
			},
		]);

		expect(recombinedStream.content).toBe("hot sauce");
		expect(recombinedStream.done).toBe(false);
		expect(recombinedStream.items.length).toBe(2);
	});

	it("should include content up to first missing sequence", () => {
		const recombinedStream = {
			items: [
				{
					sequence: 0,
					streamId: "streamId",
					postId: "postId",
					content: "hot",
					done: false,
				},
				{
					sequence: 2,
					streamId: "streamId",
					postId: "postId",
					content: " sauce",
					done: false,
				},
			],
			content: "",
			done: false,
		};
		advanceRecombinedStream(recombinedStream, [
			{
				sequence: 3,
				streamId: "streamId",
				postId: "postId",
				content: " burns",
				done: false,
			},
		]);

		expect(recombinedStream.content).toBe("hot");
		expect(recombinedStream.done).toBe(false);
		expect(recombinedStream.items.length).toBe(3);
	});

	it("should handle out of order sequence", () => {
		const recombinedStream = {
			items: [
				{
					sequence: 0,
					streamId: "streamId",
					postId: "postId",
					content: "hot",
					done: false,
				},
				{
					sequence: 2,
					streamId: "streamId",
					postId: "postId",
					content: " sauce",
					done: false,
				},
				{
					sequence: 3,
					streamId: "streamId",
					postId: "postId",
					content: " burns",
					done: false,
				},
			],
			content: "",
			done: false,
		};
		advanceRecombinedStream(recombinedStream, [
			{
				sequence: 1,
				streamId: "streamId",
				postId: "postId",
				content: " tangy",
				done: false,
			},
		]);

		expect(recombinedStream.content).toBe("hot tangy sauce burns");
		expect(recombinedStream.done).toBe(false);
		expect(recombinedStream.items.length).toBe(4);
	});

	it("should handle out of order sequence multiple advances", () => {
		const recombinedStream: RecombinedStream = {
			items: [
				{
					sequence: 1,
					streamId: "streamId",
					postId: "postId",
					content: " hot",
					done: false,
				},
				{
					sequence: 2,
					streamId: "streamId",
					postId: "postId",
					content: " sauce",
					done: false,
				},
				{
					sequence: 3,
					streamId: "streamId",
					postId: "postId",
					content: " burns. ",
					done: false,
				},
			],
			content: "",
			done: false,
		};

		advanceRecombinedStream(recombinedStream, [
			{
				sequence: 0,
				streamId: "streamId",
				postId: "postId",
				content: "tangy",
				done: false,
			},
		]);

		expect(recombinedStream.content).toBe("tangy hot sauce burns. ");
		expect(recombinedStream.done).toBe(false);
		expect(recombinedStream.items.length).toBe(4);
		expect(recombinedStream.lastContentIndex).toBe(3);

		advanceRecombinedStream(recombinedStream, [
			{
				sequence: 8,
				streamId: "streamId",
				postId: "postId",
				content: "Hamburgers ",
				done: false,
			},
			{
				sequence: 9,
				streamId: "streamId",
				postId: "postId",
				content: "are ",
				done: false,
			},
			{
				sequence: 10,
				streamId: "streamId",
				postId: "postId",
				content: "food. ",
				done: false,
			},
		]);

		// No change yet
		expect(recombinedStream.content).toBe("tangy hot sauce burns. ");
		expect(recombinedStream.done).toBe(false);
		expect(recombinedStream.items.length).toBe(7);
		expect(recombinedStream.lastContentIndex).toBe(3);

		advanceRecombinedStream(recombinedStream, [
			{
				sequence: 4,
				streamId: "streamId",
				postId: "postId",
				content: "i ",
				done: false,
			},
			{
				sequence: 5,
				streamId: "streamId",
				postId: "postId",
				content: "ran out",
				done: false,
			},
			{
				sequence: 6,
				streamId: "streamId",
				postId: "postId",
				content: " of clever",
				done: false,
			},
			{
				sequence: 7,
				streamId: "streamId",
				postId: "postId",
				content: " comments. ",
				done: false,
			},
		]);

		expect(recombinedStream.content).toBe(
			"tangy hot sauce burns. i ran out of clever comments. Hamburgers are food. "
		);
		expect(recombinedStream.done).toBe(false);
		expect(recombinedStream.items.length).toBe(11);
		expect(recombinedStream.lastContentIndex).toBe(10);
	});
});
