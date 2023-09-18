import React from "react";

interface Props {
	openCodemarkForm?: Function;
	openDirection?: "up" | "down";
	renderMessageInput(props: { [key: string]: any }): JSX.Element;
	onClickClose?(): any;
	onSubmit(text: string): any;
	placeholder?: string;
}

interface State {
	text: string;
	menuOpen?: boolean;
	menuTarget?: EventTarget;
}

export class PostCompose extends React.Component<Props, State> {
	constructor(props) {
		super(props);
		this.state = { text: "" };
	}

	handleChange = (text: string) => {
		this.setState({ text });
	};

	handleClickClose = (event: React.SyntheticEvent) => {
		event.preventDefault();
		this.props.onClickClose && this.props.onClickClose();
	};

	handleMenuClick = (event: React.SyntheticEvent) => {
		event.stopPropagation();
		this.setState({ menuOpen: !this.state.menuOpen, menuTarget: event.target });
	};

	handleSelectMenu = type => {
		this.setState({ menuOpen: false });
		if (type) this.props.openCodemarkForm && this.props.openCodemarkForm(type);
	};

	handleSubmit = () => {
		const domParser = new DOMParser();
		const replaceRegex = /<br>|<div>/g;
		const text = domParser.parseFromString(this.state.text.replace(replaceRegex, "\n"), "text/html")
			.documentElement.textContent;

		if (text === null || text.trim().length === 0) return;

		this.props.onSubmit(text);
		this.setState({ text: "" });
	};

	render() {
		const { menuOpen, menuTarget } = this.state;
		let menuItems = [
			{ label: "Add Comment", action: "comment" },
			{ label: "Create Issue", action: "issue" },
			{ label: "Create Bookmark", action: "bookmark" },
			{ label: "Get Permalink", action: "link" },
		];

		return (
			<React.Fragment>
				{/*}
				<div key="1" className="plus-button" onClick={this.handleMenuClick}>
					<Icon name="plus" className="plus" />
					{menuOpen && (
						<Menu
							align="left"
							items={menuItems}
							target={menuTarget}
							action={this.handleSelectMenu}
						/>
					)}
					</div>*/}
				{
					// <div key="2" className="x-button" onClick={this.handleClickClose}>
					// <Icon name="x" className="plus" />
					// </div>
				}
				{this.props.renderMessageInput({
					text: this.state.text,
					placeholder: this.props.placeholder,
					multiCompose: false,
					onChange: this.handleChange,
					onSubmit: this.handleSubmit,
				})}
			</React.Fragment>
		);
	}
}
