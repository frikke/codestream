import {
	GetObservabilityAnomaliesResponse,
	LanguageAndVersionValidation,
} from "@codestream/protocols/agent";
import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { Link } from "./Link";
import { ObservabilityAnomaliesGroup } from "./ObservabilityAnomaliesGroup";
import { ErrorRow } from "@codestream/sidebar/Stream/Observability";
import { useAppDispatch, useAppSelector } from "@codestream/sidebar/utilities/hooks";
import { openModal } from "../store/context/actions";
import { WebviewModals } from "@codestream/sidebar/ipc/sidebar.protocol";
import { shallowEqual } from "react-redux";
import { CodeStreamState } from "../store";
import { CurrentMethodLevelTelemetry } from "@codestream/sidebar/store/context/types";
import { isEmpty as _isEmpty } from "lodash-es";
import {
	MissingCsharpExtension,
	MissingGoExtension,
	MissingJavaExtension,
	MissingPhpExtension,
	MissingPythonExtension,
	MissingRubyExtension,
	RubyPluginLanguageServer,
} from "./MethodLevelTelemetry/MissingExtension";

interface Props {
	observabilityAnomalies: GetObservabilityAnomaliesResponse;
	observabilityRepo: any;
	entityGuid: string;
	noAccess?: string;
	calculatingAnomalies?: boolean;
	distributedTracingEnabled?: boolean;
	languageAndVersionValidation?: LanguageAndVersionValidation;
}

