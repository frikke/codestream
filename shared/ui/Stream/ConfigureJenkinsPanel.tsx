import React, { useRef, useState } from "react";

import { CodeStreamState } from "@codestream/webview/store";
import { useAppDispatch, useAppSelector, useDidMount } from "@codestream/webview/utilities/hooks";
import { configureProvider, connectProvider, ViewLocation } from "../store/providers/actions";
import { closePanel } from "./actions";
import Button from "./Button";
import CancelButton from "./CancelButton";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import { normalizeUrl } from "@codestream/webview/utilities/urls";
import UrlInputComponent from "@codestream/webview/Stream/UrlInputComponent";

interface Props {
	providerId: string;
	originLocation: ViewLocation | string;
}

export default function ConfigureJenkinsPanel(props: Props) {
	const urlInput = useRef<HTMLInputElement>(null);

	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { providers, ide } = state;
		const provider = providers[props.providerId];
		const isInVscode = ide.name === "VSC";
		const providerDisplay = PROVIDER_MAPPINGS[provider.name];
		return { provider, providerDisplay, isInVscode };
	});

	const dispatch = useAppDispatch();

	const [baseUrl, setBaseUrl] = useState("");
	const [baseUrlValid, setBaseUrlValid] = useState(false);
	const [apiKey, setApiKey] = useState("");
	const [apiKeyTouched, setApiKeyTouched] = useState(false);
	const [username, setUsername] = useState("");
	const [usernameTouched, setUsernameTouched] = useState(false);

	const [submitAttempted, setSubmitAttempted] = useState(false);
	const [loading, setLoading] = useState(false);

	useDidMount(() => {
		urlInput.current?.focus();
	});

	const onSubmit = async e => {
		e.preventDefault();
		setSubmitAttempted(true);
		if (isFormInvalid()) return;
		setLoading(true);
		const { providerId } = props;

		const accessToken = btoa(`${username}:${apiKey}`);

		await dispatch(
			configureProvider(
				providerId,
				{
					accessToken: accessToken,
					userId: username,
					data: { baseUrl: normalizeUrl(baseUrl) || "" },
				},
				{ setConnectedWhenConfigured: false, verify: true }
			)
		);
		await dispatch(connectProvider(providerId, props.originLocation));

		setLoading(false);
		await dispatch(closePanel());
	};

	const renderError = () => {};

	const onBlurApiKey = () => {
		setApiKeyTouched(true);
	};
	const onBlurUsername = () => {
		setUsernameTouched(true);
	};

	const renderApiKeyHelp = () => {
		if (apiKeyTouched || submitAttempted) {
			if (apiKey.trim().length === 0) return <small className="error-message">Required</small>;
		}
		return;
	};

	const renderUsernameHelp = () => {
		if (usernameTouched || submitAttempted) {
			if (username.trim().length === 0) return <small className="error-message">Required</small>;
		}
		return;
	};

	const isFormInvalid = () => {
		return apiKey.trim().length === 0 || username.trim().length === 0 || !baseUrlValid;
	};

	const inactive = false;
	const { providerDisplay } = derivedState;
	const { displayName, urlPlaceholder, invalidHosts } = providerDisplay;
	const providerShortName = providerDisplay.shortDisplayName || displayName;

	return (
		<div className="panel configure-provider-panel">
			<form className="standard-form vscroll" onSubmit={onSubmit}>
				<div className="panel-header">
					<CancelButton onClick={() => dispatch(closePanel())} />
					<span className="panel-title">Configure {displayName}</span>
				</div>
				<fieldset className="form-body" disabled={inactive}>
					{renderError()}
					<div id="controls">
						<div key="baseurl" id="configure-jenkins-controls-baseurl" className="control-group">
							<UrlInputComponent
								inputRef={urlInput}
								providerShortName={providerShortName}
								invalidHosts={invalidHosts}
								submitAttempted={submitAttempted}
								onChange={value => setBaseUrl(value)}
								onValidChange={valid => setBaseUrlValid(valid)}
								placeholder={urlPlaceholder}
								showInstructions={false}
							/>
						</div>
						<div key="username" id="configure-jenkins-controls-username" className="control-group">
							<label>
								<strong>{providerShortName} Username</strong>
							</label>
							<input
								className="input-text control"
								type="text"
								name="username"
								value={username}
								onChange={e => setUsername(e.target.value)}
								onBlur={onBlurUsername}
								id="configure-provider-username"
							/>
							{renderUsernameHelp()}
						</div>
						<div key="apiKey" id="configure-jenkins-controls-apikey" className="control-group">
							<label>
								<strong>{providerShortName} API Key</strong>
							</label>
							<label>
								Please provide an API Key we can use to access your {providerShortName} jobs and
								build statuses.
							</label>
							<input
								className="input-text control"
								type="password"
								name="apiKey"
								value={apiKey}
								onChange={e => setApiKey(e.target.value)}
								onBlur={onBlurApiKey}
								id="configure-provider-apikey"
							/>
							{renderApiKeyHelp()}
						</div>
						<div className="button-group">
							<Button id="save-button" className="control-button" type="submit" loading={loading}>
								Submit
							</Button>
							<Button
								id="discard-button"
								className="control-button cancel"
								type="button"
								onClick={() => dispatch(closePanel())}
							>
								Cancel
							</Button>
						</div>
					</div>
				</fieldset>
			</form>
		</div>
	);
}
