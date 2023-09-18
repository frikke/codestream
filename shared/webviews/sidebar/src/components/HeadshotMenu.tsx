import React from "react";
import styled from "styled-components";
import Menu from "../../Stream/Menu";
import { Headshot } from "@codestream/sidebar/src/components/Headshot";
import { HeadshotName } from "@codestream/sidebar/src/components/HeadshotName";

const Title = styled.span`
	display: flex;
	flex-direction: row;
	& > :nth-child(2) {
		padding: 0 0 0 10px;
	}
`;

interface State {
	open: boolean;
	target?: any;
}

export interface Props {
	person: {
		email?: string;
		avatar?: { image?: string; image48?: string };
		fullName?: string;
		username?: string;
		color?: number;
	};
	menuItems: any;
	children?: React.ReactNode;
}

export default class HeadshotMenu extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { open: false, target: undefined };
	}

	openMenu = (e: React.SyntheticEvent) => {
		this.setState({ open: !this.state.open, target: e && e.target });
	};

	render() {
		const { person, menuItems, children } = this.props;
		const title = (
			<Title>
				<Headshot person={person} size={40} />
				<span>
					{person.fullName || person.username}
					<br />
					{person.email}
				</span>
			</Title>
		);
		return (
			<span>
				<HeadshotName person={person} onClick={e => this.openMenu(e)} />
				{this.state.open && (
					<Menu
						align="center"
						valign="bottom"
						title={title}
						items={menuItems}
						target={this.state.target}
						action={this.openMenu}
					/>
				)}
			</span>
		);
	}
}
