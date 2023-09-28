import { EnvironmentHost, GetFileScmInfoResponse } from "@codestream/protocols/agent";
import { CSEligibleJoinCompany, WebviewPanels } from "@codestream/protocols/api";
import { Position, Range } from "vscode-languageserver-types";

import { NewPullRequestBranch } from "./sidebar.protocol";

export const MaxRangeValue = 2147483647;

export interface EditorMargins {
	top?: number;
	right?: number;
	bottom?: number;
	left?: number;
}

export enum EditorScrollMode {
	Pixels = "pixels",
	Lines = "lines",
}

export interface EditorMetrics {
	fontSize?: number;
	lineHeight?: number;
	margins?: EditorMargins;
	scrollMode?: EditorScrollMode;
	scrollRatio?: number;
}

export type SidebarLocation = "left" | "right" | "top" | "bottom" | "floating";

export interface EditorSidebarLocation {
	location?: SidebarLocation;
}

export interface EditorSelection extends Range {
	// MUST be identical to Range.end
	cursor: Position;
}

// this is for mixpanel and maps the values from WebviewPanels to their
// corresponding human-readable names
export const WebviewPanelNames = {
	activity: "Activity",
	"filter-search": "Filter & Search",
	"new-comment": "NewComment",
	"new-issue": "New Issue",
	"new-review": "New Review",
	people: "My Team",
	profile: "Profile",
	review: "Review",
	status: "Status",
	"landing-redirect": "Landing Redirect",
	"gtting-started": "Getting Started", // this is a typo but now baked into user data, so let's just leave it
	"open-pull-requests": "Pull Requests",
	"open-reviews": "Feedback Requests",
	"codemarks-for-file": "Codemarks",
	tasks: "Issues",
	onboard: "Onboard",
	"blame-map": "Blame Map",
	newrelic: "Observability",
	observability: "Observability",
	"pixie-dynamic-logging": "Dynamic Logging Using Pixie",
	"ci-cd": "CI/CD",
	"code-analyzers": "Code Analyzers",
};

export enum WebviewModals {
	AcceptCompanyInvite = "accept-company-invite",
	ChangeAvatar = "change-avatar",
	ChangeEmail = "change-email",
	ChangeFullName = "change-full-name",
	ChangePassword = "change-password",
	ChangePhoneNumber = "change-phone-number",
	ChangeUsername = "change-username",
	ChangeWorksOn = "change-works-on",
	ChangeTeamName = "change-team-name",
	ChangeCompanyName = "change-company-name",
	CreateTeam = "create-team",
	CreateCompany = "create-company",
	FinishReview = "finish-review",
	TeamSetup = "team-setup",
	Keybindings = "keybindings",
	Notifications = "notifications",
	CLMSettings = "clm-settings",
	Invite = "invite",
	BlameMap = "blame-map",
	Team = "people",
	Profile = "profile",
	AddNewRelicNodeJS = "add-new-relic-nodejs",
	AddNewRelicJava = "add-new-relic-java",
}

export interface CodeErrorData {
	// REMOVE BELOW
	parsedStack?: any;
	// REMOVE ABOVE
	remote?: string;
	commit?: string;
	tag?: string;
	/** caches when the last user session started  */
	sessionStart?: number;
	pendingRequiresConnection?: boolean;
	pendingErrorGroupGuid?: string;
	pendingEntityId?: string;
	occurrenceId?: string;
	lineIndex?: number;
	timestamp?: number;
	openType?: "Open in IDE Flow" | "Observability Section" | "Activity Feed";
	multipleRepos?: boolean;
	claimWhenConnected?: boolean;
}

export interface TeamlessContext {
	selectedRegion?: string;
	forceRegion?: string;
}

export interface PullRequest {
	providerId: string;
	id: string;
	commentId?: string;
	/* defined if this was triggered by an external means (like an IDE button, etc.) */
	source?: string;
	/* details means show the full PR as the only view. sidebar-diffs means to show it as an expanded tree node */
	view?: "details" | "sidebar-diffs";
	previousView?: "details" | "sidebar-diffs" | undefined;
	metadata?: any;
	groupIndex?: string | undefined;
}

