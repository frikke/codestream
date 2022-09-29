import { PixieGetNamespacesRequestType } from "@codestream/protocols/agent";
import { CodeStreamState } from "@codestream/webview/store";
import { DropdownButton, DropdownButtonItems } from "@codestream/webview/Stream/DropdownButton";
import { HostApi } from "@codestream/webview/webview-api";
import React, { useEffect } from "react";
import { useSelector } from "react-redux";

export const Namespaces = props => {
	const [isLoading, setIsLoading] = React.useState(false);
	const [namespaces, setNamespaces] = React.useState<DropdownButtonItems[]>([]);
	const [error, setError] = React.useState<string | undefined>();

	const defaultNamespace = useSelector(
		(state: CodeStreamState) => state.preferences.pixieDefaultNamespace
	);

	useEffect(() => {
		void loadNamespaces();
	}, [props.account.id, props.cluster.clusterId]);

	const loadNamespaces = async () => {
		setIsLoading(true);
		try {
			const response = await HostApi.instance.send(PixieGetNamespacesRequestType, {
				accountId: props.account.id,
				clusterId: props.cluster.clusterId,
			});
			const newNamespaces = response.namespaces.map(_ => ({
				key: _,
				label: _,
				searchLabel: _,
				action: () => {
					props.onSelect(_);
				},
			})) as DropdownButtonItems[];
			if (newNamespaces.length > 5) {
				newNamespaces.unshift(
					{
						label: "",
						placeholder: "Search Namespaces",
						type: "search",
					},
					{ label: "-" }
				);
			}
			setNamespaces(newNamespaces);
			setError(undefined);
			if (defaultNamespace) {
				props.onSelect(response.namespaces.find(_ => _ === defaultNamespace));
			}
			// props.onSelect(response.namespaces[0]);
		} catch (err) {
			props.onSelect(undefined);
			setError(err.toString());
			setNamespaces([]);
		}
		setIsLoading(false);
	};

	return (
		<div style={{ padding: "0px 0px 1px 0px" }}>
			{error ? (
				<small className="explainer error-message">{error}</small>
			) : (
				<DropdownButton items={namespaces} isLoading={isLoading} size="compact" wrap fillParent>
					{props.value || "Make Selection"}
				</DropdownButton>
			)}
		</div>
	);
};
