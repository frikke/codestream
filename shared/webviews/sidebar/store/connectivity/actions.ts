import { action } from "../common";
import { ConnectivityActionsType } from "./types";

export const reset = () => action("RESET");

export const offline = (code?: string) => action(ConnectivityActionsType.Offline, { code });
export const online = () => action(ConnectivityActionsType.Online);
export const errorOccurred = (message: string, details?: string, maintenanceMode?: boolean) =>
	action(ConnectivityActionsType.ErrorOccurred, { message, details, maintenanceMode });
export const errorDismissed = () => action(ConnectivityActionsType.ErrorDismissed);
