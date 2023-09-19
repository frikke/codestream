import { SetPasswordRequestType } from "@codestream/protocols/agent";
import { useAppDispatch, useAppSelector } from "@codestream/sidebar/utilities/hooks";
import React, { useCallback, useState } from "react";
import { FormattedMessage } from "react-intl";
import { BoxedContent } from "../src/components/BoxedContent";
import { CodeStreamState } from "../store";
import { goToLogin } from "../store/context/actions";
import Button from "../Stream/Button";
import { HostApi } from "../sidebar-api";
import { authenticate } from "./actions";
import { TextInput } from "./TextInput";

export interface MustSetPasswordProps {
	email: string;
}

const isPasswordValid = (password: string) => password.length >= 6;

export const MustSetPassword = (props: MustSetPasswordProps) => {
	const dispatch = useAppDispatch();
	const serverUrl = useAppSelector((state: CodeStreamState) => state.configs.serverUrl);
	const [password, setPassword] = useState("");
	const [passwordIsValid, setPasswordIsValid] = useState(true);
	const [isLoading, setIsLoading] = useState(false);

	const onValidityChanged = useCallback((_, valid) => {
		setPasswordIsValid(valid);
	}, []);

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (password === "" && !passwordIsValid) return;

		setIsLoading(true);
		const response = await HostApi.instance.send(SetPasswordRequestType, { password });
		try {
			// @ts-ignore - the await is necessary
			await dispatch(
				authenticate({
					token: {
						email: props.email || "",
						url: serverUrl,
						value: response.accessToken,
						teamId: "",
					},
				})
			);
		} catch (error) {
			dispatch(goToLogin());
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="onboarding-page">
			<form className="standard-form" onSubmit={submit}>
				<fieldset className="form-body">
					<BoxedContent title="Set a password">
						<p>
							<FormattedMessage
								id="mustSetPassword.enterPassword"
								defaultMessage="Enter a password below."
							/>
						</p>
						<div id="controls">
							<div className="control-group">
								<br />
								{passwordIsValid ? (
									<small className="explainer">
										<FormattedMessage id="setPassword.help" />
									</small>
								) : (
									<small className="explainer error-message">
										<FormattedMessage id="signUp.email.invalid" />
									</small>
								)}
								<TextInput
									nativeProps={{ autoFocus: true }}
									name="password"
									type="password"
									onChange={setPassword}
									value={password}
									validate={isPasswordValid}
									onValidityChanged={onValidityChanged}
								/>
							</div>
							<div className="button-group">
								<Button
									className="control-button"
									loading={isLoading}
									disabled={!isPasswordValid(password)}
								>
									<FormattedMessage id="setPassword.setPassword" />
								</Button>
							</div>
						</div>
					</BoxedContent>
				</fieldset>
			</form>
		</div>
	);
};
