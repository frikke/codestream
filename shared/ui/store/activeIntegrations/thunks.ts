import {
	FetchThirdPartyBoardsRequestType,
	FetchThirdPartyCardsRequestType,
	ThirdPartyProviderConfig,
} from "@codestream/protocols/agent";
import { logError } from "@codestream/webview/logger";
import { CodeStreamState } from "@codestream/webview/store";
import {
	setLoading,
	updateForProvider,
} from "@codestream/webview/store/activeIntegrations/actions";
import { HostApi } from "@codestream/webview/webview-api";
import { AnyAction } from "redux";
import { ThunkAction, ThunkDispatch } from "redux-thunk";

const EMPTY_CUSTOM_FILTERS = { selected: "", filters: {} };

const getFilterCustom = (startWorkPreferences: any, providerId: string) => {
	const prefs = startWorkPreferences[providerId] || {};
	return prefs.filterCustom && prefs.filterCustom.filters
		? { ...prefs.filterCustom }
		: EMPTY_CUSTOM_FILTERS;
};

export const fetchBoardsAndCardsAction =
	(
		activeProviders: ThirdPartyProviderConfig[]
	): ThunkAction<void, CodeStreamState, unknown, AnyAction> =>
	async (dispatch, getState) => {
		console.debug(
			"Loading boards/cards for providers",
			JSON.stringify(activeProviders.map(p => p.id))
		);
		dispatch(setLoading({ issuesLoading: true }));
		try {
			const startWorkPreferences = getState().preferences.startWork || {};
			await Promise.all([
				_fetchBoards(dispatch, activeProviders),
				_fetchCards(dispatch, activeProviders, startWorkPreferences),
			]);
			dispatch(setLoading({ initialLoadComplete: true }));
		} finally {
			dispatch(setLoading({ issuesLoading: false }));
		}
	};

const _fetchCards = async (
	dispatch: ThunkDispatch<any, any, any>,
	activeProviders,
	startWorkPreferences: any
) => {
	const start = Date.now();
	try {
		await Promise.all(
			activeProviders.map(async provider => {
				try {
					const filterCustom = getFilterCustom(startWorkPreferences, provider.id);
					const response = await HostApi.instance.send(FetchThirdPartyCardsRequestType, {
						customFilter: filterCustom.selected,
						providerId: provider.id,
					});
					dispatch(
						updateForProvider(provider.id, {
							cards: response.cards,
							fetchCardsError: response.error,
						})
					);
				} catch (error) {
					logError(error, { detail: "Error Loading Cards" });
				}
			})
		);
	} finally {
		const elapsed = Date.now() - start;
		console.debug(`Completed _fetchCards \u2022 ${elapsed} ms`);
	}
};

export const _fetchBoards = async (dispatch, activeProviders: ThirdPartyProviderConfig[]) => {
	const start = Date.now();
	try {
		await Promise.all(
			activeProviders.map(async provider => {
				try {
					const response = await HostApi.instance.send(FetchThirdPartyBoardsRequestType, {
						providerId: provider.id,
					});
					dispatch(updateForProvider(provider.id, { boards: response.boards } as any));
				} catch (error) {
					logError(error, { detail: "Error Loading Boards" });
				}
			})
		);
	} finally {
		const elapsed = Date.now() - start;
		console.debug(`Completed _fetchBoards \u2022 ${elapsed} ms`);
	}
};
