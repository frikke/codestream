import React from "react";
import { noop } from "../utils";
import { openPanel, setCurrentCodemark } from "../store/context/actions";
import { WebviewPanels } from "@codestream/protocols/api";
import { useAppDispatch, useDidMount } from "../utilities/hooks";
import { HostApi } from "../sidebar-api";
import { HostDidReceiveRequestNotificationType } from "../ipc/host.protocol.notifications";
import { parseProtocol } from "../utilities/urls";

export type SearchContextType = {
	query: string;
	setQuery: (query: string) => void;
	goToSearch: (query?: string) => void;
};

const DEFAULT_SEARCH_CONTEXT = { query: "", setQuery: noop, goToSearch: noop } as const;

export const SearchContext = React.createContext<SearchContextType>(DEFAULT_SEARCH_CONTEXT);

export const SearchContextProvider = (props: React.PropsWithChildren<{}>) => {
	const dispatch = useAppDispatch();
	const [query, setQuery] = React.useState("");
	const goToSearch = React.useCallback((query?: string) => {
		dispatch(openPanel(WebviewPanels.FilterSearch));

		if (query != null && query.length > 0) setQuery(query);
	}, []);

	useDidMount(() => {
		const disposable = HostApi.sidebarInstance.on(
			HostDidReceiveRequestNotificationType,
			async e => {
				const route = parseProtocol(e.url);
				if (!route || !route.controller) return;
				if (route.controller === "search") {
					if (route.action) {
						switch (route.action) {
							case "open": {
								if (route.query) {
									const q = route.query["q"];
									if (q) {
										dispatch(setCurrentCodemark());
										goToSearch(q);
									}
								}
							}
						}
					}
				}
			}
		);

		return () => disposable.dispose();
	});

	return (
		<SearchContext.Provider value={{ query, setQuery, goToSearch }}>
			{props.children}
		</SearchContext.Provider>
	);
};
