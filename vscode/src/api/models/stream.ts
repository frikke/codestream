"use strict";
import { CSChannelStream, CSDirectStream, StreamType } from "codestream-common/api-protocol";

import { Container } from "../../container";
import { CodeStreamSession } from "../session";
import { CodeStreamItem } from "./item";
import { Post } from "./post";

export { StreamType } from "codestream-common/api-protocol";

abstract class StreamBase<T extends CSChannelStream | CSDirectStream> extends CodeStreamItem<T> {
	constructor(session: CodeStreamSession, stream: T) {
		super(session, stream);
	}

	get memberIds() {
		return this.entity.memberIds;
	}

	get teamId() {
		return this.entity.teamId;
	}

	async post(text: string, parentPostId?: string) {
		const post = (await Container.agent.posts.create(this.entity.id, text, undefined, parentPostId))
			.post;
		if (post === undefined) throw new Error(`Unable to post to Stream(${this.entity.id})`);

		return new Post(this.session, post);
	}
}

export class ChannelStream extends StreamBase<CSChannelStream> {
	readonly type = StreamType.Channel;

	constructor(session: CodeStreamSession, stream: CSChannelStream) {
		super(session, stream);
	}

	get name() {
		return this.entity.name;
	}

	// @memoize
	// async label() {
	// 	return `#${this.entity.name}`;
	// }

	get memberIds(): string[] | undefined {
		return this.entity.memberIds;
	}

	memberOf(id: string) {
		return this.entity.memberIds === undefined ? true : this.entity.memberIds.includes(id);
	}
}

export class DirectStream extends StreamBase<CSDirectStream> {
	readonly type = StreamType.Direct;

	constructor(session: CodeStreamSession, stream: CSDirectStream) {
		super(session, stream);
	}

	// @memoize
	// async label() {
	// 	const label = Iterables.join(
	// 		Iterables.map(await this.members(this.session.userId), u => u.name),
	// 		", "
	// 	);
	// 	if (!label && this.entity.memberIds.includes(this.session.userId)) {
	// 		return `${this.session.user.name} (you)`;
	// 	}

	// 	return label;
	// }

	get memberIds(): string[] {
		return this.entity.memberIds;
	}

	memberOf(id: string) {
		return this.entity.memberIds.includes(id);
	}
}

export type Stream = ChannelStream | DirectStream;

export interface ChannelStreamCreationOptions {
	membership?: "auto" | string[];
	privacy?: "public" | "private";
	purpose?: string;
}

export interface ServiceChannelStreamCreationOptions {
	name?: string;
	membership?: "auto" | string[];
	privacy?: "public" | "private";
	purpose?: string;
	serviceInfo?: { [key: string]: any };
}
