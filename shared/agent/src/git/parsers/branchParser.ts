"use strict";
import { Strings } from "../../system";

export interface BranchEntry {
	name: string;
	isCurrentBranch?: boolean;
}

export class GitBranchParser {
	static parse(data: string): BranchEntry[] {
		if (!data) return [];

		const branches: BranchEntry[] = [];

		for (const line of Strings.lines(data + "\n")) {
			const spaceIndex = line.indexOf(" ");
			if (spaceIndex === -1) continue;

			const branchName = line.substring(spaceIndex + 1, line.length);
			branches.push({
				name: branchName,
				isCurrentBranch: line.indexOf("*") === 0,
			});
		}

		return branches;
	}
}
