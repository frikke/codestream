const NESTED_PROPERTY_REGEX = /^(.+?)\.(.+)$/;

export function isDirective(data: any): boolean {
	return Boolean(data.$version);
}

export function isCompleteObject(obj: object): boolean {
	for (const key of Object.keys(obj)) {
		if (operations[key]) {
			return false;
		}
	}
	return true;
}

function isTrueObject(value: any): boolean {
	return typeof value === "object" && !(value instanceof Array);
}

// take a hash, and replace any `.` or `$` characters in the keys with unicode equivalent,
// also escaping the `\` character ... this avoid problems with saving to mongo, which forbids
// these characters
export function safeEncode(obj: any): void {
	if (typeof obj !== "object") return;
	for (const key in obj) {
		const encodedKey = key
			.replace(/\\/g, "\\\\")
			.replace(/\$/g, "\\u0024")
			.replace(/\./g, "\\u002e");
		if (encodedKey !== key) {
			obj[encodedKey] = obj[key];
			delete obj[key];
		}
		if (typeof obj[encodedKey] === "object") {
			safeEncode(obj[encodedKey]);
		}
	}
}

// decode single hash key, replacing dedoded key for the original key as needed
export function safeDecodeKey(data: any, key: string): string {
	const decodedKey = key
		.replace(/\\u002e/g, ".")
		.replace(/\\u0024/, "$")
		.replace(/\\\\/g, "\\");
	if (decodedKey !== key) {
		data[decodedKey] = data[key];
		delete data[key];
	}
	return decodedKey;
}

// reverse the encoding above ... take a hash, look for any unicode equivalents to `.` or `$`,
// and replace with their regular equivalents, and finally unescape the `\`
export function safeDecode(obj: any): void {
	if (typeof obj !== "object") return;
	for (const key in obj) {
		const decodedKey = safeDecodeKey(obj, key);
		if (typeof obj[decodedKey] === "object") {
			safeDecode(obj[decodedKey]);
		}
	}
}

export function resolve<T>(
	{ id, ...object }: { id: string; object: any[] },
	changes: { [key: string]: any }
) {
	const result: { [key: string]: any } = { ...object };
	Object.keys(changes).forEach(change => {
		const operation = operations[change];
		if (operation) {
			operation(result, changes[change]);
			delete changes[change];
		} else {
			const nestedPropertyMatch = change.match(NESTED_PROPERTY_REGEX);
			if (nestedPropertyMatch) {
				const [, topField, subField] = nestedPropertyMatch;
				result[topField] = resolve(result[topField], { [subField]: changes[change] });
			} else {
				result[change] = changes[change];
			}
		}
	});
	return result as T;
}

export function handle(property: any, object: any, data: any, recurse: any, apply: any) {
	const nestedPropertyMatch = property.match(NESTED_PROPERTY_REGEX);
	if (nestedPropertyMatch) {
		const [, topField, subField] = nestedPropertyMatch;
		if (object[topField] === undefined) {
			object[topField] = {};
		}
		if (isTrueObject(object[topField])) {
			recurse(object[topField], { [subField]: data[property] });
		}
	} else {
		apply();
	}
}

const operations = {
	$set(object: any, data: any) {
		Object.keys(data).forEach(property => {
			handle(property, object, data, operations.$set, () => {
				object[property] = data[property];
				safeDecodeKey(object, property);
			});
		});
	},
	$unset(object: any, data: any) {
		Object.keys(data).forEach(property => {
			handle(property, object, data, operations.$unset, () => delete object[property]);
		});
	},
	$push(object: any, data: any) {
		Object.keys(data).forEach(property => {
			handle(property, object, data, operations.$push, () => {
				const value = object[property];
				if (Array.isArray(value)) value.push(data[property]);
			});
		});
	},
	$pull(object: any, data: any) {
		Object.keys(data).forEach(property => {
			handle(property, object, data, operations.$pull, () => {
				const value = object[property];
				if (Array.isArray(value)) {
					if (Array.isArray(data[property])) {
						object[property] = value.filter(it => !data[property].includes(it));
					} else object[property] = value.filter(it => it !== data[property]);
				}
			});
		});
	},
	$addToSet(object: any, data: any) {
		Object.keys(data).forEach(property => {
			handle(property, object, data, operations.$addToSet, () => {
				let newValue = data[property];
				if (!Array.isArray(newValue)) newValue = [newValue];
				const currentValue = object[property];
				if (currentValue === undefined) object[property] = newValue;
				else if (Array.isArray(currentValue)) {
					newValue.forEach((value: any) => {
						if (!currentValue.find(it => it === value)) currentValue.push(value);
					});
				}
			});
		});
	},
	$inc(object: any, data: any) {
		Object.keys(data).forEach(property => {
			handle(property, object, data, operations.$inc, () => {
				const value = object[property];
				if (value === undefined) object[property] = data[property];
				else if (Number.isInteger(value)) object[property] = value + data[property];
			});
		});
	},
	$version(object: any, data: any) {
		object.version = data.after;
	},
} as any;
