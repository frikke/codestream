import React from "react";
import styled from "styled-components";
import { WebviewPanels } from "codestream-common/webview-protocol-common";

import { openPanel } from "./actions";
import { useAppDispatch } from "@codestream/webview/utilities/hooks";
import Icon from "./Icon";

const Root = styled.div`
	cursor: pointer;
	border-top: 1px solid var(--base-border-color);
	padding: 5px 20px;
	span:hover {
		color: var(--text-color-highlight);
	}
	.icon {
		display: inline-block;
		margin-right: 5px;
		transition: transform 0.1s;
	}
	.icon.rotate {
		transform: rotate(90deg);
	}
	.getting-started {
		float: right;
	}
`;

export const Docs = () => {
	const dispatch = useAppDispatch();
	return (
		<Root>
			<span onClick={() => dispatch(openPanel(WebviewPanels.Flow))}>
				<Icon name="chevron-right" />
				CodeStream Howto
			</span>
			<span
				style={{ display: "none" }}
				className="getting-started"
				onClick={() => dispatch(openPanel(WebviewPanels.GettingStarted))}
			>
				<Icon name="dashboard" />
				Getting Started
			</span>
		</Root>
	);
};
