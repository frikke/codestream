import {
	ChangeDataType,
	DidChangeDataNotificationType,
	FetchThirdPartyPullRequestCommitsResponse,
} from "@codestream/protocols/agent";
import { LoadingMessage } from "@codestream/sidebar/src/components/LoadingMessage";
import { CodeStreamState } from "@codestream/sidebar/store";
import {
	getPullRequestCommits,
	getPullRequestCommitsFromProvider,
} from "@codestream/sidebar/store/providerPullRequests/thunks";
import { useAppDispatch, useAppSelector, useDidMount } from "@codestream/sidebar/utilities/hooks";
import copy from "copy-to-clipboard";
import { groupBy, orderBy } from "lodash-es";
import React, { useState } from "react";
import styled from "styled-components";
import { PRHeadshotName } from "../src/components/HeadshotName";
import { HostApi } from "../sidebar-api";
import Icon from "./Icon";
import { Link } from "./Link";
import Timestamp from "./Timestamp";
import Tooltip from "./Tooltip";

const PRCommitContent = styled.div`
	margin: 0 20px 20px 20px;
	position: relative;
	&:before {
		content: "";
		position: absolute;
		left: 11px;
		z-index: 0;
		top: 0;
		height: 100%;
		width: 2px;
		background: var(--base-border-color);
	}
`;

export const PRCommitCard = styled.div`
	position: relative;
	border: 1px solid;
	border-bottom: none;
	border-color: var(--base-border-color);
	background: var(--app-background-color);
	.vscode-dark &,
	&.dark-header {
		background: var(--base-background-color);
	}
	padding: 10px 15px 10px 15px;
	margin-left: 30px;
	z-index: 2;
	width: auto;
	h1 {
		font-size: 15px;
		font-weight: normal;
		margin: 0 0 8px 0;
		padding-right: 120px;
	}
	p {
		margin: 0;
		color: var(--text-color-subtle);
	}
	&:first-child {
		border-radius: 5px 5px 0 0;
	}
	&:last-child {
		border-radius: 0 0 5px 5px;
		border: 1px solid var(--base-border-color);
	}
	&:first-child:last-child {
		border-radius: 5px;
	}
`;

export const PRCommitDay = styled.div`
	position: relative;
	margin: 20px 0 15px 30px;
	.icon {
		position: absolute !important;
		left: -25px;
		background: var(--app-background-color);
		height: 19px;
		svg {
			opacity: 0.7;
		}
	}
`;

const PRCommitButtons = styled.div`
	position: absolute;
	right: 15px;
	top: 10px;
	.icon {
		display: inline-block;
		margin-left: 10px;
	}
	.icon,
	a {
		opacity: 0.7;
		color: var(--text-color);
		text-decoration: none;
		&:hover {
			opacity: 1;
			color: var(--text-color-info);
		}
	}
`;

