import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip as ReTooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	DidChangeObservabilityDataNotificationType,
	GetMethodLevelTelemetryRequestType,
	GetMethodLevelTelemetryResponse,
	WarningOrError,
} from "@codestream/protocols/agent";
import styled from "styled-components";

import Tooltip from "../Tooltip";
import { DelayedRender } from "@codestream/webview/Container/DelayedRender";
import {
	OpenUrlRequestType,
	RefreshEditorsCodeLensRequestType,
	UpdateConfigurationRequestType,
} from "@codestream/webview/ipc/host.protocol";
import { LoadingMessage } from "@codestream/webview/src/components/LoadingMessage";
import { CodeStreamState } from "@codestream/webview/store";
import { closeAllPanels } from "@codestream/webview/store/context/actions";
import { CurrentMethodLevelTelemetry } from "@codestream/webview/store/context/types";
import { useDidMount, usePrevious } from "@codestream/webview/utilities/hooks";
import { HostApi } from "@codestream/webview/webview-api";
import { PanelHeader } from "../../src/components/PanelHeader";
import { closePanel, setUserPreference } from "../actions";
import CancelButton from "../CancelButton";
import { DropdownButton } from "../DropdownButton";
import { EntityAssociator } from "../EntityAssociator";
import Icon from "../Icon";
import { Link } from "../Link";
import { WarningBox } from "../WarningBox";
import {
	MissingCsharpExtension,
	MissingGoExtension,
	MissingJavaExtension,
	MissingPhpExtension,
	MissingPythonExtension,
	MissingRubyExtension,
	RubyPluginLanguageServer,
} from "./MissingExtension";
import { MetaLabel } from "../Codemark/BaseCodemark";

const Root = styled.div``;

const ApmServiceTitle = styled.span`
	opacity: 0.5;
	a {
		color: var(--text-color-highlight);
		text-decoration: none;
	}
	.open-external {
		margin-left: 5px;
		font-size: 12px;
		visibility: hidden;
		color: var(--text-color-highlight);
	}
	& .open-external {
		visibility: visible;
	}
`;

const EntityDropdownContainer = styled.div`
	margin: 0 0 4px 0;
`;

