import React, { useRef, useState } from "react";

import { CodeStreamState } from "@codestream/webview/store";
import { useAppDispatch, useAppSelector, useDidMount } from "@codestream/webview/utilities/hooks";
import { configureProvider, ViewLocation } from "../store/providers/actions";
import { Link } from "../Stream/Link";
import { closePanel } from "./actions";
import Button from "./Button";
import CancelButton from "./CancelButton";
import { PROVIDER_MAPPINGS } from "./CrossPostIssueControls/types";
import { normalizeUrl } from "@codestream/webview/utilities/urls";

interface Props {
	providerId: string;
	originLocation: ViewLocation | string;
}

export default function ConfigureJenkinsPanel(props: Props) {
	const initialInput = useRef<HTMLInputElement>(null);

	const derivedState = useAppSelector((state: CodeStreamState) => {
		const { providers, ide } = state;
		const provider = providers[props.providerId];
		const isInVscode = ide.name === "VSC";
		const providerDisplay = PROVIDER_MAPPINGS[provider.name];
		return { provider, providerDisplay, isInVscode };
	});

	const dispatch = useAppDispatch();

	const [baseUrl, setBaseUrl] = useState("");
	const [baseUrlTouched, setBaseUrlTouched] = useState(false);
	const [apiKey, setApiKey] = useState("");
	const [apiKeyTouched, setApiKeyTouched] = useState(false);
	const [username, setUsername] = useState("");
	const [usernameTouched, setUsernameTouched] = useState(false);

	const [submitAttempted, setSubmitAttempted] = useState(false);
	const [loading, setLoading] = useState(false);

	useDidMount(() => {
		initialInput.current?.focus();
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
				{ data: { baseUrl: normalizeUrl(baseUrl) || "" }, accessToken: accessToken },
				{ setConnectedWhenConfigured: true, connectionLocation: props.originLocation, verify: true }
			)
		);
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
	const onBlurBaseUrl = () => {
		setBaseUrlTouched(true);
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

	const renderBaseUrlHelp = () => {
		if (baseUrlTouched || submitAttempted) {
			if (baseUrl.trim().length === 0) return <small className="error-message">Required</small>;
		}
		return;
	};
	const tabIndex = (): any => {};

	const isFormInvalid = () => {
		return (
			apiKey.trim().length === 0 && username.trim().length === 0 && baseUrl.trim().length === 0
		);
	};

	const inactive = false;
	const { providerDisplay, provider } = derivedState;
	const { scopes } = provider;
	const { displayName, urlPlaceholder, invalidHosts, helpUrl } = providerDisplay;
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
							<label>
								<strong>{providerShortName} Server Url</strong>
							</label>
							<label>
								Please provide the base url for {providerShortName} we can use to access your jobs
								and build statuses.
							</label>
							<input
								ref={initialInput}
								className="input-text control"
								type="text"
								name="baseUrl"
								tabIndex={tabIndex()}
								value={baseUrl}
								onChange={e => setBaseUrl(e.target.value)}
								onBlur={onBlurBaseUrl}
								id="configure-provider-baseurl"
							/>
							{renderBaseUrlHelp()}
						</div>
						<div key="username" id="configure-jenkins-controls-username" className="control-group">
							<label>
								<strong>{providerShortName} Username</strong>
							</label>
							<label>
								Please provide your username we can use to access your {providerShortName} jobs and
								build statuses.
							</label>
							<input
								ref={initialInput}
								className="input-text control"
								type="text"
								name="username"
								tabIndex={tabIndex()}
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
								Please provide an <Link href={helpUrl}>API Key</Link> we can use to access your{" "}
								{providerShortName} jobs and build statuses.
								{scopes && scopes.length && (
									<span>
										&nbsp;Your API Key should have the following scopes: <b>{scopes.join(", ")}</b>.
									</span>
								)}
							</label>
							<input
								ref={initialInput}
								className="input-text control"
								type="password"
								name="apiKey"
								tabIndex={tabIndex()}
								value={apiKey}
								onChange={e => setApiKey(e.target.value)}
								onBlur={onBlurApiKey}
								id="configure-provider-apikey"
							/>
							{renderApiKeyHelp()}
						</div>
						<div className="button-group">
							<Button
								id="save-button"
								className="control-button"
								tabIndex={tabIndex()}
								type="submit"
								loading={loading}
							>
								Submit
							</Button>
							<Button
								id="discard-button"
								className="control-button cancel"
								tabIndex={tabIndex()}
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
