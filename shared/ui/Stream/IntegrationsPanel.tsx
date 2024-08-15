import styled from "styled-components";



import { Button } from "../src/components/Button";

export const Provider = styled(Button)`
	width: 100%;
	justify-content: left;
	text-align: left;
	.icon {
		margin-right: 5px;
	}
	position: relative;
`;

export const IntegrationButtons = styled.div<{ noBorder?: boolean; noPadding?: boolean }>`
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(13em, 1fr));
	column-gap: 15px;
	row-gap: 10px;
	padding: ${props => (props.noPadding ? "0" : "0 20px 20px 20px")};
	border-bottom: ${props => (props.noBorder ? "none" : "1px solid var(--base-border-color)")};
	align-items: start;
`;
