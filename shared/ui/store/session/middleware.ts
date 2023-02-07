import { PollForMaintenanceModeRequestType } from "@codestream/protocols/agent";
import { authenticate } from "@codestream/webview/Authentication/actions";
import { errorDismissed } from "@codestream/webview/store/connectivity/actions";
import { Middleware } from "redux";
import { AppDispatch, CodeStreamState } from "..";
import { RestartRequestType } from "../../ipc/webview.protocol";
import { HostApi } from "../../webview-api";
import { setMaintenanceMode } from "./actions";
import { SessionActionType } from "./types";
import { isBoolean as _isBoolean } from "lodash-es";

interface PollRefreshRequest {
	payload: any;
	meta?: {
		pollRefresh?: boolean;
		visible?: boolean;
	};
}

export const sessionMiddleware: Middleware =
	({ dispatch, getState }: { dispatch: AppDispatch; getState: () => CodeStreamState }) =>
	next => {
		let pollingTask: Poller | undefined;

		return action => {
			const result = next(action);

			if (action.type === SessionActionType.SetMaintenanceMode) {
				const { payload: enteringMaintenanceMode, meta }: PollRefreshRequest = action;

				const csNotVisible = _isBoolean(meta?.visible) && !meta?.visible;

				if (meta?.pollRefresh || csNotVisible) {
					pollingTask?.stop();
					pollingTask = undefined;
				}

				// entering maintenance mode, create poll that pings until we leave maintenance mode.
				// should poll once every minute
				if (
					enteringMaintenanceMode &&
					(pollingTask == undefined || meta?.pollRefresh) &&
					!csNotVisible
				) {
					pollingTask = new Poller(60000, async () => {
						if (getState().session.inMaintenanceMode) {
							try {
								// @ts-ignore
								if (meta && !meta?.pollRefresh) {
									await dispatch(authenticate(meta as any));
								} else {
									const resp = await HostApi.instance.send(
										PollForMaintenanceModeRequestType,
										void {}
									);
									if (!resp.maintenanceMode) {
										await dispatch(setMaintenanceMode(false));
										await dispatch(errorDismissed());
										HostApi.instance.send(RestartRequestType, void {});
									}
								}
								return !getState().session.inMaintenanceMode;
							} catch (error) {
								return;
							}
						} else {
							return true;
						}
					});

					pollingTask.start();
					pollingTask.onDidStop(() => (pollingTask = undefined));
				}
				// leaving maintenance mode, create poll that pings until we enter maintenance mode.
				// should poll once every 10 minutes
				if (
					!enteringMaintenanceMode &&
					(pollingTask == undefined || meta?.pollRefresh) &&
					!csNotVisible
				) {
					pollingTask = new Poller(600000, async () => {
						if (!getState().session.inMaintenanceMode) {
							try {
								const resp = await HostApi.instance.send(
									PollForMaintenanceModeRequestType,
									void {}
								);
								if (resp.maintenanceMode) {
									await dispatch(setMaintenanceMode(true));
									await dispatch(errorDismissed());
									HostApi.instance.send(RestartRequestType, void {});
								}
								return getState().session.inMaintenanceMode;
							} catch (error) {
								return;
							}
						} else {
							return true;
						}
					});

					pollingTask.start();
					pollingTask.onDidStop(() => (pollingTask = undefined));
				}
			}

			return result;
		};
	};

/*
	The executor will be invoked repeatedly according to the schedule until it returns `true` or
	a promise resolving as `true`
*/
type PollExecutor = () => boolean | void | Promise<boolean | void>;

class Poller {
	private _timerId?: number;
	private _listeners: (() => void)[] = [];
	get isRunning() {
		return this._timerId != undefined;
	}

	constructor(private readonly _time: number, private readonly _executor: PollExecutor) {}

	onDidStop(cb: () => void) {
		this._listeners.push(cb);
	}

	start() {
		if (!this.isRunning) this.schedule();
	}

	private schedule() {
		this._timerId = setTimeout(async () => {
			let result;

			try {
				result = await this._executor();
			} catch (error) {
				// TODO: onWillThrowError() or something to give clients a chance to handle it, otherwise throw the error
				throw error;
			}

			if (result === true) {
				this.stop();
			} else {
				this.schedule();
			}
		}, this._time) as unknown as number;
	}

	stop() {
		if (this._timerId != undefined) {
			clearTimeout(this._timerId);
			this._timerId = undefined;
			this._listeners.forEach(cb => {
				try {
					cb();
				} catch (error) {}
			});
		}
	}
}
