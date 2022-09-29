import React from "react";
import { LabeledSwitch } from "./LabeledSwitch";

export default {
	title: "Inputs/LabeledSwitch",
	component: LabeledSwitch,
};

export const basic = () => {
	const [on, toggle] = React.useState(false);
	return (
		<LabeledSwitch
			colored
			on={on}
			onChange={toggle}
			offLabel="Off Label"
			onLabel="On Label"
			width={70}
		/>
	);
};

export const disabled = () => {
	const [on, toggle] = React.useState(false);
	return (
		<LabeledSwitch
			disabled
			colored
			on={on}
			onChange={toggle}
			offLabel="Off Label"
			onLabel="On Label"
			width={70}
		/>
	);
};
