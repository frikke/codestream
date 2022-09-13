import { forEach as _forEach, isEmpty as _isEmpty } from "lodash-es";
import React, { useEffect, useState } from "react";
import { ALERT_SEVERITY_COLORS } from "./CodeError/index";
import styled from "styled-components";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import { HostApi } from "@codestream/webview/webview-api";
import { OpenUrlRequestType } from "@codestream/protocols/webview";
import { RecentAlertViolation } from "@codestream/protocols/agent";
import Tooltip from "./Tooltip";

interface Props {
	alertViolations?: RecentAlertViolation[];
	customPadding?: string;
}

export const ObservabilityAlertViolations = React.memo((props: Props) => {
	const { alertViolations, customPadding } = props;

	const EntityHealth = styled.div<{ backgroundColor: string }>`
		background-color: ${props => (props.backgroundColor ? props.backgroundColor : "white")};
		width: 10px;
		height: 10px;
		display: inline-block;
		margin-right: 4px;
		margin-top: 4px;
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
						onClick={e => {
							handleRowClick(e, _.violationUrl);
						}}
					>
						<EntityHealth backgroundColor={ALERT_SEVERITY_COLORS[_.alertSeverity]} />
						<Tooltip placement="topRight" title={_.label} delay={1}>
							<div style={{ minWidth: "0", padding: "0" }}>{_.label}</div>
						</Tooltip>
					</Row>
				);
			})}
		</>
	);
});
