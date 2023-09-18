import { CodeStreamState } from "../store";
import { useSelector } from "react-redux";
import React from "react";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";

type RenderFunction = (flagEnabled: boolean) => React.ReactNode;

export function FeatureFlag(props: { flag: string; children: RenderFunction }) {
	const flagEnabled = useSelector((state: CodeStreamState) => isFeatureEnabled(state, props.flag));

	return <>{props.children(flagEnabled)}</>;
}
