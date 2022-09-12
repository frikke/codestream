import { forEach as _forEach, isEmpty as _isEmpty } from "lodash-es";
import React, { useEffect, useState } from "react";
import { ALERT_SEVERITY_COLORS } from "./CodeError/index";
import styled from "styled-components";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import { HostApi } from "@codestream/webview/webview-api";
import { OpenUrlRequestType } from "@codestream/protocols/webview";

interface RecentAlertViolation {
	agentUrl: string;
	alertSeverity: string;
	closedAt: string;
	label: string;
	level: string;
	openedAt: string;
	violationId: string;
	violationUrl: string;
}

interface RecentAlertViolations extends Array<RecentAlertViolation> {}

interface Props {
	alertViolations: RecentAlertViolations;
	customPadding?: string;
}

export const ObservabilityAlertViolations = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(false);
	const { alertViolations, customPadding } = props;
	// const alertSeverityColor = ALERT_SEVERITY_COLORS[relatedEntity?.alertSeverity];

	const EntityHealth = styled.div<{ backgroundColor: string }>`
		background-color: ${props => (props.backgroundColor ? props.backgroundColor : "white")};
		width: 10px;
		height: 10px;
		display: inline-block;
		margin-right: 4px;
		margin-top: 4px;
	`;

	const RowIcons = styled.div`
		text-align: right;
		white-space: nowrap;
		margin-left: auto;
		display: "block";
		.icon {
			opacity: 0.7;
		}
		.icon-override-actions-visible {
			display: none;
		}
	`;

	const handleRowClick = (e, violationUrl) => {
		e.preventDefault();
		HostApi.instance.send(OpenUrlRequestType, { url: violationUrl });
	};

	return (
		<>
			{alertViolations?.map(_ => {
				return (
					<Row
						style={{
							padding: customPadding ? customPadding : "2px 10px 2px 60px",
						}}
						className={"pr-row"}
						onClick={(e) => {
							handleRowClick(e, _.violationUrl);
						}}
					>
						<EntityHealth backgroundColor={ALERT_SEVERITY_COLORS[_.alertSeverity]} />
						{_.label}
					</Row>
				);
			})}
		</>
	);
});
