import { forEach as _forEach, isEmpty as _isEmpty } from "lodash-es";
import React, { useState } from "react";
import { Row } from "./CrossPostIssueControls/IssuesPane";
import Icon from "./Icon";
import { EntityAssociator } from "./EntityAssociator";
import { EntityAccount } from "@codestream/protocols/agent";
interface Props {
	onSuccess: Function;
	remote: string;
	remoteName: string;
	servicesToExcludeFromSearch?: EntityAccount[];
}

export const ObservabilityAddAdditionalService = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(false);
	const { onSuccess, remote, remoteName, servicesToExcludeFromSearch } = props;

	return (
		<>
			<Row
				style={{
					padding: "2px 10px 2px 18px"
				}}
				className={"pr-row"}
				onClick={() => setExpanded(!expanded)}
			>
				{expanded && <Icon name="chevron-down-thin" />}
				{!expanded && <Icon name="chevron-right-thin" />}
				<span style={{ marginLeft: "2px" }}>Add another service</span>
			</Row>
			{expanded && (
				<>
					<EntityAssociator
						onSuccess={onSuccess}
						remote={remote}
						remoteName={remoteName}
						servicesToExcludeFromSearch={servicesToExcludeFromSearch}
					/>
				</>
			)}
		</>
	);
});
