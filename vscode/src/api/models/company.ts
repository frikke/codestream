"use strict";
import { CSCompany } from "codestream-common/api-protocol";

import { CodeStreamSession } from "../session";
import { CodeStreamItem } from "./item";

export class Company extends CodeStreamItem<CSCompany> {
	constructor(session: CodeStreamSession, company: CSCompany) {
		super(session, company);
	}

	get name() {
		return this.entity.name;
	}
}
