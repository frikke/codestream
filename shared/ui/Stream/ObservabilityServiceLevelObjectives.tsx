import { ServiceLevelObjectiveResult } from "@codestream/protocols/agent";
import React, { useState } from "react";
import { shallowEqual } from "react-redux";

import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { CodeStreamState } from "@codestream/webview/store";
import Tooltip from "@codestream/webview/Stream/Tooltip";
import { useAppSelector } from "@codestream/webview/utilities/hooks";
import { HostApi } from "@codestream/webview/webview-api";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";

interface Props {
	serviceLevelObjectives: ServiceLevelObjectiveResult[];
}

export const ObjectiveRow = (props: {
	objectiveName: string;
	objectiveResult: string;
	objectiveActual: string;
	objectiveTimeWindow: string;
	url?: string;
}) => {
	const sloColor = props.objectiveResult === "UNDER" ? "rgb(188,20,24)" : "#6a6";

	return (
		<Row className="pr-row" style={{ padding: "0 10px 0 40px" }}>
			<div></div>
			<div>
				<span>{props.objectiveName}</span>
			</div>
			<div className="icons">
				{props.url && (
					<span
						onClick={e => {
							e.preventDefault();
							e.stopPropagation();
							HostApi.instance.send(OpenUrlRequestType, {
								url: `${props.url}`,
							});
						}}
					>
						<Icon
							name="globe"
							className="clickable"
							title="View on New Relic"
							placement="bottomLeft"
							delay={1}
						/>
					</span>
				)}

				<Tooltip delay={1} placement="bottom">
					<span style={{ color: `${sloColor}`, paddingLeft: "5px" }} className={"status"}>
						{props.objectiveActual}% last {props.objectiveTimeWindow}
					</span>
				</Tooltip>
			</div>
		</Row>
	);
};

export const ObservabilityServiceLevelObjectives = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(false);
	const { serviceLevelObjectives } = props;

	const derivedState = useAppSelector((state: CodeStreamState) => {
		return {
			ideName: encodeURIComponent(state.ide.name || ""),
		};
	}, shallowEqual);

	const unmetObjectives = serviceLevelObjectives.filter(v => {
		return v.result === "UNDER";
	});
	const showWarningIcon = unmetObjectives?.length > 0;
	const warningTooltip =
		showWarningIcon && unmetObjectives?.length === 1
			? "1 non-compliant SLO"
			: `${unmetObjectives?.length} non-compliant SLOs`;

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 30px",
				}}
				className={"pr-row"}
				onClick={() => setExpanded(!expanded)}
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}
				<span style={{ marginRight: "5px" }}>Service Level Objectives</span>
				{showWarningIcon && (
					<Icon
						name="alert"
						style={{ color: "rgb(188,20,24)" }}
						className="alert"
						title={warningTooltip}
						delay={1}
					/>
				)}
			</Row>
			{expanded && (
				<>
					{serviceLevelObjectives.map((slo, index) => {
						return (
							<ObjectiveRow
								objectiveResult={slo.result}
								objectiveName={slo.name}
								objectiveActual={slo.actual}
								objectiveTimeWindow={slo.timeWindow}
								url={slo.summaryPageUrl}
							/>
						);
					})}
				</>
			)}
		</>
	);
});
