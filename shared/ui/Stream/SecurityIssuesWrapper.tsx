import {
	GetLibraryDetailsType,
	LibraryDetails,
	RiskSeverity,
	riskSeverityList,
	Vuln,
} from "@codestream/protocols/agent";
import { isEmpty, lowerCase } from "lodash-es";
import React, { useState } from "react";

import { MarkdownText } from "@codestream/webview/Stream/MarkdownText";
import { Modal } from "@codestream/webview/Stream/Modal";
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

function calculateRisk(score: number): RiskSeverity {
	if (score > 9) {
		return "CRITICAL";
	}
	if (score > 7) {
		return "HIGH";
	}
	if (score > 4) {
		return "MEDIUM";
	}
	// if (score > 5) {
	//     return "INFO";
	// }
	if (score > 0.1) {
		return "LOW";
	}
	return "UNKNOWN";
}

function Severity(props: { severity: RiskSeverity }) {
	// const riskSeverity = calculateRisk(props.score);
	// style={{color: severityColorMap[props.severity]}}
	return (
		<div className="icons" style={{ color: severityColorMap[props.severity] }}>
			{lowerCase(props.severity)}
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

function VulnView(props: { vuln: Vuln; onClose: () => void }) {
	// Close on click outside of modal
	const handleClickField = React.useCallback(event => {
		if (!event.target.classList.contains("codemark-view")) return;
		event.preventDefault();
		props.onClose();
	}, []);
	const { vuln } = props;
	return (
		<div className="codemark-view" onClick={handleClickField}>
			<div className="codemark-container">
				<div className="codemark inline selected">
					<div className="contents">
						<div className="body">
							<div className="description vuln">
								<h1>{vuln.title}</h1>
								<div>
									<span>{vuln.issueId}</span> <span>{vuln.criticality}</span>
								</div>
								<div style={{ marginBottom: "10px" }}>Fix version(s): {vuln.remediation}</div>
								<MarkdownText text={vuln.description} inline={false} />
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function VulnRow(props: { vuln: Vuln }) {
	const [expanded, setExpanded] = useState<boolean>(false);
	return (
		<>
			<Row
				style={{ padding: "0 10px 0 64px" }}
				className={"pr-row"}
				onClick={() => {
					setExpanded(!expanded);
				}}
			>
				<div>
					<Icon style={{ transform: "scale(0.9)" }} name="lock" />
				</div>
				<div>{props.vuln.title}</div>
				<Severity severity={calculateRisk(props.vuln.score)} />
			</Row>
			{expanded && (
				<Modal
					translucent
					onClose={() => {
						console.log("*** modal onClose");
						setExpanded(false);
					}}
				>
					<VulnView vuln={props.vuln} onClose={() => setExpanded(false)} />
				</Modal>
			)}
		</>
	);
}

function LibraryRow(props: { library: LibraryDetails }) {
	const [expanded, setExpanded] = useState<boolean>(false);
	const { library } = props;
	return (
		<>
			<Row
				style={{ padding: "0 10px 0 42px" }}
				className={"pr-row"}
				onClick={() => {
					setExpanded(!expanded);
				}}
			>
				<div>
					{expanded && <Icon name="chevron-down-thin" />}
					{!expanded && <Icon name="chevron-right-thin" />}
				</div>
				<div>
					{library.name} {library.version} ({library.vulns.length})
				</div>
				<Severity severity={calculateRisk(library.highestScore)} />
			</Row>
			{expanded && library.vulns.map(vuln => <VulnRow vuln={vuln} />)}
		</>
	);
}

export const SecurityIssuesWrapper = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(false);
	const [selectedItems, setSelectedItems] = useState<RiskSeverity[]>(["CRITICAL", "HIGH"]);
	const [rows, setRows] = useState<number | undefined | "all">(undefined);

	const { loading, data, error } = useRequestType(
		GetLibraryDetailsType,
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

	// const additional = data ? data.totalRecords - data.recordCount : undefined;
	const additional = 5;

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
					{data.libraries.map(library => {
						return <LibraryRow library={library} />;
					})}
					<Additional onClick={loadAll} additional={additional} />
				</>
			)}
		</>
	);
});
