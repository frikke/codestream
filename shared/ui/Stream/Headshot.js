import React, { Component } from "react";
import Gravatar from "react-gravatar";
import { confirmPopup } from "./Confirm";

export default class Headshot extends Component {
	render() {
		const person = this.props.person;
		if (!person) return null;

		if (person.username === "CodeStream") return this.renderCodeStream();

		let defaultImage = encodeURI(
			"https://images.codestream.com/misc/nothing_transparent-36x36.gif"
		);

		let authorInitials = (person.email && person.email.charAt(0)) || "";
		if (person.fullName) {
			authorInitials = person.fullName.replace(/(\w)\w*/g, "$1").replace(/\s/g, "");
			if (authorInitials.length > 2) authorInitials = authorInitials.substring(0, 2);
		} else if (person.username) {
			authorInitials = person.username.charAt(0);
		}

		if (person.avatar) {
			const uri =
				this.props.size > 48 ? person.avatar.image : person.avatar.image48 || person.avatar.image;

			if (uri)
				return (
					<div className="headshot" onClick={this.props.onClick}>
						<img className="headshot-image" src={uri} />
					</div>
				);
		}

		const classNameInitials = `headshot-initials color-${person.color || 1}`;

		return (
			<div className="headshot" onClick={this.props.onClick}>
				<Gravatar
					className="headshot-gravatar"
					size={this.props.size}
					default={defaultImage}
					protocol="https://"
					email={person.email}
				/>
				<div className={classNameInitials}>{authorInitials}</div>
			</div>
		);
	}

	handleEditHeadshot = event => {
		event.stopPropagation();
		confirmPopup({
			title: "Edit Headshot",
			message:
				"Until we have built-in CodeStream headshots, you can edit your headshot by setting it up on Gravatar.com for " +
				this.props.person.email +
				".\n\nNote that it might take a few minutes for your headshot to appear here.\n\n-Team CodeStream",
			buttons: [{ label: "OK" }],
		});
	};

	renderCodeStream() {
		return (
			<div className="headshot">
				<img
					className="headshot-system"
					src="https://images.codestream.com/logos/grey_blue_transparent-400x400.png"
				/>
			</div>
		);
	}
}
