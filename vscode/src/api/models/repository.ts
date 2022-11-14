"use strict";
import { CSRepository } from "codestream-common/api-protocol";

import { CodeStreamSession } from "../session";
import { CodeStreamItem } from "./item";

export class Repository extends CodeStreamItem<CSRepository> {
	constructor(session: CodeStreamSession, repo: CSRepository) {
		super(session, repo);
	}

	get name() {
		return this.entity.name;
	}

	get normalizedUrl() {
		return this.entity.remotes[0].normalizedUrl;
	}

	get url() {
		return this.entity.remotes[0].url;
	}
}
