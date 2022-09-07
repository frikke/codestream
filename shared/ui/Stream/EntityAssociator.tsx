import { keyBy as _keyBy } from "lodash-es";
import React, { PropsWithChildren, useState } from "react";
import { useDispatch } from "react-redux";
import {
	GetObservabilityEntitiesRequestType,
	WarningOrError,
	EntityAccount
} from "@codestream/protocols/agent";
import { Button } from "../src/components/Button";
import { NoContent } from "../src/components/Pane";
import { api } from "../store/codeErrors/actions";
import { DropdownButton, DropdownButtonItems } from "./DropdownButton";
import { WarningBox } from "./WarningBox";
import Tooltip from "./Tooltip";
import { logError } from "../logger";
import { useRequestType } from "../utilities/hooks";
import Icon from "./Icon";

interface EntityAssociatorProps {
	title?: string;
	label?: string | React.ReactNode;
	remote: string;
	remoteName: string;
	onSuccess?: Function;
	onFinally?: Function;
	servicesToExcludeFromSearch?: EntityAccount[];
}

export const EntityAssociator = React.memo((props: PropsWithChildren<EntityAssociatorProps>) => {
	const dispatch = useDispatch<any>();
	const [selected, setSelected] = useState<{ guid: string; name: string } | undefined>(undefined);
	const [isLoading, setIsLoading] = useState(false);
	const [warningOrErrors, setWarningOrErrors] = useState<WarningOrError[] | undefined>(undefined);

	const obsEntitiesResult = useRequestType(GetObservabilityEntitiesRequestType, {
		appName: props.remoteName
	});

	if (obsEntitiesResult?.error) {
		const errorMessage = typeof obsEntitiesResult.error === "string";
		logError(`Unexpected error during entities fetch for EntityAssociator: ${errorMessage}`, {
			appName: props.remoteName
		});
	}

	let items: DropdownButtonItems[] = [];

	if (obsEntitiesResult?.loading) {
		items = [
			{
				type: "loading",
				label: (
					<div>
						{" "}
						<Icon
							style={{
								marginRight: "5px"
							}}
							className="spin"
							name="sync"
						/>{" "}
						Loading...
					</div>
				),
				action: () => {},
				key: "loading"
			}
		];
	} else {
		items = obsEntitiesResult?.data?.entities?.length
			? ([
					{
						type: "search",
						placeholder: "Search...",
						action: "search",
						key: "search"
					}
			  ] as any).concat(
					obsEntitiesResult?.data?.entities
						.filter(_ => {
							if (props.servicesToExcludeFromSearch) {
								return !props.servicesToExcludeFromSearch.some(s => s.entityGuid === _.guid);
							}
							return true;
						})
						.map(_ => {
							return {
								key: _.guid,
								label: _.name,
								searchLabel: _.name,
								action: () => {
									setSelected(_);
								}
							};
						})
			  )
			: [];
	}

	return (
		<NoContent style={{ marginLeft: "40px" }}>
			{props.title && <h3>{props.title}</h3>}
			{props.label && <p style={{ marginTop: 0 }}>{props.label}</p>}
			{warningOrErrors && <WarningBox items={warningOrErrors} />}
			<DropdownButton
				items={items}
				selectedKey={selected ? selected.guid : undefined}
				variant={"secondary"}
				//size="compact"
				wrap
			>
				{selected ? selected.name : "Select entity"}
			</DropdownButton>{" "}
			<Tooltip placement="bottom" title={`Associate with ${props.remote}`}>
				<Button
					isLoading={isLoading}
					disabled={isLoading || !selected}
					onClick={e => {
						e.preventDefault();
						setIsLoading(true);
						setWarningOrErrors(undefined);

						const payload = {
							url: props.remote,
							name: props.remoteName,
							applicationEntityGuid: selected?.guid,
							entityId: selected?.guid,
							parseableAccountId: selected?.guid
						};
						dispatch(api("assignRepository", payload))
							.then(_ => {
								setTimeout(() => {
									if (_?.directives) {
										console.log("assignRepository", {
											directives: _?.directives
										});
										// a little fragile, but we're trying to get the entity guid back
										if (props.onSuccess) {
											props.onSuccess({
												entityGuid: _?.directives.find(d => d.type === "assignRepository")?.data
													?.entityGuid
											});
										}
									} else if (_?.error) {
										setWarningOrErrors([{ message: _.error }]);
									} else {
										setWarningOrErrors([
											{ message: "Failed to direct to entity dropdown, please refresh" }
										]);
										console.warn("Could not find directive", {
											_: _,
											payload: payload
										});
									}
								}, 5000);
							})
							.catch(err => {
								setWarningOrErrors([
									{ message: "Failed to direct to entity dropdown, please refresh" }
								]);
								logError(`Unexpected error during assignRepository: ${err}`, {});
							})
							.finally(() => {
								setTimeout(() => {
									{
										/* @TODO clean up this code, put in place so spinner doesn't stop before onSuccess */
									}
									setIsLoading(false);
								}, 6000);
							});
					}}
				>
					Associate
				</Button>
			</Tooltip>
			{props.children}
		</NoContent>
	);
});
