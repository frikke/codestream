import { GetInviteInfoRequestType } from "@codestream/protocols/agent";
import { LoginResult } from "@codestream/protocols/api";
import { HostApi } from "@codestream/webview/webview-api";
import React, { useCallback, useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import { UpdateServerUrlRequestType } from "../ipc/host.protocol";
import { CodeStreamState } from "../store";
import { goToSignup } from "../store/context/actions";
import Button from "../Stream/Button";
import { SignupType } from "./actions";
import { TextInput } from "./TextInput";

const errorToMessageId = {
	[LoginResult.InvalidToken]: "confirmation.invalid",
	[LoginResult.ExpiredToken]: "confirmation.expired",
	[LoginResult.Timeout]: "unexpectedError",
	[LoginResult.Unknown]: "unexpectedError",
};

export interface JoinTeamProps {
	useComponent?: boolean;
}

export const JoinTeam = (props: React.PropsWithChildren<JoinTeamProps>) => {
	const dispatch = useDispatch();
	const [inviteCode, setInviteCode] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<LoginResult | undefined>(undefined);
	const [waitingForServerUrl, setWaitingForServerUrl] = useState("");
	const [waitingForServerUrlTimeout, setWaitingForServerUrlTimeout] = useState<any>(undefined);

	// called when we have an invite code, and for on-prem, when we know the server url has been set
	const checkInviteInfo = async code => {
		const { status, info } = await HostApi.instance.send(GetInviteInfoRequestType, {
			code,
		});

		if (status === LoginResult.Success) {
			let tosType;
			const picker = Math.random();
			picker < 0.5 ? (tosType = "Interstitial") : (tosType = "Links");
			// HostApi.instance.track("Reg Path Selected", {
			// 	"Reg Path": "Join Team",
			// 	"TOS Type": tosType,
			// });
			// HostApi.instance.track("Joined Organization", {
			// 	Availability: ""
			// });
			dispatch(goToSignup({ ...info, inviteCode: code, type: SignupType.JoinTeam, tosType }));
		} else {
			setIsLoading(false);
			setError(status);
		}
	};

	const serverUrl = useSelector((state: CodeStreamState) => state.configs.serverUrl);

	useEffect(() => {
		if (waitingForServerUrl && serverUrl === waitingForServerUrl) {
			setWaitingForServerUrl("");
			if (waitingForServerUrlTimeout) clearTimeout(waitingForServerUrlTimeout);
			setWaitingForServerUrlTimeout(undefined);
			checkInviteInfo(inviteCode);
		}
	}, [waitingForServerUrl, serverUrl, inviteCode, waitingForServerUrlTimeout]);

	const onChange = useCallback(code => {
		setError(undefined);
		setInviteCode(code);
	}, []);

	const onClickJoin = useCallback(
		async event => {
			event.preventDefault();
			const code = inviteCode.trim();
			if (code === "") return;
			setIsLoading(true);

			if (code.startsWith("$01$")) {
				// this is an "on-prem" invite code, with the server url baked in,
				// decode it and set our server settings
				return setServerUrlSettingsFromInviteCode(code);
			} else {
				return checkInviteInfo(code);
			}
		},
		[inviteCode]
	);

	const setServerUrlSettingsFromInviteCode = async (code: string) => {
		const encoded = code.substring(4);
		let decoded: string, disableStrictSSL: boolean, serverUrl: string;
		try {
			decoded = atob(encoded);
			disableStrictSSL = decoded.charAt(8) === "1" ? true : false;
			serverUrl = decoded.substring(9);
		} catch (error) {
			setIsLoading(false);
			setError(LoginResult.InvalidToken);
			return;
		}

		if (serverUrl) {
			// we need to wait until the server url change has propagated through the layers
			// before we can proceed with checking it against the api server ... that should
			// happen pretty quickly, so set a 1-second timer to get it
			setWaitingForServerUrl(serverUrl);
			const timeout = setTimeout(() => {
				setIsLoading(false);
				setWaitingForServerUrlTimeout(undefined);
				setError(LoginResult.Timeout);
			}, 5000);
			setWaitingForServerUrlTimeout(timeout);
			HostApi.instance.send(UpdateServerUrlRequestType, {
				serverUrl,
				disableStrictSSL,
			});
		} else {
			setIsLoading(false);
			setError(LoginResult.InvalidToken);
		}
	};

	const errorId = error && (errorToMessageId[error] || errorToMessageId.UNKNOWN);

	const component = () => {
		return (
			<div className="two-col" style={{ display: "flex" }}>
				<div style={{ width: "100%", position: "relative" }}>
					<TextInput
						value={inviteCode}
						onChange={onChange}
						placeholder="Enter invitation code"
						hasError={!!error}
					/>
					{error && (
						<small className="explainer error-message" style={{ top: "8px" }}>
							<FormattedMessage id={errorId} defaultMessage="Invalid code." />
						</small>
					)}
				</div>
				<Button
					className="control-button"
					type="button"
					onClick={onClickJoin}
					loading={isLoading}
					style={{ width: "10em", marginLeft: "20px" }}
				>
					<b style={{ fontSize: "15px" }}>Join</b>
				</Button>
			</div>
		);
	};

	if (props?.useComponent) return component();

	return (
		<div className="standard-form" style={{ padding: "0 0 0 0" }}>
			<fieldset className="form-body" style={{ padding: 0 }}>
				<div className="border-bottom-box">
					<h3>
						<FormattedMessage
							id="joinTeam.alreadyTeam"
							defaultMessage="Is your team already on CodeStream?"
						/>
					</h3>
					<div id="controls">
						<div className="control-group">
							<p>
								<FormattedMessage
									id="joinTeam.invitationCode"
									defaultMessage="Use your invitation code to connect with your teammates."
								/>
							</p>
							{component()}
						</div>
					</div>
				</div>
			</fieldset>
		</div>
	);
};
