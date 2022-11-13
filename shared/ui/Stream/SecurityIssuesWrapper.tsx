import {
	GetSecurityIssuesForEntityType,
	RiskSeverity,
	riskSeverityList,
	SecurityIssueSummary,
} from "@codestream/protocols/agent";
import { isEmpty, lowerCase } from "lodash-es";
import React, { useState } from "react";

import { InlineMenu, MenuItem } from "@codestream/webview/src/components/controls/InlineMenu";
import { SmartFormattedList } from "@codestream/webview/Stream/SmartFormattedList";
import { useRequestType } from "@codestream/webview/utilities/hooks";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";

interface Props {
	currentRepoId: string;
	entityGuid: string;
	accountId: number;
}

const severityColorMap: Record<RiskSeverity, string> = {
	CRITICAL: "#aa0000",
	HIGH: "#aa0000",
	MEDIUM: "#ee8608",
	INFO: "#0776e5",
	LOW: "#0776e5",
	UNKNOWN: "#ee8608",
};

function Severity(props: { securityIssueSummary: SecurityIssueSummary }) {
	return (
		<div className="icons" style={{ color: severityColorMap[props.securityIssueSummary.severity] }}>
			{lowerCase(props.securityIssueSummary.severity)}
		</div>
	);
}

function Additional(props: { onClick: () => void; additional?: number }) {
	return props.additional && props.additional > 0 ? (
		<Row
			onClick={props.onClick}
			style={{
				padding: "0 10px 0 42px",
			}}
		>
			<div>
				<Icon style={{ transform: "scale(0.9)" }} name="plus" />
			</div>
			<div>See additional {props.additional} vulnerabilities</div>
		</Row>
	) : null;
}

export const SecurityIssuesWrapper = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(false);
	const [selectedItems, setSelectedItems] = useState<RiskSeverity[]>(["CRITICAL", "HIGH"]);
	const [rows, setRows] = useState<number | undefined | "all">(undefined);

	const { loading, data, error } = useRequestType(
		GetSecurityIssuesForEntityType,
		{
			entityGuid: props.entityGuid,
			accountId: props.accountId,
			severityFilter: isEmpty(selectedItems) ? undefined : selectedItems,
			rows,
		},
		[selectedItems, props.entityGuid, rows, expanded],
		expanded
	);

	function handleSelect(severity: RiskSeverity) {
		if (selectedItems.includes(severity)) {
			setSelectedItems(selectedItems.filter(_ => _ !== severity));
		} else {
			setSelectedItems([...selectedItems, severity]);
		}
	}

	const additional = data ? data.totalRecords - data.recordCount : undefined;

	const menuItems: MenuItem[] = riskSeverityList.map(severity => {
		return {
			label: lowerCase(severity),
			key: severity,
			checked: selectedItems.includes(severity),
			action: () => handleSelect(severity),
		};
	});

	function loadAll() {
		setRows("all");
	}

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 30px",
				}}
				className={"pr-row"}
				onClick={() => {
					setExpanded(!expanded);
				}}
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}
				<span style={{ marginLeft: "2px", marginRight: "5px" }}>Vulnerabilities</span>
				<InlineMenu
					title="Filter Items"
					preventMenuStopPropagation={true}
					items={menuItems}
					align="bottomRight"
					isMultiSelect={true}
					dontCloseOnSelect={true}
				>
					<SmartFormattedList
						value={isEmpty(selectedItems) ? ["All"] : selectedItems.map(lowerCase)}
					/>
				</InlineMenu>
			</Row>
			{expanded && !loading && data && (
				<>
					{data.securityIssues.map(securityIssue => {
						return (
							<Row
								style={{
									padding: "0 10px 0 42px",
								}}
								className={"pr-row"}
							>
								<div>
									<Icon style={{ transform: "scale(0.9)" }} name="lock" />
								</div>
								<div>{securityIssue.title}</div>
								<Severity securityIssueSummary={securityIssue} />
							</Row>
						);
					})}
					<Additional onClick={loadAll} additional={additional} />
				</>
			)}
		</>
	);
});
