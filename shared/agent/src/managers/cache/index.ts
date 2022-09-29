"use strict";

import { Id } from "../entityManager";
import { FetchFn, IdFn } from "./baseCache";

export enum IndexType {
	Unique = "unique",
	Group = "group",
}

export interface IndexParams<T> {
	type: IndexType;
	fields: (keyof T)[];
	seqField?: keyof T;
	fetchFn: FetchFn<T>;
	idFn?: IdFn<T>;
}

/**
 * Factory function to create indexes
 *
 * @param {IndexParams} params
 *
 * @return {Index} Index object
 */
export function makeIndex<T>(params: IndexParams<T>): Index<T> {
	switch (params.type) {
		case IndexType.Unique:
			return new UniqueIndex(params.fields, params.fetchFn);
		case IndexType.Group:
			return new GroupIndex(params.fields, params.fetchFn, params.idFn!);
	}
}

export function encodeArray(array: any): string {
	array = Array.isArray(array) ? array : [array];
	return array.join("|");
}

function defaultIdFn(entity: any): Id {
	return entity.id;
}

export abstract class BaseIndex<T> {
	protected constructor(readonly fields: (keyof T)[], readonly fetchFn: FetchFn<T>) {}

	enabled: boolean = true;

	abstract invalidate(): void;

	abstract set(entity: T, oldEntity?: T): void;

	protected requireIndexValue(entity: T): string | undefined {
		const values = [];
		for (const field of this.fields) {
			const value = (entity as any)[field];
			if (value != null) {
				values.push(value);
			}
		}

		if (values.length === 0) return undefined;

		return encodeArray(values);
	}
}

/**
 * Index to search for entities by unique values like IDs or SSNs. Accepts
 * only entities with defined values for the key field.
 */
export class UniqueIndex<T> extends BaseIndex<T> {
	readonly type = IndexType.Unique;

	private readonly _data = new Map<string, any>();

	constructor(fields: (keyof T)[], fetchFn: FetchFn<T>) {
		super(fields, fetchFn);
	}

	invalidate() {
		this._data.clear();
	}

	set(entity: T, oldEntity?: T) {
		if (!this.enabled) return;

		const value = this.requireIndexValue(entity);
		if (value === undefined) return;

		if (oldEntity) {
			const oldValue = this.requireIndexValue(oldEntity);
			if (oldValue !== undefined && oldValue !== value) {
				this._data.delete(oldValue);
			}
		}

		this._data.set(value, entity);
	}

	get(value: any[]): T | undefined {
		return this._data.get(encodeArray(value));
	}

	getAll(): T[] {
		return [...this._data.values()];
	}

	has(value: any[]): boolean {
		return this._data.has(encodeArray(value));
	}

	delete(value: any[]) {
		this._data.delete(encodeArray(value));
	}
}

/**
 * Index to search for groups of entities with a common key like people with
 * the same last name, or posts with the same streamId.
 *
 * Each value group must be initialized independently via #initGroup. Getting
 * an uninitialized group will return undefined, and setting an entity before
 * its group is initialized results in no-op.
 */
export class GroupIndex<T> extends BaseIndex<T> {
	readonly type = IndexType.Group;

	private readonly groups = new Map<string, Map<Id, T>>();
	private readonly idFn: IdFn<T>;

	constructor(fields: (keyof T)[], fetchFn: FetchFn<T>, idFn?: IdFn<T>) {
		super(fields, fetchFn);
		this.idFn = idFn || defaultIdFn;
	}

	invalidate() {
		this.groups.clear();
	}

	/**
	 * Returns a group of entities that share the same group value.
	 * If the group is not initialized, returns `undefined`.
	 *
	 * @param value The group value
	 * @return Array of entities or `undefined`
	 */
	getGroup(value: any[]): T[] | undefined {
		const indexValue = encodeArray(value);
		const group = this.groups.get(indexValue);
		if (group) {
			return Array.from(group.values());
		} else {
			return;
		}
	}

	/**
	 * Add or update an entity. If the corresponding group is not initialized,
	 * results in no-op.
	 *
	 * @param entity The entity
	 * @param oldEntity If specified, removes entity from its old group if different
	 */
	set(entity: T, oldEntity?: T) {
		if (!this.enabled) return;

		const group = this.getGroupForEntity(entity);

		if (oldEntity) {
			const oldGroup = this.getGroupForEntity(oldEntity);
			if (oldGroup && oldGroup !== group) {
				oldGroup.delete(this.idFn(oldEntity));
			}
		}

		if (group) {
			group.set(this.idFn(entity), entity);
		}
	}

	/**
	 * Initializes a group of entities
	 *
	 * @param {any[]} values The value of the group
	 * @param {[]} entities The entities
	 */
	initGroup(values: any[], entities: T[]) {
		if (!this.enabled) return;

		const indexValue = encodeArray(values);
		if (this.groups.has(indexValue)) {
			return;
		}

		const group = new Map();
		for (const entity of entities) {
			group.set(this.idFn(entity), entity);
		}
		this.groups.set(indexValue, group);
	}

	private getGroupForEntity(entity: T): Map<Id, T> | undefined {
		const indexValue = this.requireIndexValue(entity);
		return indexValue === undefined ? undefined : this.groups.get(indexValue);
	}
}

export type Index<T> = UniqueIndex<T> | GroupIndex<T>;
