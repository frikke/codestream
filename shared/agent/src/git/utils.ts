import { Hunk, ParsedDiff } from "diff";

interface LineWithMetadata {
	line: string;
	position: number;
	index: number;
	lineNumber?: number | undefined;
}

export interface HunkWithMetadata extends Hunk {
	linesWithMetadata: LineWithMetadata[];
}

export interface ParsedDiffWithMetadata extends ParsedDiff {
	hunks: HunkWithMetadata[];
}

/**
 * Converts a line number into a diff hunk position
 *
 * @param {{ startLine: number; startHunk: Hunk }} start
 * @param {({ endLine: number; endHunk: Hunk | undefined })} end
 * @param {ParsedDiff} diff
 * @return {*}
 * @memberof PostsManager
 */
export function translateLineToPosition(
	start: { startLine: number; startHunk: Hunk },
	end: { endLine: number; endHunk: Hunk | undefined },
	diff: ParsedDiff
): {
	lineWithMetadata: LineWithMetadata;
} {
	// https://stackoverflow.com/questions/41662127/how-to-comment-on-a-specific-line-number-on-a-pr-on-github
	// according to github:
	/**
	 * The position value equals the number of lines down from the first "@@" hunk header in the file you want to add a comment.
	 * The line just below the "@@" line is position 1, the next line is position 2, and so on.
	 * The position in the diff continues to increase through lines of whitespace and additional hunks until the beginning of a new file.
	 *
	 * see: https://docs.github.com/en/rest/reference/pulls#create-a-review-for-a-pull-request
	 */

	let i = 0;
	let position = 0;
	for (const hunk of diff!.hunks) {
		// can't increment for the first hunk
		if (i !== 0) position++;
		const h = hunk as HunkWithMetadata;

		const linesWithMetadata = [];
		let j = 0;
		let lineNumber = h.newStart;
		for (const line of h.lines) {
			position++;
			const firstChar = line[0];
			const firstCharIsMinus = firstChar === "-";
			linesWithMetadata.push({
				line: line,
				position: position,
				index: j,
				// don't assign a line number to the removed lines
				lineNumber: firstCharIsMinus ? undefined : lineNumber,
			});
			if (!firstCharIsMinus) lineNumber++;
			j++;
		}
		h.linesWithMetadata = linesWithMetadata;
		i++;
	}

	const { startLine, startHunk } = start;
	const { endLine, endHunk } = end;

	let lineWithMetadata;
	if (startLine === endLine) {
		// is a single line if startLine === endLine
		// we don't care about the endHunk here (though it will === startingHunk)
		lineWithMetadata = (startHunk as any).linesWithMetadata.find(
			(b: any) => b.lineNumber === startLine
		);
	} else {
		if (endHunk && startHunk === endHunk) {
			// it is a range within the same hunk
			lineWithMetadata = (endHunk as any).linesWithMetadata.find(
				(b: any) => b.lineNumber === endLine
			);
		} else {
			// couldn't get an end hunk. since we can't create comments
			// across hunks, use the starting hunk
			lineWithMetadata = (startHunk as any).linesWithMetadata.find(
				(b: any) => b.lineNumber === startLine
			);
		}
	}

	return { lineWithMetadata };
}

/**
 *  Converts a position (across all diff hunks) to a line number
 *
 * @export
 * @param {(ParsedDiff | undefined)} diff
 * @return {*}  {(ParsedDiffWithMetadata | undefined)}
 */
export function translatePositionToLineNumber(
	diff: ParsedDiff | undefined
): ParsedDiffWithMetadata | undefined {
	if (!diff) return undefined;

	diff = diff as ParsedDiffWithMetadata;

	let i = 0;
	let position = 0;
	for (const hunk of diff!.hunks) {
		// can't increment for the first hunk
		if (i !== 0) position++;
		const h = hunk as HunkWithMetadata;

		const linesWithMetadata = [];
		let j = 0;
		let lineNumber = h.newStart;
		for (const line of h.lines) {
			position++;
			const firstChar = line[0];
			const firstCharIsMinus = firstChar === "-";
			linesWithMetadata.push({
				line: line,
				position: position,
				index: j,
				// don't assign a line number to the removed lines
				lineNumber: firstCharIsMinus ? undefined : lineNumber,
			});
			if (!firstCharIsMinus) lineNumber++;
			j++;
		}
		h.linesWithMetadata = linesWithMetadata;
		i++;
	}

	return diff as ParsedDiffWithMetadata;
}

/**
 * Given a complete set of diffs with metadata, return the line number from the hunk that
 * corresponds to this position
 *
 * @export
 * @param {ParsedDiffWithMetadata} diff
 * @param {number} position
 * @return {*}
 */
export function getLineNumber(diff: ParsedDiffWithMetadata, position: number): number | undefined {
	if (!diff) return undefined;
	// TODO some kind of nested map would be better here and below
	const hunk = diff.hunks.find(_ => _.linesWithMetadata.find(x => x.position === position));
	if (!hunk || hunk.linesWithMetadata?.length === 0) return undefined;

	const metadata = hunk.linesWithMetadata.find(_ => _.position === position);
	return metadata && metadata.lineNumber != null ? metadata.lineNumber : undefined;
}

/**
 * Util for get the name of a git repo on the web. Removes ".git" if ends with it
 *
 * @export
 * @param {string} name
 * @return {string} foo in `foo.git`
 */
export function toRepoName(name: string) {
	return name != null && name.toLowerCase().endsWith(".git")
		? name.substr(0, name.length - 4)
		: name;
}
