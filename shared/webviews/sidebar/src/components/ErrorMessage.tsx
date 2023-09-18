import React, { PropsWithChildren } from "react";
import styled from "styled-components";

interface Props extends PropsWithChildren<{}> {
	className?: string;
	align?: "left" | "right" | "center";
}

const Root = styled.div<Props>`
	padding: 10px 20px;
	margin: 0 auto;
	text-align: ${props => props.align};
`;

export const ErrorMessage = React.forwardRef((props: Props, ref: React.Ref<HTMLDivElement>) => {
	return (
		<Root align={props.align} ref={ref} className={props.className}>
			{props.children}
		</Root>
	);
});

ErrorMessage.defaultProps = {
	align: "center",
};
