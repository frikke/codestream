import Icon from "@codestream/webview/Stream/Icon";
import cx from "classnames";
import React, { PropsWithChildren } from "react";
import styled from "styled-components";

interface Props extends PropsWithChildren<{}> {
	className?: string;
	align?: "left" | "right" | "center";
}

const Root = styled.div<Props>`
	text-align: ${props => props.align};
	.icon {
		margin-right: 5px;
		vertical-align: 2px;
	}
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	z-index: 3000;
	> div {
		padding: 20px 30px;
		background: rgba(127, 127, 127, 0.2);
		border-radius: 10px;
		backdrop-filter: blur(5px);
		box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
		.vscode-dark& {
			box-shadow: 0 5px 10px rgba(0, 0, 0, 0.5);
		}
	}
`;

export const FloatingLoadingMessage = React.forwardRef(
	(props: Props, ref: React.Ref<HTMLDivElement>) => {
		return (
			<Root
				align={props.align}
				ref={ref}
				className={cx("floating-loading-message", props.className)}
			>
				<div>
					<Icon className="spin" name="sync" />
					{props.children}
				</div>
			</Root>
		);
	}
);

FloatingLoadingMessage.defaultProps = {
	align: "center",
};
