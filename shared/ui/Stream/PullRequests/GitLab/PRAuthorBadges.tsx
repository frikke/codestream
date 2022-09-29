import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";
import React from "react";
import Tooltip from "../../Tooltip";

export const GHOST = {
	login: "ghost",
	avatarUrl:
		"https://avatars2.githubusercontent.com/u/10137?s=460&u=b1951d34a583cf12ec0d3b0781ba19be97726318&v=4",
};

// https://docs.github.com/en/graphql/reference/enums#commentauthorassociation
const AUTHOR_ASSOCIATION_MAP = {
	COLLABORATOR: ["Collaborator", "Author has been invited to collaborate on the repository."],
	CONTRIBUTOR: ["Contributor", "Author has previously committed to the repository."],
	FIRST_TIMER: ["First Timer", "Author has not previously committed to GitHub."],
	FIRST_TIME_CONTRIBUTOR: [
		"First Time Contributor",
		"Author has not previously committed to the repository.",
	],
	MEMBER: ["Member", "Author is a member of the organization that owns the repository."],
	// as per https://trello.com/c/P14tmDQQ/4528-dont-show-none-badge don't show "None"
	// NONE: ["None", "Author has no association with the repository."],
	OWNER: ["Owner", "Author is the owner of the repository."],
};

export const PRAuthorBadges = (props: {
	pr: FetchThirdPartyPullRequestPullRequest;
	node: any;
	isPending?: boolean;
}) => {
	const { pr, node, isPending } = props;

	const badges: any[] = [];

	if (isPending) {
		badges.push(<div className="pending">Pending</div>);
	}

	const nodeAuthor = node.author || GHOST;
	const prAuthor = pr.author || GHOST;
	if (prAuthor.login === nodeAuthor.login) {
		const isMe = pr.viewer && nodeAuthor.login === pr.viewer.login;
		badges.push(
			<Tooltip
				key="author"
				title={`${isMe ? "You are" : "This user is"} the author of this pull request`}
				placement="bottom"
			>
				<div className="author">Author</div>
			</Tooltip>
		);
	}

	if (AUTHOR_ASSOCIATION_MAP[node.authorAssociation]) {
		badges.push(
			<Tooltip
				key="association"
				title={AUTHOR_ASSOCIATION_MAP[node.authorAssociation][1]}
				placement="bottom"
			>
				<div className="member">{AUTHOR_ASSOCIATION_MAP[node.authorAssociation][0]}</div>
			</Tooltip>
		);
	} else {
		console.warn("NO MEMBER ASSOCIATION FOR: ", node.authorAssociation);
	}
	return <>{badges}</>;
};
