import {
	EntityAccount,
	GetLogFieldDefinitionsRequestType,
	GetLoggingEntitiesRequestType,
	GetLoggingPartitionsRequestType,
	GetLogsRequestType,
	GetObservabilityEntityByGuidRequestType,
	GetObservabilityReposRequestType,
	GetObservabilityReposResponse,
	GetSurroundingLogsRequestType,
	isNRErrorResponse,
	LogFieldDefinition,
	LogResult,
	LogResultSpecialColumns,
	TelemetryData,
} from "@codestream/protocols/agent";
import { IdeNames, OpenEditorViewNotificationType } from "@codestream/protocols/webview";
import { parseId } from "@codestream/webview/utilities/newRelic";
import React, { useEffect, useState } from "react";
import { useResizeDetector } from "react-resize-detector";
import { components, OptionProps } from "react-select";
import styled from "styled-components";
import { PanelHeader } from "../../src/components/PanelHeader";
import { useDidMount } from "../../utilities/hooks";
import { HostApi } from "../../webview-api";
import Button from "../Button";
import Icon from "../Icon";
import { Link } from "../Link";
import { APMLogRow } from "./APMLogRow";
import { PanelHeaderTitleWithLink } from "../PanelHeaderTitleWithLink";
import { Disposable } from "@codestream/webview/utils";
import { isEmpty as _isEmpty } from "lodash";
import { APMLogTableLoading } from "./APMLogTableLoading";
import { APMPartitions } from "./APMPartitions";
import { TableWindow } from "../TableWindow";
import { DropdownWithSearch } from "../DropdownWithSearch";
import { SelectCustomStyles } from "../AsyncPaginateCustomStyles";

export interface SelectedOption {
	value: string;
	label: string;
	disabled?: boolean;
}

const LogFilterBarContainer = styled.div`
	padding-bottom: 10px;

	.log-filter-bar-row {
		display: flex;

		.log-filter-bar-service {
			flex: 4;
		}

		.log-filter-bar-since {
			padding-left: 10px;
			flex: 2;
			justify-content: flex-end;
		}

		.log-filter-bar-partition {
			padding-left: 10px;
			flex: 2;
			justify-content: flex-end;
			min-width: 130px;
		}

		.log-filter-bar-query {
			flex: 9;

			.icon.search {
				top: 24px;
				left: 8px;
			}

			input.control {
				width: 100%;
				padding-left: 30px !important;
				border: 1px solid var(--base-border-color);
			}
		}

		.log-filter-bar-search {
			padding-left: 10px;
			flex: 1;
			justify-content: flex-end;

			button.query {
				width: 100%;
				height: 28px;
				margin-top: 18px;
			}
		}
	}
`;

type AdditionalType = { nextCursor?: string };

interface EntityAccountOption {
	label: string;
	value: string;
	accountName: string;
	entityTypeDescription: string;
	entityAccount: EntityAccount;
}

const OptionName = styled.div`
	color: var(--text-color);
	white-space: nowrap;
	overflow: hidden;
`;

const OptionType = styled.span`
	color: var(--text-color-subtle);
	font-size: smaller;
`;

const OptionAccount = styled.div`
	color: var(--text-color-subtle);
	font-size: smaller;
`;

const HeaderContainer = styled.div`
	display: flex;
	overflow: hidden;
	// overflow-y: scroll;
`;

const TimestampHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	height: 40px;
	background: var(--base-background-color);
	width: 20%;
	border-left: 1px solid var(--base-border-color);
	border-top: 1px solid var(--base-border-color);
	border-bottom: 1px solid var(--base-border-color);
`;

const MessageHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	height: 40px;
	background: var(--base-background-color);
	width: 80%;
	border: 1px solid var(--base-border-color);
`;

