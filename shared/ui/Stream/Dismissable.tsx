import React from "react";
import styled from "styled-components";
import Button from "./Button";

interface State {}

export interface Props {
	title: string;
	buttons: {
		text: string;
		onClick: React.MouseEventHandler;
		isSecondary?: boolean;
		disabled?: boolean;
		loading?: boolean;
	}[];
}

const StyledButton = styled(Button)`
	margin: 5px 0;
`;

export default class Dismissable extends React.Component<Props, State> {
	static defaultProps = {
		title: "",
		buttons: [{ text: "Dismiss", onClick: () => {}, isSecondary: false, loading: false }],
	};

	render() {
		const { title, children, buttons } = this.props;
		return (
			<div className="onboarding-page">
				<form className="standard-form">
					<fieldset className="form-body">
						<div className="border-bottom-box">
							<h3>{title}</h3>
							{children}
							<div id="controls">
								<div className="button-group">
									{buttons.map(button => (
										<StyledButton
											loading={button.loading}
											isSecondary={button.isSecondary}
											disabled={button.disabled}
											className="control-button"
											onClick={button.onClick}
										>
											{button.text}
										</StyledButton>
									))}
								</div>
							</div>
						</div>
					</fieldset>
				</form>
			</div>
		);
	}
}