const EMPTY_ARRAY = [];
export const MethodLevelTelemetryPanel = () => {
	const dispatch = useDispatch<any>();

	const derivedState = useSelector((state: CodeStreamState) => {
		return {
			showGoldenSignalsInEditor: state.configs.showGoldenSignalsInEditor,
			currentMethodLevelTelemetry: (state.context.currentMethodLevelTelemetry ||
				{}) as CurrentMethodLevelTelemetry,
			observabilityRepoEntities:
				(state.users[state.session.userId!].preferences || {}).observabilityRepoEntities ||
				EMPTY_ARRAY,
		};
	});

	const [telemetryResponse, setTelemetryResponse] = useState<
		GetMethodLevelTelemetryResponse | undefined
	>(undefined);
	const [loading, setLoading] = useState<boolean>(true);
	const [warningOrErrors, setWarningOrErrors] = useState<WarningOrError[] | undefined>(undefined);
	const previouscurrentMethodLevelTelemetry = usePrevious(derivedState.currentMethodLevelTelemetry);
	const [showGoldenSignalsInEditor, setshowGoldenSignalsInEditor] = useState<boolean>(
		derivedState.showGoldenSignalsInEditor || false
	);
	const loadData = async (newRelicEntityGuid: string) => {
		setLoading(true);
		try {
			if (!derivedState.currentMethodLevelTelemetry.repo?.id) {
				setWarningOrErrors([{ message: "Repository missing" }]);
				return;
			}
			if (!derivedState.currentMethodLevelTelemetry.metricTimesliceNameMapping) {
				setWarningOrErrors([{ message: "Repository metric timeslice names" }]);
				return;
			}

			const response = await HostApi.instance.send(GetMethodLevelTelemetryRequestType, {
				newRelicEntityGuid: newRelicEntityGuid,
				metricTimesliceNameMapping:
					derivedState.currentMethodLevelTelemetry.metricTimesliceNameMapping,
				repoId: derivedState.currentMethodLevelTelemetry.repo.id,
			});
			setTelemetryResponse(response);
		} catch (ex) {
			setWarningOrErrors([{ message: ex.toString() }]);
		} finally {
			setLoading(false);
		}
	};

	useDidMount(() => {
		HostApi.instance.track("MLT Codelens Clicked", {
			"NR Account ID": derivedState.currentMethodLevelTelemetry?.newRelicAccountId + "",
			Language: derivedState.currentMethodLevelTelemetry.languageId,
		});
		if (!derivedState.currentMethodLevelTelemetry.error) {
			loadData(derivedState.currentMethodLevelTelemetry.newRelicEntityGuid!);
		}
	});

	useEffect(() => {
		if (
			!previouscurrentMethodLevelTelemetry ||
			JSON.stringify(previouscurrentMethodLevelTelemetry) ===
				JSON.stringify(derivedState.currentMethodLevelTelemetry)
		) {
			return;
		}

		loadData(derivedState.currentMethodLevelTelemetry.newRelicEntityGuid!);
	}, [derivedState.currentMethodLevelTelemetry]);

	if (
		derivedState.currentMethodLevelTelemetry.error &&
		derivedState.currentMethodLevelTelemetry.error.type === "NOT_ASSOCIATED" &&
		derivedState.currentMethodLevelTelemetry.repo
	) {
		return (
			<Root className="full-height-codemark-form">
				<div
					style={{
						display: "flex",
						alignItems: "center",
						width: "100%",
					}}
				>
					<div
						style={{ marginLeft: "auto", marginRight: "13px", whiteSpace: "nowrap", flexGrow: 0 }}
					>
						<CancelButton onClick={() => dispatch(closePanel())} />
					</div>
				</div>

				<div className="embedded-panel">
					<EntityAssociator
						title="Method-Level Telemetry"
						label="Associate this repository with an entity from New Relic so that you can see golden signals right in your editor, and errors in the Observability section."
						onSuccess={async e => {
							HostApi.instance.track("MLT Repo Association", {
								"NR Account ID": derivedState.currentMethodLevelTelemetry.newRelicAccountId + "",
							});
							HostApi.instance.send(RefreshEditorsCodeLensRequestType, {});
							HostApi.instance.emit(DidChangeObservabilityDataNotificationType.method, {
								type: "RepositoryAssociation",
							});
							dispatch(closeAllPanels());
						}}
						remote={derivedState.currentMethodLevelTelemetry.repo.remote}
						remoteName={derivedState.currentMethodLevelTelemetry.repo.name}
					>
						<div>
							<br />
							<input
								id="dontShowGoldenSignalsInEditor"
								name="dontShowGoldenSignalsInEditor"
								type="checkbox"
								checked={!showGoldenSignalsInEditor}
								onClick={e => {
									HostApi.instance.send(UpdateConfigurationRequestType, {
										name: "showGoldenSignalsInEditor",
										value: !showGoldenSignalsInEditor,
									});
									setshowGoldenSignalsInEditor(!showGoldenSignalsInEditor);
								}}
							/>
							<label htmlFor="dontShowGoldenSignalsInEditor">
								Don't show repo association prompts in my editor
							</label>
						</div>
					</EntityAssociator>
				</div>
			</Root>
		);
	}

	const renderEntityDropdownSubtext = item => {
		let subtext;
		if (item.accountName && item.accountName.length > 25) {
			subtext = item.accountName.substr(0, 25) + "...";
		} else {
			subtext = item.accountName;
		}
		if (item.domain) {
			subtext += ` ${item.domain}`;
		}
		return subtext;
	};

	switch (derivedState.currentMethodLevelTelemetry?.error?.type) {
		case "NO_RUBY_VSCODE_EXTENSION":
			return <MissingRubyExtension />;
		case "NO_JAVA_VSCODE_EXTENSION":
			return <MissingJavaExtension />;
		case "NO_PYTHON_VSCODE_EXTENSION":
			return <MissingPythonExtension />;
		case "NO_CSHARP_VSCODE_EXTENSION":
			return <MissingCsharpExtension />;
		case "NO_GO_VSCODE_EXTENSION":
			return <MissingGoExtension />;
		case "NO_PHP_VSCODE_EXTENSION":
			return <MissingPhpExtension />;
		case "RUBY_PLUGIN_NO_LANGUAGE_SERVER":
			return <RubyPluginLanguageServer />;
	}

	return (
		<Root className="full-height-codemark-form">
			{!loading && (
				<div
					style={{
						whiteSpace: "nowrap",
						overflow: "hidden",
						textOverflow: "ellipsis",
					}}
				>
					<PanelHeader
						title={derivedState.currentMethodLevelTelemetry.functionName + " telemetry"}
					></PanelHeader>
				</div>
			)}
			<CancelButton onClick={() => dispatch(closePanel())} />

			<div className="plane-container" style={{ padding: "5px 20px 0px 10px" }}>
				<div className="standard-form vscroll">
					{warningOrErrors ? (
						<WarningBox items={warningOrErrors} />
					) : (
						<>
							{loading ? (
								<>
									<DelayedRender>
										<div style={{ display: "flex", alignItems: "center" }}>
											<LoadingMessage>Loading Telemetry...</LoadingMessage>
										</div>
									</DelayedRender>
								</>
							) : (
								<div>
									{telemetryResponse && (
										<EntityDropdownContainer>
											<b>Entity: </b>
											<DropdownButton
												items={(
													[
														{
															type: "search",
															placeholder: "Search...",
															action: "search",
															key: "search",
														},
													] as any
												).concat(
													telemetryResponse.newRelicEntityAccounts!.map((item, i) => {
														return {
															label: item.entityName,
															subtextWide: renderEntityDropdownSubtext(item),
															searchLabel: item.entityName,
															key: item.entityGuid + "-" + i,
															checked: item.entityGuid === telemetryResponse.newRelicEntityGuid!,
															action: async () => {
																const repoId = derivedState.currentMethodLevelTelemetry?.repo?.id;
																const newPreferences =
																	derivedState.observabilityRepoEntities.filter(
																		_ => _.repoId !== repoId
																	);
																if (repoId) {
																	newPreferences.push({
																		repoId: repoId,
																		entityGuid: item.entityGuid,
																	});
																	dispatch(
																		setUserPreference({
																			prefPath: ["observabilityRepoEntities"],
																			value: newPreferences,
																		})
																	);
																}

																// update the IDEs
																HostApi.instance.send(RefreshEditorsCodeLensRequestType, {});
																// tell other parts of the webview that we updated this
																HostApi.instance.emit(
																	DidChangeObservabilityDataNotificationType.method,
																	{
																		type: "Entity",
																		data: {
																			entityGuid: item.entityGuid,
																			repoId: repoId,
																		},
																	}
																);
																loadData(item.entityGuid);
															},
														};
													})
												)}
												selectedKey={telemetryResponse.newRelicEntityName!}
												variant={"secondary"}
												wrap
											>
												{telemetryResponse.newRelicEntityName!}
											</DropdownButton>
											{telemetryResponse && telemetryResponse.newRelicUrl && (
												<Tooltip
													title="View service summary on New Relic"
													placement="bottom"
													delay={1}
												>
													<ApmServiceTitle>
														<Link
															onClick={e => {
																e.preventDefault();
																HostApi.instance.track("Open Service Summary on NR", {
																	Section: "Code-level Metrics",
																});
																HostApi.instance.send(OpenUrlRequestType, {
																	url: telemetryResponse.newRelicUrl!,
																});
															}}
														>
															{" "}
															<Icon name="link-external" className="open-external"></Icon>
														</Link>
													</ApmServiceTitle>
												</Tooltip>
											)}
										</EntityDropdownContainer>
									)}
									<div style={{ margin: "0 0 11px 0" }}>
										<b>Repo:</b> {derivedState.currentMethodLevelTelemetry.repo?.name}
									</div>
									{derivedState?.currentMethodLevelTelemetry.relativeFilePath && (
										<div>
											<b>File:</b> {derivedState?.currentMethodLevelTelemetry.relativeFilePath}
										</div>
									)}
									<div>
										<br />
										{telemetryResponse &&
											telemetryResponse.goldenMetrics &&
											telemetryResponse.goldenMetrics.map((_, index) => {
												// hide charts with no data.
												if (!_?.result || _.result?.length === 0) return null;
												const title = _.title + (_.extrapolated ? " (extrapolated)" : "");
												return (
													<div
														key={"chart-" + index}
														style={{ marginLeft: "-28px", marginBottom: "15px" }}
													>
														<MetaLabel style={{ marginLeft: "27px" }}>{title}</MetaLabel>
														<ResponsiveContainer width="100%" height={300} debounce={1}>
															<LineChart
																width={500}
																height={300}
																data={_.result}
																margin={{
																	top: 5,
																	right: 0,
																	left: 0,
																	bottom: 5,
																}}
															>
																<CartesianGrid strokeDasharray="3 3" />
																<XAxis
																	dataKey="endDate"
																	tick={{ fontSize: 12 }}
																	tickFormatter={label =>
																		new Date(label).toLocaleTimeString(undefined, {
																			hour: "2-digit",
																			minute: "2-digit",
																		})
																	}
																/>
																<YAxis tick={{ fontSize: 12 }} />
																<ReTooltip
																	contentStyle={{ color: "#8884d8", textAlign: "center" }}
																/>
																<Legend wrapperStyle={{ fontSize: "0.95em" }} />
																<Line
																	type="monotone"
																	dataKey={_.title}
																	stroke="#8884d8"
																	activeDot={{ r: 8 }}
																	connectNulls={true}
																	name={title}
																/>
															</LineChart>
														</ResponsiveContainer>
													</div>
												);
											})}
									</div>
									{/* {telemetryResponse && telemetryResponse.newRelicUrl && (
										<div>
											<Link className="external-link" href={telemetryResponse.newRelicUrl}>
												View service details on New Relic <Icon name="link-external" />
											</Link>
										</div>
									)} */}
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</Root>
	);
};
