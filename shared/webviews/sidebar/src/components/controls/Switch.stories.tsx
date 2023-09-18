import React from "react";
import styled from "styled-components";
import { Switch } from "./Switch";

export default {
	title: "Inputs/Switch",
	component: Switch,
};

const Column = styled.div`
	display: flex;
	flex-direction: column;
	justify-content: space-evenly;
	color: ${props => props.theme.colors.text};
	> div {
		margin: 5px;
	}
`;

export const basic = () => {
	const [stateForDefault, toggleDefault] = React.useState(false);
	const [stateForColored, toggleColored] = React.useState(false);
	return (
		<Column>
			<div>
				Default:
				<Switch on={stateForDefault} onChange={toggleDefault} />
			</div>
			<div>
				Colored:
				<Switch colored on={stateForColored} onChange={toggleColored} />
			</div>
			<div>
				Disabled:
				<Switch disabled on onChange={toggleColored} />
			</div>
		</Column>
	);
};

export const sizes = () => {
	const [smallValue, toggleSmall] = React.useState(false);
	const [normalValue, toggleNormal] = React.useState(false);
	const [largeValue, toggleLarge] = React.useState(false);
	return (
		<Column>
			<div>
				Small: <Switch size="small" on={smallValue} onChange={toggleSmall} />
			</div>
			<div>
				Normal: <Switch on={normalValue} onChange={toggleNormal} />
			</div>
			<div>
				Large: <Switch on={largeValue} size="large" onChange={toggleLarge} />
			</div>
		</Column>
	);
};
