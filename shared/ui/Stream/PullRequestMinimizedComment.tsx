import React from "react";
import styled from "styled-components";
import Icon from "./Icon";

interface Props {
	reason: string;
	isResolved?: boolean;
	onClick: React.MouseEventHandler;
	className?: string;
}

const REASON_MAP = {
	resolved: "This comment was marked as resolved.",
	spam: "This comment was marked as spam.",
	abuse: "This comment was marked as disruptive content.",
	"off-topic": "This comment was marked as off-topic.",
	outdated: "This comment was marked as outdated.",
	duplicate: "This comment has been minimized.",
};

export const PullRequestMinimizedComment = styled((props: Props) => {
	const reason = REASON_MAP[props.reason] || props.reason;
	return (
		<div onClick={props.onClick} className={props.className}>
			<i>{reason}</i>
			<span>
				<Icon name="unfold" />
				{props.isResolved ? "Show resolved" : "Show comment"}
			</span>
		</div>
	);
})`
	&.threaded {
		margin: 0 0 30px 40px;
	}
	&.outline {
		margin-left: 90px;
		padding: 5px 10px;
		border: 1px solid var(--base-border-color);
		border-radius: 5px;
		background: var(--base-background-color);
	}
	display: flex;
	align-items; center;
	cursor: pointer;
	color: var(--text-color-subtle);
	> span {
		margin-left: auto;
		font-size: smaller;
		.icon {
			display: inline-block;
			margin-right: 5px;
			vertical-align: 1px;
		}
	}
`;
