import React from "react";
import { Button } from "@codestream/webview/src/components/Button";

export const GrokSuggestion = (props: { query: string; onSelect: (text: string) => void }) => {
	return (
		<div
			style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				marginBottom: "10px",
			}}
		>
			<div>{props.query}</div>
			<Button
				onClick={() =>
					props.onSelect(
						`@[AI](<collab-mention data-value="@AI" data-type="NR_BOT" data-mentionable-item-id="NR_BOT">AI</collab-mention>) ${props.query}`
					)
				}
			>
				Select
			</Button>
		</div>
	);
};
