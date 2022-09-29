import { PixieGetPodsRequestType } from "@codestream/protocols/agent";
import { CodeStreamState } from "@codestream/webview/store";
import { DropdownButton, DropdownButtonItems } from "@codestream/webview/Stream/DropdownButton";
import { HostApi } from "@codestream/webview/webview-api";
import React, { useEffect } from "react";
import { useSelector } from "react-redux";

export const Pods = props => {
	const [isLoading, setIsLoading] = React.useState(false);
	const [pods, setPods] = React.useState<DropdownButtonItems[]>([]);
	const [error, setError] = React.useState<string | undefined>();

	const defaultPodUpid = useSelector(
		(state: CodeStreamState) => state.preferences.pixieDefaultPodUpid
	);

	useEffect(() => {
		void loadPods();
	}, [props.account.id, props.cluster.clusterId, props.namespace]);

	const namespaceRegexp = new RegExp(`^${props.namespace}/`);

	const niceName = name => name?.replace(namespaceRegexp, "");

	const loadPods = async () => {
		setIsLoading(true);
		try {
			const response = await HostApi.instance.send(PixieGetPodsRequestType, {
				accountId: props.account.id,
				clusterId: props.cluster.clusterId,
				namespace: props.namespace,
			});
			const newPods = response.pods.map(_ => {
				return {
					key: _.upid,
					label: niceName(_.name),
					searchLabel: niceName(_.name),
					action: () => {
						props.onSelect(_);
					},
				};
			}) as DropdownButtonItems[];
			if (newPods.length > 5) {
				newPods.unshift(
					{
						label: "",
						placeholder: "Search Accounts",
						type: "search",
					},
					{ label: "-" }
				);
			}

			setPods(newPods);
			setError(undefined);
			if (defaultPodUpid) {
				props.onSelect(response.pods.find(_ => _.upid === defaultPodUpid));
			}
			// props.onSelect(response.pods[0]);
		} catch (err) {
			setError(err.toString());
			props.onSelect(undefined);
			setPods([]);
		}
		setIsLoading(false);
	};

	return (
		<div style={{ padding: "0px 0px 1px 0px" }}>
			{error ? (
				<small className="explainer error-message">{error}</small>
			) : (
				<DropdownButton items={pods} isLoading={isLoading} size="compact" wrap fillParent>
					{niceName(props.value?.name) || "Make Selection"}
				</DropdownButton>
			)}
		</div>
	);
};
