import { GetMyPullRequestsResponse, ThirdPartyProviderConfig } from "@codestream/protocols/agent";
import { PullRequestQuery } from "@codestream/protocols/api";
import React from "react";
import styled from "styled-components";

import { useAppDispatch, useAppSelector } from "@codestream/sidebar/utilities/hooks";
import { Button } from "../src/components/Button";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import { ButtonRow, Dialog } from "../src/components/Dialog";
import { PRHeadshot } from "../src/components/Headshot";
import { CodeStreamState } from "../store";
import { getMyPullRequests } from "../store/providerPullRequests/thunks";
import { getPRLabel } from "../store/providers/reducer";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import { Link } from "./Link";
import { Modal } from "./Modal";
import { PullRequestTooltip } from "./OpenPullRequests";
import Tag from "./Tag";
import Tooltip from "./Tooltip";

const PRTestResults = styled.div`
	margin: 20px -20px 0 -20px;
	padding-top: 20px;
	border-top: 1px solid var(--base-border-color);
	i {
		display: block;
		text-align: center;
	}
`;

interface Props {
	query?: PullRequestQuery;
	openReposOnly: boolean;
	save: Function;
	onClose: Function;
	prConnectedProviders: ThirdPartyProviderConfig[];
}

export function ConfigurePullRequestQuery(props: Props) {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { preferences, providers } = state;

		return {
			prLabel: getPRLabel(state),
			providers,
			allRepos:
				preferences.pullRequestQueryShowAllRepos == null
					? true
					: preferences.pullRequestQueryShowAllRepos,
		};
	});

	const filteredPrConnectedProviders = props.prConnectedProviders.filter(
		_ => _.id !== "bitbucket*org"
	);

	const defaultProviderId = React.useMemo(() => {
		if (props.query && props.query.providerId) return props.query.providerId;
		if (filteredPrConnectedProviders[0]) return filteredPrConnectedProviders[0].id;
		return "";
	}, [props]);

	const query: PullRequestQuery | undefined = props.query;
	const [providerIdField, setProviderIdField] = React.useState<string>(defaultProviderId);
	const [nameField, setNameField] = React.useState<string | undefined>(query?.name);
	const [queryField, setQueryField] = React.useState<string | undefined>(query?.query);
	const [validGHQueries, setvalidGHQueries] = React.useState(
		new Set([
			"user",
			"org",
			"repo",
			"author",
			"assignee",
			"mentions",
			"team",
			"commenter",
			"involves",
			"reviewed-by",
			"review-requested",
			"team-review-requested",
			"project",
		])
	);
	const [validGLQueries, setvalidGLQueries] = React.useState(
		new Set([
			"project_id",
			"group_id",
			"assignee_username",
			"assignee_id",
			"author_username",
			"author_id",
			"reviewer_username",
			"reviewer_id",
			"created_by_me",
			"recentCsCustomQuery",
			"my_reaction_emoji",
			"assigned_to_me",
		])
	);
	const [validQuery, setValidQuery] = React.useState<boolean>(true);
	const [errorQuery, setErrorQuery] = React.useState<boolean>(false);
	const [testPRSummaries, setTestPRSummaries] = React.useState<
		GetMyPullRequestsResponse[] | undefined
	>(undefined);
	const [isLoading, setIsLoading] = React.useState<boolean>(false);

	const providerDisplayName = React.useMemo(() => {
		if (derivedState.providers[providerIdField]) {
			const { name } = derivedState.providers[providerIdField];
			return PROVIDER_MAPPINGS[name] ? PROVIDER_MAPPINGS[name].displayName : "";
		} else {
			return "";
		}
	}, [providerIdField]);

	const customPullRequestFilterHelpLink = React.useMemo(() => {
		if (derivedState.providers[providerIdField]) {
			const { name } = derivedState.providers[providerIdField];
			return PROVIDER_MAPPINGS[name] ? PROVIDER_MAPPINGS[name].customPullRequestFilterHelpLink : "";
		} else {
			return "";
		}
	}, [providerIdField]);

	const customPullRequestFilterExample = React.useMemo(() => {
		if (derivedState.providers[providerIdField]) {
			const { name } = derivedState.providers[providerIdField];
			return PROVIDER_MAPPINGS[name] ? PROVIDER_MAPPINGS[name].customPullRequestFilterExample : "";
		} else {
			return "";
		}
	}, [providerIdField]);

	const isValidQuery = (query?: string) => {
		// "recent" is a special query string that we handle specifically
		if (!query) {
			return false;
		}
		if (query === "recent") {
			setValidQuery(true);
			return true;
		}
		if (providerIdField === "github*com" || providerIdField === "github/enterprise") {
			// Verify if valid query for Github
			const queryStr = query.replace(/:/g, " ").split(/\s+/);
			for (let word of queryStr) {
				if (validGHQueries.has(word)) {
					setValidQuery(true);
					return true;
				}
			}
			setValidQuery(false);
			return false;
		} else if (providerIdField === "gitlab*com" || providerIdField === "gitlab/enterprise") {
			// Verify if valid query for Gitlab
			const queryStr = query.replace(/[=&]/g, " ").replace(/[:]/g, " ").split(/\s+/);
			for (let word of queryStr) {
				if (validGLQueries.has(word)) {
					setValidQuery(true);
					return true;
				}
			}
			setValidQuery(false);
			return false;
		}
		setValidQuery(true);
		return true;
	};

	const fetchTestPRs = async (prQuery: PullRequestQuery) => {
		if (isValidQuery(prQuery.query)) {
			setIsLoading(true);
			setTestPRSummaries(undefined);
			try {
				// FIXME hardcoded github
				const response = await dispatch(
					getMyPullRequests({
						providerId: providerIdField,
						queries: [prQuery],
						openReposOnly: props.openReposOnly,
						options: {
							force: true,
						},
						test: true,
						throwOnError: true,
					})
				).unwrap();
				if (response && response.length) {
					setErrorQuery(false);
					setTestPRSummaries(response[0]);
				}
			} catch (ex) {
				if (ex && ex.indexOf('"message":"Bad credentials"') > -1) {
					// show message about re-authing?
				}
				setErrorQuery(true);
			} finally {
				setIsLoading(false);
			}
		}
	};

	const title = query?.query
		? `Edit ${derivedState.prLabel.PullRequest} Query`
		: `New ${derivedState.prLabel.PullRequest} Query`;
	return (
		<Modal translucent>
			<Dialog
				title={title}
				narrow
				onClose={() => {
					setValidQuery(true);
					setErrorQuery(false);
					props.onClose();
				}}
			>
				<div className="standard-form">
					<fieldset className="form-body">
						<span dangerouslySetInnerHTML={{ __html: customPullRequestFilterExample || "" }} />
						<div id="controls">
							<div style={{ margin: "20px 0" }}>
								{!query?.providerId && filteredPrConnectedProviders.length && (
									<>
										<label>PR Provider: &nbsp;</label>
										<InlineMenu
											items={filteredPrConnectedProviders.map(provider => {
												const providerDisplay = PROVIDER_MAPPINGS[provider.name];
												return {
													key: provider.id,
													label: providerDisplay.displayName,
													action: () => setProviderIdField(provider.id),
												};
											})}
										>
											{providerDisplayName}
										</InlineMenu>
										<div style={{ height: "10px" }} />
									</>
								)}
								<input
									autoFocus
									placeholder="Name Your Custom Query (optional)"
									name="query-name"
									value={nameField}
									className="input-text control"
									type="text"
									onChange={e => {
										setNameField(e.target.value);
									}}
								/>
								<div style={{ height: "10px" }} />
								{!validQuery ? (
									<ErrorMessage>
										<small className="error-message">
											Missing required qualifier.{" "}
											{providerIdField === "github*com" ||
											providerIdField === "github/enterprise" ? (
												<Link href="https://docs.newrelic.com/docs/codestream/how-use-codestream/pull-requests#github">
													Learn more.
												</Link>
											) : (
												<Link href="https://docs.newrelic.com/docs/codestream/how-use-codestream/pull-requests#gitlab">
													Learn more.
												</Link>
											)}
										</small>
									</ErrorMessage>
								) : (
									errorQuery && (
										<ErrorMessage>
											<small className="error-message">
												Invalid query.{" "}
												{providerIdField === "github*com" ||
												providerIdField === "github/enterprise" ? (
													<Link href="https://docs.newrelic.com/docs/codestream/how-use-codestream/pull-requests#github">
														Learn more.
													</Link>
												) : (
													<Link href="https://docs.newrelic.com/docs/codestream/how-use-codestream/pull-requests#gitlab">
														Learn more.
													</Link>
												)}
											</small>
										</ErrorMessage>
									)
								)}
								<input
									placeholder="Query"
									name="query"
									value={queryField}
									className="input-text control"
									type="text"
									onChange={e => {
										setQueryField(e.target.value);
									}}
								/>
								<div style={{ height: "10px" }} />
								{!derivedState.allRepos && (
									<Tooltip
										title="You can change this setting by closing the dialog and clicking the gear icon"
										placement="bottom"
										delay={1}
									>
										<span className="explainer">
											Queries are limited to repos you have open in your editor.
										</span>
									</Tooltip>
								)}
							</div>
						</div>
						<ButtonRow>
							<Button
								isLoading={isLoading}
								disabled={queryField?.length === 0}
								variant="secondary"
								onClick={() => {
									if (!queryField) {
										return;
									}
									fetchTestPRs({
										query: queryField,
										name: nameField,
										providerId: defaultProviderId,
										hidden: false,
									});
								}}
							>
								Test Query
							</Button>
							<Button
								disabled={queryField?.length === 0}
								onClick={() => {
									if (isValidQuery(queryField)) props.save(providerIdField, nameField, queryField);
								}}
							>
								Save Query
							</Button>
						</ButtonRow>
					</fieldset>
					{testPRSummaries !== undefined && (
						<PRTestResults>
							{testPRSummaries.length === 0 && (
								<i>No {derivedState.prLabel.PRs} match this query</i>
							)}
							{testPRSummaries.map(pr => {
								return (
									<Tooltip
										key={"pr-tt-" + pr.id}
										title={<PullRequestTooltip pr={pr} />}
										delay={1}
										placement="top"
									>
										<Row key={"pr-" + pr.id}>
											<div>
												<PRHeadshot person={pr.author} />
											</div>
											<div>
												<span>
													{pr.title} #{pr.number}
												</span>
												{pr.labels && pr.labels.nodes && pr.labels.nodes.length > 0 && (
													<span className="cs-tag-container">
														{pr.labels.nodes.map((_, index) => (
															<Tag key={index} tag={{ label: _.name, color: `#${_.color}` }} />
														))}
													</span>
												)}
												<span className="subtle">{pr.bodyText || pr.body}</span>
											</div>
										</Row>
									</Tooltip>
								);
							})}
						</PRTestResults>
					)}
				</div>
			</Dialog>
		</Modal>
	);
}

export const ErrorMessage = styled.div`
	text-align: right;
`;