export const PullRequestCommitsTab = props => {
	const { pr } = props;
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const currentPullRequestProviderId = state.context.currentPullRequest
			? state.context.currentPullRequest.providerId
			: null;
		let providerName;
		if (currentPullRequestProviderId) {
			providerName =
				currentPullRequestProviderId === "github*com" ||
				currentPullRequestProviderId === "github/enterprise"
					? "GitHub"
					: currentPullRequestProviderId === "gitlab*com" ||
					  currentPullRequestProviderId === "gitlab/enterprise"
					? "GitLab"
					: currentPullRequestProviderId === "bitbucket*org"
					? "Bitbucket"
					: undefined;
		}
		return {
			providerName: providerName,
			providerPullRequests: state.providerPullRequests.pullRequests,
			currentPullRequest: state.context.currentPullRequest,
			currentPullRequestId: state.context.currentPullRequest
				? state.context.currentPullRequest.id
				: undefined,
		};
	});

	const [isLoading, setIsLoading] = useState(true);
	const [commitsByDay, setCommitsByDay] = useState<{
		[identifier: string]: FetchThirdPartyPullRequestCommitsResponse[];
	}>({});

	const _mapData = (data: FetchThirdPartyPullRequestCommitsResponse[]) => {
		const commitsByDayGrouped = groupBy(data, _ => {
			// set hours,minutes,seconds to 0
			const normalizedAuthoredDate = new Date(
				new Date(_.authoredDate).setUTCHours(0, 0, 0, 0)
			).toISOString();
			return normalizedAuthoredDate;
		});

		setCommitsByDay(commitsByDayGrouped);
		setIsLoading(false);

		if (props.initialScrollPosition) {
			requestAnimationFrame(() => {
				const container = document.getElementById("pr-scroll-container");
				if (container) container.scrollTo({ top: props.initialScrollPosition });
			});
		}
	};

	const getData = async (options?: { force: true }) => {
		const data = await dispatch(
			getPullRequestCommits({
				providerId: pr.providerId,
				id: derivedState.currentPullRequestId!,
				options,
			})
		).unwrap();
		if (data) {
			_mapData(data);
		}
	};

	useDidMount(() => {
		setIsLoading(true);
		let disposable;
		(async () => {
			getData();

			disposable = HostApi.sidebarInstance.on(DidChangeDataNotificationType, async (e: any) => {
				if (e.type === ChangeDataType.Commits) {
					setIsLoading(true);
					const data = await dispatch(
						getPullRequestCommitsFromProvider({
							providerId: pr.providerId,
							id: derivedState.currentPullRequestId!,
						})
					).unwrap();
					if (data) {
						_mapData(data);
					}
				}
			});
		})();
		return () => {
			disposable?.dispose();
		};
	});

	if (isLoading)
		return (
			<div style={{ marginTop: "100px" }}>
				<LoadingMessage>Loading Commits...</LoadingMessage>
			</div>
		);

	const order = derivedState.providerName === "GitLab" ? "desc" : "asc";

	const getCommitUrl = commit => {
		if (commit?.url?.href) {
			return commit.url.href;
		} else if (!commit.url) {
			return `${pr.url}/commits/${commit.abbreviatedOid}`;
		} else {
			return commit.url;
		}
	};

	return (
		<PRCommitContent>
			{orderBy(Object.keys(commitsByDay), _ => _, order).map((day, index) => {
				return (
					<div key={index} data-testid={day}>
						<PRCommitDay>
							<Icon name="git-commit" />
							Commits on{" "}
							{new Intl.DateTimeFormat("en", {
								day: "numeric",
								month: "short",
								year: "numeric",
							}).format(new Date(day.toString()))}
						</PRCommitDay>
						<div>
							{orderBy(commitsByDay[day], "authoredDate", order).map((commit, index) => {
								const { author, committer } = commit;
								return (
									<PRCommitCard key={index} data-testid={"commit-" + commit.abbreviatedOid}>
										<h1>{commit.message}</h1>
										{author && committer && author.name !== committer.name && (
											<>
												<PRHeadshotName className="no-padding" person={author} />

												<span className="subtle"> authored and </span>
											</>
										)}
										<PRHeadshotName className="no-padding" person={committer} />
										<span className="subtle"> committed</span>
										<Timestamp time={commit.authoredDate} relative showTooltip />
										<PRCommitButtons>
											<Tooltip
												title={"View commit on " + derivedState.providerName}
												placement="bottom"
											>
												<span>
													<Link href={getCommitUrl(commit)} className="monospace">
														{commit.abbreviatedOid}
													</Link>
												</span>
											</Tooltip>
											<Icon
												title="Copy Sha"
												placement="bottom"
												name="copy"
												className="clickable"
												onClick={() => copy(commit.abbreviatedOid)}
											/>
											{derivedState.providerName &&
												derivedState.providerName.indexOf("GitHub") > -1 && (
													<Link
														href={
															pr.url &&
															pr.url.replace(/\/pull\/\d+$/, `/tree/${commit.abbreviatedOid}`)
														}
													>
														<Icon
															title={
																"Browse the repository at this point in the history on " +
																derivedState.providerName
															}
															className="clickable"
															placement="bottomRight"
															name="code"
														/>
													</Link>
												)}
										</PRCommitButtons>
									</PRCommitCard>
								);
							})}
						</div>
					</div>
				);
			})}
		</PRCommitContent>
	);
};
