import { GetNewRelicAccountsRequestType } from "@codestream/protocols/agent";
import { CodeStreamState } from "@codestream/webview/store";
import { DropdownButton, DropdownButtonItems } from "@codestream/webview/Stream/DropdownButton";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import { HostApi } from "@codestream/webview/webview-api";
import React from "react";
import { useSelector } from "react-redux";

export const Accounts = props => {
	const [isLoading, setIsLoading] = React.useState(false);
	const [accounts, setAccounts] = React.useState<DropdownButtonItems[]>([]);
	const [error, setError] = React.useState<string | undefined>();

	const defaultAccountId = useSelector(
		(state: CodeStreamState) => state.preferences.pixieDefaultAccountId
	);

	useDidMount(() => {
		void loadAccounts();
	});

	const loadAccounts = async () => {
		setIsLoading(true);
		const response = await HostApi.instance.send(GetNewRelicAccountsRequestType, void {});
		const newAccounts = response.accounts.map(_ => ({
			key: _.id.toString(),
			label: _.name,
			searchLabel: _.name,
			action: () => {
				props.onSelect(_);
			},
		})) as DropdownButtonItems[];
		if (newAccounts.length > 5) {
			newAccounts.unshift(
				{
					label: "",
					placeholder: "Search Accounts",
					type: "search",
				},
				{ label: "-" }
			);
		}
		setAccounts(newAccounts);
		if (defaultAccountId) {
			props.onSelect(response.accounts.find(_ => _.id.toString() === defaultAccountId));
		}
		// props.onSelect(response.accounts[0]);
		setIsLoading(false);
	};

	return (
		<div style={{ padding: "0px 0px 1px 0px" }}>
			{error ? (
				<small className="explainer error-message">{error}</small>
			) : (
				<DropdownButton items={accounts} isLoading={isLoading} size="compact" wrap fillParent>
					{props.value?.name || "Make Selection"}
				</DropdownButton>
			)}
		</div>
	);
};
