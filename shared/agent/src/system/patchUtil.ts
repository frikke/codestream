import { Strings } from "codestream-common/string";
import { applyPatch, ParsedDiff } from "diff";

export function applyPatchToNormalizedContents(
	baseContents: string,
	patch: ParsedDiff | undefined
) {
	const normalizedEolBaseContents = Strings.normalizeFileContents(baseContents, {
		// Diffs from git may expect a trailing newline, so we need to preserve it
		preserveEof: true,
	});
	let patchedContents = normalizedEolBaseContents;
	if (patch !== undefined) {
		for (const hunk of patch.hunks) {
			for (let i = 0; i < hunk.lines.length; i++) {
				// strip BOM characters
				hunk.lines[i] = hunk.lines[i].replace(/\uFEFF/gm, "");
			}
		}

		patchedContents = applyPatch(normalizedEolBaseContents, patch);
		// @ts-ignore applyPatch returns false if patch is not compatible
		if (patchedContents === false) {
			// In-memory diffs may have been generated from contents where the trailing newline was trimmed
			const normalizeEolEofBaseContents = Strings.normalizeFileContents(baseContents);
			patchedContents = applyPatch(normalizeEolEofBaseContents, patch);
		}
	}
	return patchedContents;
}