export interface WebviewContext {
	currentTeamId: string;
	sessionStart?: number;
	currentStreamId?: string;
	threadId?: string;
	currentRepo?: {
		id: string;
		path: string;
	};
	currentCodemarkId?: string;
	currentReviewId?: string;
	currentReviewOptions?: {
		includeLatestCommit?: boolean;
		openFirstDiff?: boolean;
	};
	anomaliesNeedRefresh?: boolean;
	/**
	 * This could be a real codeErorr.id or a PENDING-${id}
	 */
	currentCodeErrorId?: string;
	currentCodeErrorData?: CodeErrorData;
	createPullRequestReviewId?: string;
	createPullRequestOptions?: NewPullRequestBranch;
	currentPullRequest?: PullRequest | undefined;
	profileUserId?: string;
	currentMarkerId?: string;
	isRepositioning?: boolean;
	hasFocus: boolean;
	/** the first page seen after registration */
	isFirstPageview?: boolean;
	panelStack?: (WebviewPanels | string)[];
	activePanel?: WebviewPanels;
	startWorkCard?: any; // TODO figure out how to type CardView which include JSX.Element
	onboardStep: number;
	pendingProtocolHandlerUrl?: string;
	pendingProtocolHandlerQuery?: any;
	forceRegion?: string;
	__teamless__?: TeamlessContext;
}

export interface SessionState {
	otc?: string;
	userId?: string;
	inMaintenanceMode?: boolean;
	acceptedTOS?: boolean;
	machineId?: string;
	eligibleJoinCompanies?: CSEligibleJoinCompany[];
}

export interface EditorContext {
	scmInfo?: GetFileScmInfoResponse;
	activeFile?: string;
	lastActiveFile?: string;
	textEditorVisibleRanges?: Range[];
	textEditorUri?: string;
	textEditorGitSha?: string;
	textEditorSelections?: EditorSelection[];
	metrics?: EditorMetrics;
	textEditorLineCount?: number;
	visibleEditorCount?: number; // only populated (and used) by vscode
	sidebar?: {
		location?: SidebarLocation;
	};
	/* spawned process buffer text */
	buffer?: {
		text?: string;
	};
}

export interface EditorLayout {
	sidebar?: {
		location?: SidebarLocation;
	};
}

export interface WebviewConfigs {
	showHeadshots: boolean;
	debug: boolean;
	email?: string;
	serverUrl: string;
	team?: string;
	environment: string;
	isOnPrem: boolean;
	isProductionCloud: boolean;
	isWebmail?: boolean;
	showGoldenSignalsInEditor?: boolean;
	environmentHosts?: EnvironmentHost[];
	newRelicApiUrl?: string;
	configChangeReloadRequired?: boolean;
}

export interface IpcHost {
	postMessage<R>(message: WebviewIpcMessage, targetOrgigin: string, transferable?: any): Promise<R>;
	postMessage<R>(message: WebviewIpcMessage): Promise<R>;
	onmessage: any;
}

// declare function acquireCodestreamHostForEditor(): IpcHost;
// declare function acquireCodestreamHostForSidebar(): IpcHost;

// let host: IpcHost;
// export const findHost = (webview: string): IpcHost => {
// 	//if (host) return host;
// 	try {
// 		if (webview === "editor") {
// 			host = acquireCodestreamHostForEditor();
// 		} else if (webview === "sidebar") {
// 			host = acquireCodestreamHostForSidebar();
// 		}
// 	} catch (e) {
// 		throw new Error("Host needs to provide global `acquireCodestreamHost` function");
// 	}
// 	return host;
// };

export enum IpcRoutes {
	Agent = "codestream",
	Host = "host",
	Webview = "webview",
}

export interface WebviewIpcNotificationMessage {
	method: string;
	params?: any;
}

export interface WebviewIpcRequestMessage {
	id: string;
	method: string;
	params?: any;
}

export interface WebviewIpcResponseMessage {
	id: string;
	params?: any;
	error?: any;
}

export type WebviewIpcMessage =
	| WebviewIpcNotificationMessage
	| WebviewIpcRequestMessage
	| WebviewIpcResponseMessage;

// Don't use as for some reason it isn't a valid type guard
// export function isIpcNotificationMessage(
// 	msg: WebviewIpcMessage
// ): msg is WebviewIpcNotificationMessage {
// 	return (msg as any).method != null && (msg as any).id == null;
// }

export function isIpcRequestMessage(msg: WebviewIpcMessage): msg is WebviewIpcRequestMessage {
	return (msg as any).method != null && (msg as any).id != null;
}

export function isIpcResponseMessage(msg: WebviewIpcMessage): msg is WebviewIpcResponseMessage {
	return (msg as any).method == null && (msg as any).id != null;
}
