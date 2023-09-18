import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { CodeStreamState } from "../store";
import { Button } from "../src/components/Button";
import styled from "styled-components";
import { Dialog } from "../src/components/Dialog";
import { Modal } from "./Modal";
import { getPreferences } from "../store/users/reducer";
import Icon from "./Icon";
import { Checkbox } from "../src/components/Checkbox";

export const ButtonRow = styled.div`
	text-align: center;
	margin-top: 20px;
	display: flex;
	margin: 20px -10px 0 -10px;
	button {
		flex-grow: 1;
		margin: 0 10px;
		width: 100%;
		padding: 5px 10px;
		line-height: 1.25em;
	}
`;

const Stars = styled.div`
	margin: 20px 0 30px 0;
	width: 100%;
	display: flex;
	justify-items: space-between;
	text-align: center;
	.icon {
		display: inline-block;
		transform: scale(2);
		flex-grow: 1;
	}
`;

export const EnjoyingCodeStream = () => {
	const dispatch = useDispatch();
	const derivedState = useSelector((state: CodeStreamState) => {
		const preferences = getPreferences(state);
		return { skipEnjoyingCodeStream: preferences.skipEnjoyingCodeStream };
	});

	const [starGitHub, setStarGitHub] = React.useState(true);

	const close = () => {
		// dispatch(setUserPreference(["skipEnjoyingCodeStream"], true));
	};

	const clickNo = () => {};

	const clickYes = () => {};

	if (derivedState.skipEnjoyingCodeStream) return null;
	return (
		<Modal translucent>
			<Dialog title="Enjoying CodeStream?" onClose={close}>
				<p>
					Rate CodeStream in the VS Code marketplace
					<Stars>
						<Icon name="star-fill" />
						<Icon name="star-fill" />
						<Icon name="star-fill" />
						<Icon name="star-fill" />
						<Icon name="star" />
					</Stars>
				</p>
				<Checkbox
					name="github-star"
					checked={starGitHub}
					onChange={() => setStarGitHub(!starGitHub)}
				>
					Star the codestream repo on GitHub
				</Checkbox>
				<ButtonRow>
					<Button variant="secondary" onClick={clickNo} tabIndex={0}>
						Not now
					</Button>
					<Button onClick={clickYes} tabIndex={0}>
						Sure
					</Button>
				</ButtonRow>
			</Dialog>
		</Modal>
	);
};