const Option = (props: OptionProps) => {
	const subtleLabel = props?.data?.entityAccount?.displayName
		? `(${props.data.entityAccount.displayName})`
		: "";

	const children = (
		<>
			<OptionName>
				{props.data?.label}
				<OptionType> {subtleLabel}</OptionType>
			</OptionName>
			<OptionAccount>
				{props.data?.accountName} ({props.data?.entityAccount.accountId})
			</OptionAccount>
		</>
	);
	return <components.Option {...props} children={children} />;
};

const sinceOptions: SelectedOption[] = [
	{ value: "30 MINUTES AGO", label: "30 Minutes Ago" },
	{ value: "60 MINUTES AGO", label: "60 Minutes Ago" },
	{ value: "3 HOURS AGO", label: "3 Hours Ago" },
	{ value: "8 HOURS AGO", label: "8 Hours Ago" },
	{ value: "1 DAY AGO", label: "1 Day Ago" },
	{ value: "3 DAYS AGO", label: "3 Days Ago" },
	{ value: "7 DAYS AGO", label: "7 Days Ago" },
];

const defaultSinceOption: SelectedOption = {
	value: "30 MINUTES AGO",
	label: "30 Minutes Ago",
};

const maxSinceOption: SelectedOption = {
	value: "7 DAYS AGO",
	label: "7 Days Ago",
};

const defaultPartition: SelectedOption = {
	value: "Log",
	label: "Log",
	disabled: true,
};

