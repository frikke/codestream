import { forEach as _forEach, isEmpty as _isEmpty } from "lodash-es";
import React, { useEffect, useState } from "react";
import Icon from "./Icon";
import { ALERT_SEVERITY_COLORS } from "./CodeError/index";
import styled from "styled-components";
import { useDidMount, useInterval } from "../utilities/hooks";
import cx from "classnames";
import { Row } from "./CrossPostIssueControls/IssuesPane";

interface RecentAlertViolations extends Array<RecentAlertViolation> {}

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

	return (
		<>
			{alertViolations?.map(_ => {
				return (
					<Row
						style={{
							padding: customPadding ? customPadding : "2px 10px 2px 60px",
						}}
						className={"pr-row"}
					>
						{_.label}
					</Row>
				);
			})}
		</>
	);
});
