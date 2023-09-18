import React from "react";

import styled from "styled-components";

interface SkeletonProps {
	width: any;
	height: any;
}

//@TODO: Add animation + pulse effect
const Root = styled.div<SkeletonProps>`
	width: ${p => p.width};
	height: ${p => p.height};
	margin: 5px;
	background: var(--app-background-color);
`;

export const Skeleton = (props: SkeletonProps) => {
	return (
		<Root width={props.width} height={props.height}>
			{" "}
		</Root>
	);
};