export const ObservabilityAnomaliesWrapper = React.memo((props: Props) => {
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const clmSettings = state.preferences.clmSettings || {};
		return {
			clmSettings,
			currentMethodLevelTelemetry: (state.context.currentMethodLevelTelemetry ||
				{}) as CurrentMethodLevelTelemetry,
		};
	}, shallowEqual);

	const [expanded, setExpanded] = useState<boolean>(true);

	const dispatch = useAppDispatch();

	const totalAnomalyArray = props.observabilityAnomalies.errorRate.concat(
		props.observabilityAnomalies.responseTime
	);

	const showWarningIcon = totalAnomalyArray?.length > 0;
	const warningTooltip =
		showWarningIcon && totalAnomalyArray?.length === 1
			? "1 Anomaly"
			: `${totalAnomalyArray?.length} Anomalies`;

	let missingExtension;
	if (!_isEmpty(derivedState.currentMethodLevelTelemetry?.error?.type)) {
		switch (derivedState.currentMethodLevelTelemetry?.error?.type) {
			case "NO_RUBY_VSCODE_EXTENSION":
				missingExtension = <MissingRubyExtension sidebarView />;
				break;
			case "NO_JAVA_VSCODE_EXTENSION":
				missingExtension = <MissingJavaExtension sidebarView />;
				break;
			case "NO_PYTHON_VSCODE_EXTENSION":
				missingExtension = <MissingPythonExtension sidebarView />;
				break;
			case "NO_CSHARP_VSCODE_EXTENSION":
				missingExtension = <MissingCsharpExtension sidebarView />;
				break;
			case "NO_GO_VSCODE_EXTENSION":
				missingExtension = <MissingGoExtension sidebarView />;
				break;
			case "NO_PHP_VSCODE_EXTENSION":
				missingExtension = <MissingPhpExtension sidebarView />;
				break;
			case "RUBY_PLUGIN_NO_LANGUAGE_SERVER":
				missingExtension = <RubyPluginLanguageServer sidebarView />;
				break;
		}
	}

	// useEffect(() => {
	// 	if (!_isEmpty(props.languageAndVersionValidation)) {
	// 		HostApi.instance.track("CLM Blocked", {
	// 			cause: "Unsupported Agent",
	// 		});
	// 	}
	// }, [props.languageAndVersionValidation]);

	// useEffect(() => {
	// 	if (!props.distributedTracingEnabled) {
	// 		HostApi.instance.track("CLM Blocked", {
	// 			cause: "DT Not Enabled",
	// 		});
	// 	}
	// }, [props.distributedTracingEnabled]);

	return (
		<>
			<Row
				style={{
					padding: "0px 10px 0px 30px",
				}}
				className={"pr-row"}
				onClick={() => setExpanded(!expanded)}
				data-testid={`anomalies-dropdown`}
			>
				<span style={{ paddingTop: "3px" }}>
					{expanded && <Icon name="chevron-down-thin" />}
					{!expanded && <Icon name="chevron-right-thin" />}
				</span>
				<div className="label">
					<span style={{ margin: "0px 5px 0px 2px" }}>Code-Level Metrics</span>
					{showWarningIcon && (
						<Icon
							name="alert"
							style={{ color: "rgb(188,20,24)" }}
							className="alert"
							title={warningTooltip}
							delay={1}
						/>
					)}
				</div>

				<div className="icons">
					<span
						onClick={e => {
							e.preventDefault();
							e.stopPropagation();
							dispatch(openModal(WebviewModals.CLMSettings));
						}}
					>
						<Icon
							name="gear"
							className="clickable"
							title="Code-Level Metric Settings"
							placement="bottomLeft"
							delay={1}
						/>
					</span>
				</div>
			</Row>
			{expanded && props.observabilityAnomalies.error && !props.calculatingAnomalies && (
				<>
					<ErrorRow customPadding={"0 10px 0 50px"} title={props.observabilityAnomalies.error} />
				</>
			)}

			{/* Agent Version and Language check */}
			{expanded && !props.calculatingAnomalies && !_isEmpty(props.languageAndVersionValidation) && (
				<Row
					style={{
						padding: "2px 10px 2px 40px",
					}}
					className={"pr-row"}
				>
					<span style={{ marginLeft: "2px", whiteSpace: "normal" }}>
						Requires {props.languageAndVersionValidation?.language} agent version{" "}
						{props.languageAndVersionValidation?.required} or higher.
					</span>
				</Row>
			)}

			{/* Distrubuted Tracing Warning */}
			{expanded &&
				!props.distributedTracingEnabled &&
				!props.calculatingAnomalies &&
				_isEmpty(props.languageAndVersionValidation) && (
					<Row
						style={{
							padding: "2px 10px 2px 40px",
						}}
						className={"pr-row"}
					>
						<span style={{ marginLeft: "2px", whiteSpace: "normal" }}>
							Enable{" "}
							<Link href="https://docs.newrelic.com/docs/distributed-tracing/concepts/quick-start/">
								distributed tracing
							</Link>{" "}
							for this service to see code-level metrics.
						</span>
					</Row>
				)}

			{expanded && missingExtension && !props.calculatingAnomalies && (
				<>
					<Row
						style={{
							padding: "2px 10px 2px 40px",
						}}
						className={"pr-row"}
					>
						<span style={{ marginLeft: "2px", whiteSpace: "normal" }}>{missingExtension}</span>
					</Row>
				</>
			)}

			{expanded &&
				(props.noAccess ? (
					<Row
						style={{
							padding: "2px 10px 2px 40px",
						}}
						className={"pr-row"}
						onClick={() => setExpanded(!expanded)}
					>
						<span style={{ marginLeft: "2px", whiteSpace: "normal" }}>
							{props.noAccess === "403" ? (
								<>
									Your New Relic account doesn’t have access to the anomalies integration with
									CodeStream. Contact your New Relic admin to upgrade your account or{" "}
									<Link
										useStopPropagation={true}
										href="https://docs.newrelic.com/docs/accounts/original-accounts-billing/original-users-roles/user-migration"
									>
										migrate to New Relic’s new user model
									</Link>{" "}
									in order to see errors in CodeStream.
								</>
							) : (
								props.noAccess
							)}
						</span>
					</Row>
				) : (
					<>
						{props.calculatingAnomalies && (
							<div style={{ margin: "0px 0px 4px 47px" }}>
								<Icon className={"spin"} name="refresh" /> Calculating...
							</div>
						)}

						{!props.calculatingAnomalies &&
							props.distributedTracingEnabled &&
							_isEmpty(props.languageAndVersionValidation) && (
								<>
									<ObservabilityAnomaliesGroup
										observabilityAnomalies={props.observabilityAnomalies.errorRate}
										observabilityRepo={props.observabilityRepo}
										entityGuid={props.entityGuid}
										title="Error Rate Increase"
										detectionMethod={props.observabilityAnomalies.detectionMethod}
									/>
									<ObservabilityAnomaliesGroup
										observabilityAnomalies={props.observabilityAnomalies.responseTime}
										observabilityRepo={props.observabilityRepo}
										entityGuid={props.entityGuid}
										title="Average Duration Increase"
										detectionMethod={props.observabilityAnomalies.detectionMethod}
									/>
									<ObservabilityAnomaliesGroup
										observabilityAnomalies={props.observabilityAnomalies.allOtherAnomalies || []}
										observabilityRepo={props.observabilityRepo}
										entityGuid={props.entityGuid}
										title="All other methods"
										noAnomaly={true}
										collapseDefault={true}
										detectionMethod={props.observabilityAnomalies.detectionMethod}
									/>
								</>
							)}
					</>
				))}
		</>
	);
});
