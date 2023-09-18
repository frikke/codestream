import React from "react";
import styled from "styled-components";
import { CodeStreamHeadshot, Headshot } from "./Headshot";

export default {
	title: "Headshot",
	component: Headshot,
};

const Row = styled.div`
	display: flex;
	margin-bottom: 5px;
	color: ${props => props.theme.colors.text};
`;

export const forEmail = () => (
	<>
		<Row>
			<Headshot person={{ email: "akonwi+1@codestream.com" }} />
		</Row>
		<Row>
			<Headshot person={{ email: "akonwi+1@codestream.com" }} size={32} />
		</Row>
		<Row>
			<Headshot person={{ email: "akonwi+1@codestream.com" }} size={64} />
		</Row>
	</>
);

export const forGravatar = () => (
	<>
		<Row>
			<Headshot person={{ email: "akonwi@codestream.com" }} />
		</Row>
		<Row>
			<Headshot person={{ email: "akonwi@codestream.com" }} size={32} />
		</Row>
		<Row>
			<Headshot person={{ email: "akonwi@codestream.com" }} size={64} />
		</Row>
	</>
);

export const forFullName = () => (
	<>
		<Row>
			<Headshot person={{ fullName: "Egg Drop" }} />
		</Row>
		<Row>
			<Headshot person={{ fullName: "Egg Drop" }} size={32} />
		</Row>
		<Row>
			<Headshot person={{ fullName: "Egg Drop" }} size={64} />
		</Row>
	</>
);

export const forUsername = () => (
	<>
		<Row>
			<Headshot person={{ username: "eggdrop" }} />
		</Row>
		<Row>
			<Headshot person={{ username: "eggdrop" }} size={32} />
		</Row>
		<Row>
			<Headshot person={{ username: "eggdrop" }} size={64} />
		</Row>
	</>
);

export const codestreamHeadshot = () => (
	<>
		<Row>
			<CodeStreamHeadshot />
		</Row>
		<Row>
			<CodeStreamHeadshot size={32} />
		</Row>
		<Row>
			<CodeStreamHeadshot size={64} />
		</Row>
	</>
);
