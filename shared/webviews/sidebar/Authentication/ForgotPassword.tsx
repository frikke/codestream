import { SendPasswordResetEmailRequestType } from "@codestream/protocols/agent";
import React, { useCallback, useState } from "react";
import { FormattedMessage } from "react-intl";
import { connect, useDispatch } from "react-redux";
import { DispatchProp } from "../store/common";
import { goToLogin } from "../store/context/actions";
import Button from "../Stream/Button";
import { Link } from "../Stream/Link";
import { HostApi } from "../sidebar-api";
import { isEmailValid } from "./Signup";
import { TextInput } from "./TextInput";

interface Props extends DispatchProp {
	email?: string;
}

export const ForgotPassword = (connect(undefined) as any)((props: Props) => {
	const [emailSent, setEmailSent] = useState(false);

	const onClickGoToLogin = useCallback((event: React.SyntheticEvent) => {
		event.preventDefault();
		props.dispatch(goToLogin({ email: props.email }));
	}, []);

	return (
		<div className="onboarding-page">
			{emailSent ? (
				<form className="standard-form">
					<fieldset className="form-body">
						<div className="border-bottom-box">
							<h3>
								<FormattedMessage
									id="forgotPassword.passwordReset"
									defaultMessage="Password Reset"
								/>
							</h3>
							<p>
								<FormattedMessage
									id="forgotPassword.checkEmail"
									defaultMessage="Check your email for a link to reset your password. If you don't receive it within a
								few minutes, check your spam folder."
								/>
							</p>
							<div id="controls">
								<div className="button-group">
									<Button className="control-button" onClick={onClickGoToLogin}>
										<FormattedMessage
											id="forgotPassword.returnSignIn"
											defaultMessage="Return to Sign In"
										/>
									</Button>
								</div>
							</div>
						</div>
					</fieldset>
				</form>
			) : (
				<Form email={props.email} onComplete={() => setEmailSent(true)} />
			)}
		</div>
	);
});

function Form(props: { email?: string; onComplete: Function }) {
	const dispatch = useDispatch();
	const [email, setEmail] = useState(props.email || "");
	const [emailValidity, setEmailValidity] = useState(props.email || "");

	const onValidityChanged = useCallback((_, valid) => {
		setEmailValidity(valid);
	}, []);

	const onClickGoBack = useCallback((event: React.FormEvent) => {
		event.preventDefault();
		dispatch(goToLogin({ email: props.email }));
	}, []);

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (email === "") return;

		await HostApi.instance.send(SendPasswordResetEmailRequestType, { email });
		props.onComplete();
	};

	return (
		<form className="standard-form" onSubmit={submit}>
			<fieldset className="form-body">
				<div className="border-bottom-box">
					<h3>
						<FormattedMessage id="signUp.passwordReset" defaultMessage="Password Reset" />
					</h3>
					<p>
						<FormattedMessage
							id="signUp.passwordResetEnterEmail"
							defaultMessage="Enter your email address and we will send you a link to reset your password."
						/>
					</p>
					<div id="controls">
						<div className="control-group">
							<br />
							{!emailValidity && (
								<small className="explainer error-message">
									<FormattedMessage id="signUp.email.invalid" />
								</small>
							)}
							<TextInput
								name="email"
								onChange={setEmail}
								value={email}
								validate={isEmailValid}
								onValidityChanged={onValidityChanged}
							/>
						</div>
						<div className="button-group">
							<Button className="control-button">
								<FormattedMessage id="forgotPassword.sendEmail" defaultMessage="Send Email" />
							</Button>
						</div>
					</div>
				</div>
				<div id="controls">
					<div className="footer">
						<Link onClick={onClickGoBack}>
							<p>
								<FormattedMessage id="forgotPassword.back" defaultMessage={"< Back"} />
							</p>
						</Link>
					</div>
				</div>
			</fieldset>
		</form>
	);
}
