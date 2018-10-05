"use strict";
import { CodeStreamApi } from "../api/api";
import { CodeStreamSession } from "../session";
import { CSEntity } from "../shared/api.protocol";
import { LspHandler } from "../system";
import { Cache } from "./cache";
import { IndexParams } from "./index";
import * as operations from "./operations";
import {
	CodeStreamRTEMessage,
	MessageSource,
	RealTimeMessage,
	SlackRTEMessage
} from "./realTimeMessage";

export type Id = string;

/**
 * Base class for entity managers.
 */
export abstract class EntityManager<T extends CSEntity> {
	protected readonly cache: Cache<T>;

	public constructor(public session: CodeStreamSession) {
		this.cache = new Cache<T>(this.getIndexedFields(), this.fetch.bind(this));

		const handlerRegistry = (this as any).handlerRegistry as LspHandler[] | undefined;
		if (handlerRegistry !== undefined) {
			for (const handler of handlerRegistry) {
				this.session.agent.registerHandler(handler.type, handler.method.bind(this));
			}
		}

		this.init();
	}

	protected init() {}

	protected abstract async fetch(id: Id): Promise<T>;

	protected getIndexedFields(): IndexParams<T>[] {
		return [];
	}

	async getById(id: Id): Promise<T> {
		return this.cache.getById(id);
	}

	resolve(realTimeMessage: RealTimeMessage): Promise<T[]> {
		switch (realTimeMessage.source) {
			case MessageSource.CodeStream:
				return this.resolvePubNubMessage(realTimeMessage);
			case MessageSource.Slack:
				return this.resolveSlackMessage(realTimeMessage);
		}
	}

	async resolvePubNubMessage(message: CodeStreamRTEMessage): Promise<T[]> {
		const resolved = await Promise.all(
			message.changeSets.map(async c => {
				const changes = CodeStreamApi.normalizeResponse(c) as { [key: string]: any };
				const cached = await this.cache.get(changes["id"], { avoidFetch: true });
				if (cached) {
					const updatedEntity = operations.resolve(cached as any, changes);
					this.cache.set(updatedEntity as T, cached);
					return updatedEntity as T;
				} else {
					// TODO ignore unfetched entities unless they are new, using .version
					const entity = await this.fetch(changes["id"]);
					if (entity) {
						this.cache.set(entity);
						return entity;
					}
					return undefined;
				}
			})
		);
		return resolved.filter(Boolean) as T[];
	}

	async resolveSlackMessage(message: SlackRTEMessage): Promise<T[]> {
		// TODO Eric good luck
		// GOOD Luck anyway
		return [];
	}
}