export const APMLogSearchPanel = (props: {
	entryPoint: string;
	entityGuid?: string;
	traceId?: string;
	suppliedQuery?: string;
	ide?: { name?: IdeNames };
}) => {
	const [fieldDefinitions, setFieldDefinitions] = useState<LogFieldDefinition[]>([]);
	const [isInitializing, setIsInitializing] = useState<boolean>(true);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [query, setQuery] = useState<string>("");
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [hasSearched, setHasSearched] = useState<boolean>(false);

	const [selectedSinceOption, setSelectedSinceOption] = useState<SelectedOption | undefined>(
		undefined
	);
	const [selectedEntityAccount, setSelectedEntityAccount] = useState<OptionProps | undefined>(
		undefined
	);

	const [hasPartitions, setHasPartitions] = useState<boolean>(false);
	const [selectPartitionOptions, setSelectPartitionOptions] = useState<SelectedOption[]>([]);
	const [selectedPartitions, setSelectedPartitions] = useState<SelectedOption[]>([]);

	const [originalSearchResults, setOriginalSearchResults] = useState<LogResult[]>([]);
	const [searchResults, setSearchResults] = useState<LogResult[]>([]);

	const [currentShowSurroundingIndex, setCurrentShowSurroundingIndex] = useState<
		number | undefined
	>(undefined);
	const [queriedWithNonEmptyString, setQueriedWithNonEmptyString] = useState<boolean>(false);
	const [totalItems, setTotalItems] = useState<number>(0);
	const [logInformation, setLogInformation] = useState<string | undefined>("");
	const [logError, setLogError] = useState<string | undefined>("");
	const { height, ref } = useResizeDetector();
	const { width: entitySearchWidth, ref: entitySearchRef } = useResizeDetector();
	const trimmedListHeight: number = (height ?? 0) - (height ?? 0) * 0.08;
	const disposables: Disposable[] = [];
	const [currentTraceId, setTraceId] = useState<string | undefined>(props.traceId);
	const [entitiesLoading, setEntitiesLoading] = useState<boolean>(false);

	useEffect(() => {
		if (isInitializing) {
			return;
		}

		fetchLogs();
	}, [currentTraceId, query, selectedEntityAccount, selectedPartitions, selectedSinceOption]);

	useDidMount(() => {
		disposables.push(
			HostApi.instance.on(OpenEditorViewNotificationType, e => {
				if (e.traceId && e.traceId !== currentTraceId) {
					setTraceId(e.traceId);
					setSelectedSinceOption(maxSinceOption);
				}

				if (e.query && e.query !== query) {
					setSearchTerm(e.query);
					setQuery(e.query);
				}
			})
		);

		if (props.traceId) {
			setTraceId(props.traceId);
		}

		// if we have a traceId, we'll default to 7 days ago
		props.traceId
			? setSelectedSinceOption(maxSinceOption)
			: setSelectedSinceOption(defaultSinceOption);

		setSelectedPartitions([defaultPartition]);

		// possible there is no query coming in
		if (props.suppliedQuery) {
			setSearchTerm(props.suppliedQuery);
			setQuery(props.suppliedQuery);
		}

		const finishHandlingEntityAccount = (entityAccount: EntityAccount) => {
			handleSelectDropdownOption({
				entityGuid: entityAccount.entityGuid,
				accountName: entityAccount.accountName,
				entityTypeDescription: entityAccount.entityTypeDescription,
				entityAccount: entityAccount,
			});

			Promise.all([
				fetchFieldDefinitions(entityAccount),
				fetchPartitions(entityAccount),
				// not trusting state to be fully set here, so we'll pass everything in as overrides
				fetchLogs({
					overrideEntityAccount: entityAccount,
					overrideQuery: props.suppliedQuery,
					overrideTraceId: props.traceId,
					overridePartitions: [defaultPartition],
					overrideSince: props.traceId ? maxSinceOption : defaultSinceOption,
				}),
			])
				.then(results => {
					setIsInitializing(false);
				})
				.catch(error => {
					console.error("At least one promise encountered an error:", error);
					setIsInitializing(false);
				});
		};

		let entityAccounts: EntityAccount[] = [];

		setEntitiesLoading(true);

		HostApi.instance
			.send(GetObservabilityReposRequestType, { force: true })
			.then((_: GetObservabilityReposResponse) => {
				entityAccounts = _.repos?.flatMap(r => r.entityAccounts) ?? [];

				let entityAccount = entityAccounts.find(ea => ea.entityGuid === props.entityGuid);

				if (entityAccount) {
					trackOpenTelemetry(props.entryPoint, entityAccount.entityGuid, entityAccount.accountId);
					finishHandlingEntityAccount(entityAccount);
				} else if (props.entityGuid) {
					HostApi.instance
						.send(GetObservabilityEntityByGuidRequestType, { id: props.entityGuid })
						.then(({ entity }) => {
							trackOpenTelemetry(props.entryPoint, entity.entityGuid, entity.accountId);
							finishHandlingEntityAccount(entity);
						})
						.catch(ex => {
							setLogInformation("Please select an entity from the list above.");
							trackOpenTelemetry(props.entryPoint);
							setIsInitializing(false);
						});
				} else {
					// its possible a race condition could get us here and the entity guid passed in doesn't match any in the list
					// allow it, so the user can still use the panel - it just won't have a default selection/query/execution.
					trackOpenTelemetry(props.entryPoint);
					setIsInitializing(false);
				}
			})
			.catch(ex => {
				setLogInformation("Please select an entity from the list above.");
				setIsInitializing(false);
			})
			.finally(() => {
				setEntitiesLoading(false);
			});

		return () => {
			disposables && disposables.forEach(_ => _.dispose());
		};
	});

	const handleSelectDropdownOption = (optionProps?: OptionProps) => {
		if (!optionProps) {
			setSelectedEntityAccount(undefined);
			return;
		}

		const subtleLabel = optionProps?.entityAccount?.displayName
			? `(${optionProps.entityAccount.displayName})`
			: "";

		const customLabel = (
			<>
				<span>{optionProps.entityAccount.entityName}</span>
				<span className="subtle"> {subtleLabel}</span>
			</>
		);

		setSelectedEntityAccount({
			value: optionProps.entityGuid,
			label: customLabel,
			accountName: optionProps.accountName,
			entityTypeDescription: optionProps.entityTypeDescription,
			entityAccount: optionProps.entityAccount,
		});
	};

	const handleError = (message: string) => {
		setLogError(message);
		console.error(message);
	};

	const fetchFieldDefinitions = async (entityAccount: EntityAccount) => {
		try {
			const response = await HostApi.instance.send(GetLogFieldDefinitionsRequestType, {
				entity: entityAccount,
			});

			if (!response) {
				handleError(
					"An unexpected error occurred while fetching log field information; please contact support."
				);
				return;
			}

			if (isNRErrorResponse(response?.error)) {
				handleError(response.error?.error?.message ?? response.error?.error?.type);
				return;
			}

			if (response.logDefinitions) {
				setFieldDefinitions(response.logDefinitions);
			}
		} catch (ex) {
			handleError(ex);
		}
	};

	const checkKeyPress = (e: { keyCode: Number }) => {
		const { keyCode } = e;
		if (keyCode === 13) {
			setQuery(searchTerm);
		}
	};

	/**
	 * Given properties of a specific log entry, querys for logs that occurred BEFORE it
	 * and logs that occured AFTER it
	 */
	const fetchSurroundingLogs = async (
		entityAccount: EntityAccount,
		messageId: string,
		since: number
	) => {
		try {
			setSearchResults([]);
			setIsLoading(true);
			const response = await HostApi.instance.send(GetSurroundingLogsRequestType, {
				entity: entityAccount,
				messageId,
				since,
			});

			if (!response) {
				handleError(
					"An unexpected error occurred while fetching surrounding log information; please contact support."
				);
				return;
			}

			if (isNRErrorResponse(response?.error)) {
				handleError(response.error?.error?.message ?? response.error?.error?.type);
				return;
			}

			const surroundingLogs: LogResult[] = [];

			if (response.beforeLogs && response.beforeLogs.length > 0) {
				surroundingLogs.push(...response.beforeLogs);
			}

			const originalLog = searchResults.find(r => {
				return r.messageId === messageId;
			});

			//this should ALWAYS be true, if not, bigger issue
			surroundingLogs.push(originalLog!);

			if (response.afterLogs && response.afterLogs.length > 0) {
				surroundingLogs.push(...response.afterLogs);
			}

			const logToPinIndex = surroundingLogs.findIndex(r => {
				return r.messageId === messageId;
			});
			surroundingLogs[logToPinIndex] = {
				...surroundingLogs[logToPinIndex],
				isShowSurrounding: "true",
			};
			setCurrentShowSurroundingIndex(logToPinIndex);
			setSearchResults(surroundingLogs);

			HostApi.instance.track("codestream/logs/show_surrounding_button clicked", {
				entity_guid: `${entityAccount.entityGuid}`,
				account_id: entityAccount.accountId,
				event_type: "click",
			});
		} catch (ex) {
			handleError(ex);
		} finally {
			setIsLoading(false);
		}
	};

	const fetchPartitions = async (entityAccount: EntityAccount) => {
		try {
			const response = await HostApi.instance.send(GetLoggingPartitionsRequestType, {
				accountId: entityAccount.accountId,
			});

			if (!response) {
				handleError(
					"An unexpected error occurred while fetching your available log partitions; please contact support."
				);
				return;
			}

			if (isNRErrorResponse(response?.error)) {
				handleError(response.error?.error?.message ?? response.error?.error?.type);
				return;
			}

			// partition query doesn't bring back the default partition, so we'll add it here
			const defaultPartition = { label: "Log", value: "Log", disabled: true };

			if (response.partitions && response.partitions.length > 0) {
				const partitionOptions: { label: string; value: string; disabled?: boolean }[] =
					response.partitions.map(p => {
						return {
							label: p,
							value: p,
							disabled: false,
						};
					});

				partitionOptions.unshift(defaultPartition);
				setSelectPartitionOptions(partitionOptions);
				setHasPartitions(true);
			}

			setSelectedPartitions([defaultPartition]);
		} catch (ex) {
			handleError(ex);
		}
	};

	const fetchLogs = async (options?: {
		overrideEntityAccount?: EntityAccount;
		overrideQuery?: string;
		overrideTraceId?: string;
		overridePartitions?: SelectedOption[];
		overrideSince?: SelectedOption;
	}) => {
		try {
			setLogError(undefined);
			setLogInformation(undefined);
			setHasSearched(true);
			setIsLoading(true);
			setSearchResults([]);
			setOriginalSearchResults([]);
			setTotalItems(0);
			setCurrentShowSurroundingIndex(undefined);

			const filterText = options?.overrideQuery || query;
			const entityAccount = options?.overrideEntityAccount || selectedEntityAccount?.entityAccount;

			if (!entityAccount) {
				setLogInformation("Please select an entity from the list above.");
				return;
			}

			const partitions =
				options?.overridePartitions?.length ?? 0 > 0
					? options?.overridePartitions!
					: selectedPartitions;

			// you can clear the list entirely, but we must have at least one
			if (partitions?.length && partitions.length === 0) {
				handleError("Please select at least one partition from the drop down before searching.");
				return;
			}

			const since = options?.overrideSince?.value || selectedSinceOption?.value || "30 MINUTES AGO";
			const traceId = options?.overrideTraceId || currentTraceId;

			const response = await HostApi.instance.send(
				GetLogsRequestType,
				{
					entity: entityAccount,
					traceId: traceId,
					filterText,
					partitions: partitions.map(p => p.value),
					limit: "MAX",
					since: since,
					order: {
						field: "timestamp",
						direction: "DESC",
					},
				},
				{
					timeoutMs: 660000, // 11 minutes. NR1/GraphQL should timeout at 10 minutes, but we'll give it a little extra
				}
			);

			setQueriedWithNonEmptyString(!_isEmpty(filterText));

			if (!response) {
				handleError(
					"An unexpected error occurred while fetching log information; please contact support."
				);
				return;
			}

			if (isNRErrorResponse(response?.error)) {
				if (response?.error?.error?.message?.startsWith("NRQL Syntax Error")) {
					handleError(
						"Please check your syntax and try again. Note that you do not have to escape special characters. We'll do that for you!"
					);
				} else if (response?.error?.error?.message?.includes("NRDB:1101002")) {
					handleError(
						"Unfortunately, this query has timed out. Please try a shorter time range, more specific search criteria, or navigate to New Relic One to run this query."
					);
				} else {
					handleError(response.error?.error?.message ?? response.error?.error?.type);
				}
				return;
			}

			if (response.logs && response.logs.length > 0) {
				setSearchResults(response.logs);
				setOriginalSearchResults(response.logs);
				setTotalItems(response.logs.length);
			}

			trackSearchTelemetry(
				entityAccount.entityGuid,
				entityAccount.accountId,
				entityAccount.displayName,
				(response?.logs?.length ?? 0) > 0
			);
		} catch (ex) {
			handleError(ex);
		} finally {
			setIsLoading(false);
		}
	};

	const trackSearchTelemetry = (
		entityGuid: string,
		accountId: number,
		entityDisplayName: string,
		resultsReturned: boolean
	) => {
		HostApi.instance.track("codestream/logs/search succeeded", {
			entity_guid: `${entityGuid}`,
			account_id: accountId,
			event_type: "response",
			meta_data: `results_returned: ${resultsReturned}`,
			meta_data_2: `entity_type: ${entityDisplayName}`,
		});
	};

	const trackOpenTelemetry = (entryPoint: string, entityGuid?: string, accountId?: number) => {
		const payload = {
			event_type: "modal_display",
			meta_data: `entry_point: ${entryPoint}`,
		} as TelemetryData;

		if (entityGuid) {
			payload["entity_guid"] = entityGuid;
		}

		if (accountId) {
			payload["account_id"] = accountId;
		}

		HostApi.instance.track("codestream/logs/webview displayed", payload);
	};

	async function loadEntities(search: string, _loadedOptions, additional?: AdditionalType) {
		const result = await HostApi.instance.send(GetLoggingEntitiesRequestType, {
			searchCharacters: search,
			nextCursor: additional?.nextCursor,
		});

		const options = result.entities.map(e => {
			return {
				label: e.entityName,
				value: e.entityGuid,
				accountName: e.accountName,
				entityTypeDescription: e.entityTypeDescription,
				entityAccount: e,
			};
		}) as EntityAccountOption[];

		return {
			options,
			hasMore: !!result.nextCursor,
			additional: {
				nextCursor: result.nextCursor,
			},
		};
	}

	const ListHeader = () => {
		return (
			<HeaderContainer>
				<TimestampHeader>
					<p>timestamp</p>
				</TimestampHeader>
				<MessageHeader>
					<p>message</p>
				</MessageHeader>
			</HeaderContainer>
		);
	};

	const updateExpandedContent = (index, updatedJsx) => {
		const newResults = [...searchResults];
		newResults[index] = { ...newResults[index], expandedContent: updatedJsx };
		setSearchResults(newResults);
	};

	const updateShowSurrounding = async (index: number, task: string) => {
		if (task === "reset") {
			const modifiedSearchResults = originalSearchResults.map(
				({ isShowSurrounding, ...keepAttrs }) => keepAttrs
			);

			setSearchResults(modifiedSearchResults);
			setOriginalSearchResults(modifiedSearchResults);
			setCurrentShowSurroundingIndex(undefined);
		} else {
			const pinnedLog = searchResults[index];
			await fetchSurroundingLogs(
				selectedEntityAccount.entityAccount,
				pinnedLog.messageId,
				parseInt(pinnedLog.timestamp)
			);
		}
	};

	const formatRowResults = () => {
		if (searchResults) {
			let _results: LogResult[] = searchResults;
			// @TODO: eventually hook up "Show More"
			// if (_results[_results.length - 1]?.showMore !== "true") {
			// 	_results.push({ showMore: "true" });
			// }
			return _results.map((r, index) => {
				const messageField = r[LogResultSpecialColumns.message];
				const severityField = r[LogResultSpecialColumns.severity];

				const timestamp = r?.timestamp;
				const message = r[messageField] ?? "";
				const severity = r[severityField] ?? "";
				const showMore = r?.showMore ? true : false;
				const expandedContent = r?.expandedContent ?? undefined;
				const isShowSurrounding = r?.isShowSurrounding ?? false;
				const entityGuid = selectedEntityAccount?.value;
				const accountId = parseId(entityGuid);
				const enableShowSurrounding =
					queriedWithNonEmptyString &&
					!currentShowSurroundingIndex &&
					selectedPartitions.length === 1;

				return (
					<APMLogRow
						index={index}
						timestamp={timestamp}
						message={message}
						severity={severity}
						accountId={accountId?.accountId}
						entityGuid={entityGuid}
						logRowData={r}
						showMore={showMore}
						isShowSurrounding={isShowSurrounding}
						updateExpandedContent={updateExpandedContent}
						updateShowSurrounding={updateShowSurrounding}
						expandedContent={expandedContent}
						enableShowSurrounding={enableShowSurrounding}
					/>
				);
			});
		} else return;
	};

	return (
		<>
			<PanelHeader
				title={
					<PanelHeaderTitleWithLink
						text="Learn how to search for specific log lines in your code"
						href={`https://docs.newrelic.com/docs/codestream/observability/log-search/#context-menu`}
						title="Logs"
					/>
				}
			>
				<LogFilterBarContainer>
					<div className="log-filter-bar-row">
						<div className="log-filter-bar-service" ref={entitySearchRef}>
							<DropdownWithSearch
								selectedOption={selectedEntityAccount}
								loadOptions={loadEntities}
								id="input-entity-log-autocomplete"
								name="entity-log-autocomplete"
								handleChangeCallback={handleSelectDropdownOption}
								tabIndex={1}
								customOption={Option}
								customWidth={entitySearchWidth?.toString()}
								isLoading={entitiesLoading}
								valuePlaceholder="Please select an entity"
							/>
						</div>

						<div className="log-filter-bar-since">
							<SelectCustomStyles
								id="input-since"
								name="since"
								classNamePrefix="react-select"
								value={selectedSinceOption}
								placeholder="Since"
								options={sinceOptions}
								onChange={value => setSelectedSinceOption(value)}
								tabIndex={2}
								isSearchable={false}
							/>
						</div>

						{hasPartitions && (
							<APMPartitions
								selectedPartitions={selectedPartitions}
								selectPartitionOptions={selectPartitionOptions}
								partitionsCallback={setSelectedPartitions}
							/>
						)}
					</div>

					<div className="log-filter-bar-row">
						<div className="log-filter-bar-query">
							<Icon name="search" className="search" />
							<input
								data-testid="query-text"
								name="q"
								value={searchTerm}
								className="input-text control"
								type="text"
								onChange={e => {
									setSearchTerm(e.target.value);
								}}
								onKeyDown={checkKeyPress}
								placeholder="Query logs in the selected entity"
								tabIndex={hasPartitions ? 4 : 3}
								autoFocus
							/>
						</div>

						<div className="log-filter-bar-search">
							<Button
								data-testid="query-btn"
								className="query"
								onClick={() => {
									setQuery(searchTerm);
								}}
								loading={isLoading}
								tabIndex={hasPartitions ? 5 : 4}
							>
								Query Logs
							</Button>
						</div>
					</div>
				</LogFilterBarContainer>
			</PanelHeader>
			<div
				ref={ref}
				style={{
					padding: "0px 20px 0px 20px",
					marginBottom: "20px",
					width: "100%",
					height: "100%",
				}}
			>
				<div>
					{isLoading && <APMLogTableLoading height={height} />}

					{!logError &&
						!logInformation &&
						!isLoading &&
						searchResults &&
						totalItems > 0 &&
						fieldDefinitions &&
						!isInitializing && (
							<>
								{ListHeader()}
								<TableWindow
									itemData={formatRowResults()}
									itemCount={searchResults.length}
									height={trimmedListHeight}
									width={"100%"}
									currentShowSurroundingIndex={currentShowSurroundingIndex}
								/>
							</>
						)}

					{!logError &&
						!logInformation &&
						!totalItems &&
						!isLoading &&
						!hasSearched &&
						!isInitializing && (
							<div className="no-matches" style={{ margin: "0", fontStyle: "unset" }}>
								<span data-testid="default-message">
									Enter search criteria above, or just click Query to see recent logs.
								</span>
							</div>
						)}

					{!logError &&
						!logInformation &&
						!totalItems &&
						!isLoading &&
						hasSearched &&
						!isInitializing && (
							<div className="no-matches" style={{ margin: "0", fontStyle: "unset" }}>
								<h4>No logs found during this time range</h4>
								<span>
									Try adjusting your time range or{" "}
									<Link href="https://docs.newrelic.com/docs/logs/logs-context/annotate-logs-logs-context-using-apm-agent-apis/">
										set up log management
									</Link>
								</span>
							</div>
						)}

					{logError && !logInformation && !isInitializing && (
						<div className="no-matches" style={{ margin: "0", fontStyle: "unset" }}>
							<h4>Uh oh, we've encounted an error!</h4>
							<span>{logError}</span>
						</div>
					)}
					{logInformation && !logError && !isInitializing && (
						<div className="no-matches" style={{ margin: "0", fontStyle: "unset" }}>
							<h4>{logInformation}</h4>
						</div>
					)}
				</div>
			</div>
		</>
	);
};
