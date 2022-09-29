import { ReviewPlus } from "@codestream/protocols/agent";
import { ReviewCheckpoint } from "@codestream/protocols/webview";
import React from "react";
import Icon from "../Icon";
import { markdownify } from "../Markdowner";

export const CommitList = (props: { review: ReviewPlus; checkpoint: ReviewCheckpoint }) => {
	const { review, checkpoint } = props;

	const changesetLines = React.useMemo(() => {
		const lines: any[] = [];
		let index = 0;
		for (let changeset of review.reviewChangesets) {
			if (checkpoint !== undefined && changeset.checkpoint !== checkpoint) continue;
			if (changeset.includeSaved || changeset.includeStaged) {
				lines.push(
					<div
						className={`row-with-icon-actions no-hover`}
						style={{ display: "flex", alignItems: "center" }}
						key={`saved-staged-${index}`}
					>
						<label className="ellipsis-right-container no-margin">
							<Icon name="save" />
							<span style={{ paddingLeft: "5px" }}>Uncommitted local changes</span>
						</label>
					</div>
				);
			}
			lines.push(
				...changeset.commits.map(commit => {
					// const selected = (derivedState.matchFile || "").endsWith(f.file);
					// const visited = f.reviewStatus && f.reviewStatus[derivedState.userId] === "visited";
					// const icon = noOnClick ? null : selected ? "arrow-right" : visited ? "ok" : "circle";
					return (
						<div
							className={`row-with-icon-actions no-hover`}
							style={{ display: "flex", alignItems: "center" }}
							key={commit.sha}
						>
							<label className="ellipsis-right-container no-margin" style={{ paddingLeft: "1px" }}>
								<Icon name="git-commit-vertical" />
								{commit.info && (
									<span
										style={{ paddingLeft: "4px" }}
										dangerouslySetInnerHTML={{
											// @ts-ignore
											__html: markdownify(commit.info.shortMessage, { excludeOnlyEmoji: true }),
										}}
									/>
								)}
							</label>
							<span
								className="message"
								style={{ textAlign: "right", flexGrow: 10, whiteSpace: "nowrap" }}
							>
								<span className="monospace">{commit.sha.substr(0, 8)}</span>
							</span>
							<span />
						</div>
					);
				})
			);
			index++;
		}
		return lines;
	}, [review, checkpoint]);

	return <>{changesetLines}</>;
};
