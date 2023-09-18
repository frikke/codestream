import { PropsWithChildren } from "react";
import React from "react";
import styled from "styled-components";
import { CSText } from "./CSText";
import Icon from "@codestream/sidebar/Stream/Icon";

const Box = styled.div`
	border: 1px solid var(--base-border-color);
	box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
	padding: 20px 20px 20px 20px;
	margin-bottom: 20px;
	position: relative;
	font-size: 14px;
`;

interface Props {
	title?: string;
	className?: string;
	onClose?(event: React.SyntheticEvent): any;
}

export function BoxedContent(props: PropsWithChildren<Props>) {
	return (
		<Box className={props.className}>
			{props.title && (
				<>
					<Title className="title">
						<CSText as="h2">{props.title}</CSText>
					</Title>
					{props.onClose && (
						<Close className="close">
							<Icon className="clickable" name="x" onClick={props.onClose} />
						</Close>
					)}
					<div style={{ height: "5px" }} />
				</>
			)}
			{props.children}
		</Box>
	);
}

const Title = styled.span`
	position: absolute;
	top: -20px;
	left: 15px;
	background: var(--app-background-color);
	padding: 0 5px;
	margin: 0;
	display: inline-block;
`;

const Close = styled.span`
	position: absolute;
	top: -10px;
	right: 15px;
	background: var(--app-background-color);
	padding: 0 5px;
	margin: 0;
	display: inline-block;
`;
