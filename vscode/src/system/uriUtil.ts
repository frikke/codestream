import { CSReviewCheckpoint } from "codestream-common/api-protocol";

const csReviewDiffUrlRegex = /codestream-diff:\/\/(\w+)\/(\w+)\/(\w+)\/(\w+)\/(.+)/;
export function parseCSReviewDiffUrl(uri: string):
	| {
			reviewId: string;
			checkpoint: CSReviewCheckpoint;
			repoId: string;
			version: string;
			path: string;
	  }
	| undefined {
	const match = csReviewDiffUrlRegex.exec(uri.toString());
	if (match == null) return undefined;

	const [, reviewId, checkpoint, repoId, version, path] = match;
	return {
		reviewId,
		checkpoint: checkpoint === "undefined" ? undefined : parseInt(checkpoint, 10),
		repoId,
		version,
		path,
	};
}
