import { ConfirmLoginCodeRequest, TokenLoginRequest } from "@codestream/protocols/agent";

import { PasswordLoginParams } from "@codestream/webview/Authentication/actions";
import { reset } from "../actions";
import { action } from "../common";
import { SessionActionType, SessionState } from "./types";

export { reset };

export const setSession = (session: Partial<SessionState>) =>
	action(SessionActionType.Set, session);

export const setTOS = (value: boolean) => action(SessionActionType.SetTOS, value);

interface pollRefreshRequest {
	pollRefresh?: boolean;
}

export const setMaintenanceMode = (
	value: boolean,
	meta?: PasswordLoginParams | TokenLoginRequest | ConfirmLoginCodeRequest | pollRefreshRequest
) => action(SessionActionType.SetMaintenanceMode, value, meta);
