import { Action, configureStore } from "@reduxjs/toolkit";
import { batchedSubscribe } from "redux-batched-subscribe";
import { ThunkAction } from "redux-thunk";
import { reduceApiVersioning } from "../store/apiVersioning/reducer";
import reduceCapabilities from "./capabilities/slice";
import { reduceCodeErrors } from "../store/codeErrors/reducer";
import { reduceCodemarks } from "../store/codemarks/reducer";
import reduceConfigs from "./configs/slice";
import { reduceConnectivity } from "../store/connectivity/reducer";
import { reduceContext } from "../store/context/reducer";
import { reduceDocumentMarkers } from "../store/documentMarkers/reducer";
import { reducePosts } from "../store/posts/reducer";
import { reducePreferences } from "../store/preferences/reducer";
import { reduceProviders } from "../store/providers/reducer";
import { reduceRepos } from "../store/repos/reducer";
import { reduceServices } from "../store/services/reducer";
import { reduceSession } from "../store/session/reducer";
import { reduceStreams } from "../store/streams/reducer";
import { reduceTeams } from "../store/teams/reducer";
import { reduceUnreads } from "../store/unreads/reducer";
import { reduceUsers } from "../store/users/reducer";
import { reduceVersioning } from "../store/versioning/reducer";
import { debounceToAnimationFrame } from "../utils";
import { reduceActiveIntegrations } from "./activeIntegrations/reducer";
import { reduceActivityFeed } from "./activityFeed/reducer";
import { reduceBootstrapped } from "./bootstrapped/reducer";
import { reduceCompanies } from "./companies/reducer";
import { reduceDocuments } from "./documents/reducer";
import { reduceDynamicLogging } from "./dynamicLogging/reducer";
import { reduceEditorContext } from "./editorContext/reducer";
import reduceIde from "./ide/slice";
import { reduceReviews } from "./reviews/reducer";
import providerPullRequests from "./providerPullRequests/slice";

const pluginVersion = (state = "", action) => {
	if (action.type === "@pluginVersion/Set") return action.payload;
	return state;
};

export const store = configureStore({
	reducer: {
		activeIntegrations: reduceActiveIntegrations,
		activityFeed: reduceActivityFeed,
		bootstrapped: reduceBootstrapped,
		capabilities: reduceCapabilities.reducer,
		codemarks: reduceCodemarks,
		companies: reduceCompanies,
		configs: reduceConfigs,
		connectivity: reduceConnectivity,
		context: reduceContext,
		documents: reduceDocuments,
		documentMarkers: reduceDocumentMarkers,
		editorContext: reduceEditorContext,
		ide: reduceIde,
		pluginVersion,
		posts: reducePosts,
		preferences: reducePreferences,
		repos: reduceRepos,
		reviews: reduceReviews,
		session: reduceSession,
		streams: reduceStreams,
		teams: reduceTeams,
		umis: reduceUnreads,
		users: reduceUsers,
		services: reduceServices,
		providers: reduceProviders,
		versioning: reduceVersioning,
		apiVersioning: reduceApiVersioning,
		providerPullRequests: providerPullRequests,
		codeErrors: reduceCodeErrors,
		dynamicLogging: reduceDynamicLogging,
	},
	// middleware: getDefaultMiddleware =>
	// 	getDefaultMiddleware().prepend(
	// 		batchedSubscribe(debounceToAnimationFrame((notify: Function) => notify())) as any
	// 	),
	enhancers: [batchedSubscribe(debounceToAnimationFrame((notify: Function) => notify()))],
});

export type AppDispatch = typeof store.dispatch;
export type CodeStreamState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
	ReturnType,
	CodeStreamState,
	unknown,
	Action<string>
>;

// export function createCodeStreamStore(
// 	initialState: any = {},
// 	thunkArg: any = {},
// 	consumerMiddleware: any[] = []
// ) {
// 	return createStore(
// 		reducer,
// 		initialState,
// 		composeWithDevTools(
// 			applyMiddleware(thunk.withExtraArgument(thunkArg), ...middleware, ...consumerMiddleware),
// 			batchedSubscribe(debounceToAnimationFrame((notify: Function) => notify())) as any
// 		)
// 	);
// }

// it's a good idea to keep this sorted alphabetically for debugging purposes
// export interface CodeStreamState {
// 	activeIntegrations: ActiveIntegrationsState;
// 	activityFeed: ActivityFeedState;
// 	apiVersioning: ApiVersioningState;
// 	bootstrapped: boolean;
// 	capabilities: CapabilitiesState;
// 	codemarks: CodemarksState;
// 	configs: ConfigsState;
// 	companies: CompaniesState;
// 	connectivity: ConnectivityState;
// 	context: ContextState;
// 	documents: DocumentsState;
// 	documentMarkers: DocumentMarkersState;
// 	editorContext: EditorContextState;
// 	ide: IdeState;
// 	pluginVersion: string;
// 	posts: PostsState;
// 	preferences: PreferencesState;
// 	providers: ProvidersState;
// 	providerPullRequests: ProviderPullRequestsState;
// 	repos: ReposState;
// 	reviews: ReviewsState;
// 	services: ServicesState;
// 	session: SessionState;
// 	streams: StreamsState;
// 	teams: TeamsState;
// 	umis: UnreadsState;
// 	users: UsersState;
// 	versioning: VersioningState;
// 	codeErrors: CodeErrorsState;
// 	dynamicLogging: DynamicLoggingState;
// }
