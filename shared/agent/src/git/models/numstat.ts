import { FileStatus } from "codestream-common/api-protocol";

export interface GitNumStat {
	oldFile: string;
	file: string;
	linesAdded: number;
	linesRemoved: number;
	status: FileStatus;
	statusX: FileStatus;
	statusY: FileStatus;
}
