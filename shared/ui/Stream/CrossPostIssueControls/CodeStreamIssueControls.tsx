import { CodeStreamState } from "@codestream/webview/store";
import { getTeamMembers } from "@codestream/webview/store/users/reducer";
import { mapFilter } from "@codestream/webview/utils";
import React from "react";
import ReactDOM from "react-dom";
import { useSelector } from "react-redux";
import Select from "react-select";
import { CrossPostIssueContext } from "../CodemarkForm";

export function CodeStreamIssueControls(props: React.PropsWithChildren<any>) {
	const assignableUsers = useSelector((state: CodeStreamState) => {
		return mapFilter(getTeamMembers(state), user => {
			if (!user.isRegistered) return;
			return {
				value: user.id,
				label: user.username,
			};
		});
	});
	const crossPostIssueContext = React.useContext(CrossPostIssueContext);

	const assigneesInput = (() => {
		if (crossPostIssueContext.assigneesInputTarget == undefined) return null;

		return ReactDOM.createPortal(
			<Select
				id="input-assignees"
				name="assignees"
				classNamePrefix="react-select"
				value={crossPostIssueContext.selectedAssignees}
				isMulti
				placeholder="Assignees (optional)"
				options={assignableUsers}
				onChange={value => crossPostIssueContext.setSelectedAssignees(value)}
			/>,
			crossPostIssueContext.assigneesInputTarget
		);
	})();

	return (
		<div className="loading-boards">
			{assigneesInput}
			<span className="connect-issue-label">Create an issue on {props.children}</span>
		</div>
	);
}
