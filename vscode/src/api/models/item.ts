"use strict";
import { CSEntity } from "codestream-common/api-protocol";

import { CodeStreamSession } from "../session";

export abstract class CodeStreamItem<TEntity extends CSEntity> {
	constructor(public readonly session: CodeStreamSession, protected readonly entity: TEntity) {}

	get id() {
		return this.entity.id;
	}
}
