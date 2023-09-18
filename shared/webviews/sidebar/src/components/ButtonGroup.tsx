import styled from "styled-components";
import { ButtonRoot } from "./Button";

interface Props {
	direction?: "row" | "column";
}

export const ButtonGroup = styled.div<Props>(
	props => `
	width: inherit;
	display: flex;
	justify-content: space-between;
	${ButtonRoot} {
		margin: 5px 0;
		justify-content: start;
	}
	${getGroupStyles(props.direction)}
`
);

const getGroupStyles = (direction?: string) => {
	switch (direction) {
		case "column": {
			return `
				flex-direction: column;
				${ButtonRoot} {
					width: inherit;
				}
				`;
		}
		case "row":
		default: {
			return `
				flex-direction: row;
				flex-wrap: wrap;
				${ButtonRoot} {
					flex: 1 1 0;
				}
			`;
		}
	}
};
