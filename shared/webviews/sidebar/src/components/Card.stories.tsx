import React from "react";
import styled from "styled-components";
import { Card, CardBanner, CardBody, CardFooter } from "./Card";

export default {
	title: "Card",
	component: Card,
	decorators: [storyFn => <div style={{ width: "300px" }}>{storyFn()}</div>],
};

const P = styled.p`
	color: ${props => props.theme.colors.text};
	padding: 0;
	margin: 0;
`;

export const simple = () => (
	<Card>
		<P>This is a card</P>
	</Card>
);

export const withHoverHighlight = () => (
	<Card hoverEffect>
		<P>Hover over me</P>
	</Card>
);

export const withClickHandler = () => (
	<div
		style={{
			display: "flex",
			flexDirection: "column",
			justifyContent: "space-between",
			minHeight: 100,
		}}
	>
		<Card onClick={() => alert("hi")}>The cursor changes on hover</Card>
		<Card hoverEffect onClick={() => alert("hi")}>
			Also with hover effect
		</Card>
	</div>
);

export const withBanner = () => (
	<Card hoverEffect>
		<CardBanner>
			<P>This is a banner for the card</P>
		</CardBanner>
		<CardBody>
			<P>This is a card</P>
		</CardBody>
	</Card>
);

export const withFooter = () => (
	<Card hoverEffect>
		<P>This is a card</P>
		<CardFooter>
			<P>This is the footer of the card</P>
		</CardFooter>
	</Card>
);

export const withFooterAndBanner = () => (
	<Card>
		<CardBanner>
			<P>Banner</P>
		</CardBanner>
		<CardBody>
			<P>Body</P>
		</CardBody>
		<CardFooter>Footer</CardFooter>
	</Card>
);
