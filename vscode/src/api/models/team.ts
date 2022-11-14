"use strict";
import { CSTeam } from "codestream-common/api-protocol";

import { memoize } from "../../system";
import { CodeStreamSession } from "../session";
import { CodeStreamItem } from "./item";

export class Team extends CodeStreamItem<CSTeam> {
	constructor(session: CodeStreamSession, team: CSTeam) {
		super(session, team);
	}

	get name() {
		return this.entity.name;
	}

	@memoize
	get isCodeStreamTeam() {
		return this.entity.providerInfo == null || Object.keys(this.entity.providerInfo).length === 0;
	}
}
