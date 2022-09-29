import Icon from "@codestream/webview/Stream/Icon";
import React, { PropsWithChildren } from "react";
import styled from "styled-components";

interface Props extends PropsWithChildren<{}> {
	className?: string;
	noIcon?: boolean;
	align?: "left" | "right" | "center";
}

const Root = styled.div<Props>`
	padding: 10px 20px;
	margin: 0 auto;
	text-align: ${props => props.align};
	.icon {
		margin-right: 5px;
		vertical-align: 2px;
	}
`;

export const LoadingMessage = React.forwardRef((props: Props, ref: React.Ref<HTMLDivElement>) => {
	return (
		<Root align={props.align} ref={ref} className={props.className}>
			{!props.noIcon && <Icon className="spin" name="sync" />}
			{props.children}
		</Root>
	);
});

LoadingMessage.defaultProps = {
	align: "center",
};
