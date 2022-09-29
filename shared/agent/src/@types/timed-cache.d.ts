declare module "timed-cache" {
	export interface CacheOptions {
		defaultTtl: number;
	}
	export interface PutOptions {
		ttl: number;
	}
	export default class Cache<T> {
		constructor(options?: CacheOptions);
		clear(): void;
		get(key: string | object): T | undefined;
		put(key: string, value: T, options?: PutOptions): void;
		remove(key: string): void;
		size(): number;
	}
}
