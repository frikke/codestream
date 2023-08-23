import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { ObservabilityRelatedCalledBy } from "./ObservabilityRelatedCalledBy";
import { ObservabilityRelatedCalls } from "./ObservabilityRelatedCalls";

interface Props {
	currentRepoId: string;
	entityGuid: string;
}

export const ObservabilityRelatedWrapper = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(false);

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
				<span data-testid={`related-services-${props.entityGuid}`} style={{ marginLeft: "2px" }}>
					Related Services
				</span>
			</Row>
			{expanded && (
				<>
					<ObservabilityRelatedCalls
						currentRepoId={props.currentRepoId}
						entityGuid={props.entityGuid}
					/>
					<ObservabilityRelatedCalledBy
						currentRepoId={props.currentRepoId}
						entityGuid={props.entityGuid}
					/>
				</>
			)}
		</>
	);
});
