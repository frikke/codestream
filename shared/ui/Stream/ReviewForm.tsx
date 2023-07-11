import {
	AddIgnoreFilesRequestType,
	ChangeDataType,
	CodemarkPlus,
	DidChangeDataNotificationType,
	GetFileScmInfoRequestType,
	GetFileScmInfoResponse,
	GetRepoScmStatusRequestType,
	GetRepoScmStatusResponse,
	GetReposScmRequestType,
	IgnoreFilesRequestType,
	ReposScm,
	UpdateReviewResponse,
	UpdateTeamSettingsRequestType,
} from "@codestream/protocols/agent";
import {
	CodemarkStatus,
	CSMe,
	CSReview,
	CSReviewApprovalSetting,
	CSReviewAssignmentSetting,
	CSStream,
	CSUser,
	FileStatus,
	ShareTarget,
	StreamType,
} from "@codestream/protocols/api";
import cx from "classnames";
// https://github.com/kaelzhang/node-ignore
import { DocumentData } from "@codestream/protocols/agent";
import ignore from "ignore";
import { debounce as _debounce } from "lodash-es";
import * as path from "path-browserify";
import React, { ReactElement } from "react";
import { connect } from "react-redux";
import styled from "styled-components";
import { Range } from "vscode-languageserver-types";
import { URI } from "vscode-uri";

import { editReview } from "@codestream/webview/store/reviews/thunks";
import {
	setCurrentRepo,
	setCurrentReview,
	setNewPostEntry,
} from "@codestream/webview/store/context/actions";
import { SelectPeople } from "@codestream/webview/src/components/SelectPeople";
import HeadshotMenu from "@codestream/webview/src/components/HeadshotMenu";
import { Headshot } from "@codestream/webview/src/components/Headshot";
import { LabeledSwitch } from "@codestream/webview/src/components/controls/LabeledSwitch";
import { WebviewPanels } from "@codestream/webview/ipc/webview.protocol.common";
import { ReviewShowLocalDiffRequestType } from "@codestream/protocols/webview";
import { EditorRevealRangeRequestType } from "../ipc/host.protocol.editor";
import { logError } from "../logger";
import { Checkbox } from "../src/components/Checkbox";
import { InlineMenu } from "../src/components/controls/InlineMenu";
import { CSText } from "../src/components/CSText";
import { FloatingLoadingMessage } from "../src/components/FloatingLoadingMessage";
import { HeadshotName } from "../src/components/HeadshotName";
import { LoadingMessage } from "../src/components/LoadingMessage";
import { CodeStreamState } from "../store";
import { isFeatureEnabled } from "../store/apiVersioning/reducer";
import { getReviewChangeRequests } from "../store/codemarks/reducer";
import { PostsActionsType } from "../store/posts/types";
import { EditableAttributes } from "../store/reviews/actions";
import { getAllByCommit, teamReviewCount } from "../store/reviews/reducer";
import { getStreamForId, getStreamForTeam } from "../store/streams/reducer";
import { getTeamSetting } from "../store/teams/reducer";
import {
	getActiveMemberIds,
	getTeamMates,
	getTeamMembers,
	getTeamTagsArray,
} from "../store/users/reducer";
import {
	arrayDiff,
	escapeHtml,
	keyFilter,
	keyFilterFalsey,
	mapFilter,
	replaceHtml,
	safe,
} from "../utils";
import { HostApi } from "../webview-api";
import {
	closePanel,
	createPostAndReview,
	openModal,
	openPanel,
	setCodemarkStatus,
	setUserPreference,
} from "./actions";
import { SetUserPreferenceRequest } from "./actions.types";
import Button from "./Button";
import CancelButton from "./CancelButton";
import { Meta, MetaDescriptionForAssignees, MetaLabel } from "./Codemark/BaseCodemark";
import { confirmPopup } from "./Confirm";
import { DropdownButton } from "./DropdownButton";
import { FeatureFlag } from "./FeatureFlag";
import Icon from "./Icon";
import { markdownify } from "./Markdowner";
import { MarkdownText } from "./MarkdownText";
import MessageInput, { AttachmentField } from "./MessageInput";
import { Modal } from "./Modal";
import { MetaCheckboxWithHoverIcon } from "./Review";
import { ChangesetFileList } from "./Review/ChangesetFileList";
import { CommitList } from "./Review/CommitList";
import { SharingAttributes, SharingControls } from "./SharingControls";
import { SmartFormattedList } from "./SmartFormattedList";
import Tag from "./Tag";
import Timestamp from "./Timestamp";
import Tooltip from "./Tooltip";

const NoWrap = styled.span`
	white-space: nowrap;
`;

interface Props extends ConnectedProps {
	editingReview?: CSReview;
	isEditing?: boolean;
	existingSharedTo?: ShareTarget[];
	isAmending?: boolean;
	onClose?: Function;
	openPanel: Function;
	openModal: Function;
	closePanel: Function;
	setUserPreference: (request: SetUserPreferenceRequest) => void;
	setCurrentReview: Function;
	setCurrentRepo: Function;
	setCodemarkStatus: Function;
	setNewPostEntry: Function;
}

interface ConnectedProps {
	teamId: string;
	teamMates: CSUser[];
	teamMembers: CSUser[];
	activeMemberIds: string[];
	channel: CSStream;
	providerInfo: {
		[service: string]: {};
	};
	currentUser: CSUser;
	skipPostCreationModal?: boolean;
	currentReviewOptions?: any;
	teamTagsArray: any;
	textEditorUri?: string;
	createPostAndReview?: Function;
	editReview?: (
		id: string,
		attributes: EditableAttributes,
		replyText?: string
	) => UpdateReviewResponse | undefined;
	repos: any;
	shouldShare: boolean;
	unsavedFiles: string[];
	reviewsByCommit: {
		[commit: string]: CSReview;
	};
	teamReviewCount: number;
	// these next two are team settings
	reviewApproval: CSReviewApprovalSetting;
	reviewAssignment: CSReviewAssignmentSetting;
	changeRequests?: CodemarkPlus[];
	inviteUsersOnTheFly: boolean;
	newPostEntryPoint?: string;
	blameMap?: { [email: string]: string };
	isCurrentUserAdmin: boolean;
	statusLabel: string;
	statusIcon: string;
	currentRepoPath?: string;
	ideSupportsCreateReviewOnCommit: boolean;
	isAutoFREnabled: boolean;
	createReviewOnCommit?: boolean;
}

interface State {
	title: string;
	titleTouched: boolean;
	text: string;
	textTouched: boolean;
	// for amending
	replyText: string;
	assignees: { value: any; label: string }[] | { value: any; label: string };
	assigneesRequired: boolean;
	assigneesDisabled: boolean;
	singleAssignee: boolean;
	reviewerEmails: string[]; // email address
	reviewersTouched: boolean;
	authorsBlameData: { [authorEmail: string]: { stomped: number; commits: number } };
	notify: boolean;
	isLoading: boolean;
	isLoadingScm: boolean;
	isReloadingScm: boolean;
	reviewCreationError: string;
	scmError: boolean;
	scmErrorMessage?: string;
	crossPostMessage: boolean;
	assignableUsers: { value: any; label: string }[];
	channelMenuOpen: boolean;
	channelMenuTarget: any;
	labelMenuOpen: boolean;
	labelMenuTarget: any;
	fromCommitMenuOpen: boolean;
	fromCommitMenuTarget: any;
	sharingDisabled?: boolean;
	selectedChannelName?: string;
	selectedChannelId?: string;
	codeBlockInvalid?: boolean;
	titleInvalid?: boolean;
	textInvalid?: boolean;
	reviewersInvalid?: boolean;
	assigneesInvalid?: boolean;
	sharingAttributesInvalid?: boolean;
	changesInvalid?: boolean;
	showAllChannels?: boolean;
	scmInfo: GetFileScmInfoResponse;
	repoUri?: string;
	selectedTags?: any;
	repoStatus: GetRepoScmStatusResponse;
	openRepos: ReposScm[];
	repoName: string;
	excludedFiles?: any;
	fromCommit?: string;
	includeSaved: boolean;
	includeStaged: boolean;
	excludeCommit: { [sha: string]: boolean };
	// -2 = saved, -1 = staged, 0...N = commit index
	topSelectionIndex: number;
	bottomSelectionIndex: number;
	startCommit: string | undefined;
	// if set, a SHA that represents a "hard start" to the review changeset
	prevEndCommit: string;
	unsavedFiles: string[];
	commitListLength: number;
	// this is the review setting
	allReviewersMustApprove: boolean;
	mountedTimestamp: number;
	currentFile?: string;
	editingReviewBranch?: string;
	addressesIssues: { [codemarkId: string]: boolean };
	createReviewOnCommit: boolean;
	showCreateReviewOnCommitToggle: boolean;
	attachments: AttachmentField[];
	isDragging: number;
}

function merge(defaults: Partial<State>, review: CSReview): State {
	return Object.entries(defaults).reduce((object, entry) => {
		const [key, value] = entry;
		object[key] = review[key] !== undefined ? review[key] : value;
		return object;
	}, Object.create(null));
}

class ReviewForm extends React.Component<Props, State> {
	static defaultProps = {
		isEditing: false,
		isAmending: false,
	};
	_titleInput: HTMLElement | null = null;
	_formDiv: HTMLElement | null = null;
	insertTextAtCursor?: Function;
	focusOnMessageInput?: Function;
	permalinkRef = React.createRef<HTMLTextAreaElement>();
	private _sharingAttributes?: SharingAttributes;
	private _disposableDidChangeDataNotification: { dispose(): void } | undefined = undefined;
	private ignoredFiles = ignore();
	private _dismissAutoFRTimeout?: any;

	constructor(props: Props) {
		super(props);
		const defaultState: Partial<State> = {
			title: "",
			titleTouched: false,
			text: "",
			textTouched: false,
			replyText: "",
			assignees: [],
			assigneesDisabled: false,
			assigneesRequired: false,
			singleAssignee: false,
			selectedChannelName: (props.channel as any).name,
			selectedChannelId: props.channel.id,
			assignableUsers: this.getAssignableCSUsers(),
			reviewerEmails: [],
			reviewersTouched: false,
			authorsBlameData: {},
			selectedTags: {},
			repoName: "",
			excludedFiles: {},
			includeSaved: !props.currentReviewOptions?.includeLatestCommit,
			includeStaged: !props.currentReviewOptions?.includeLatestCommit,
			topSelectionIndex: props.currentReviewOptions?.includeLatestCommit ? 0 : -2,
			bottomSelectionIndex: props.currentReviewOptions?.includeLatestCommit ? 0 : -1,
			excludeCommit: {},
			startCommit: undefined,
			prevEndCommit: "",
			unsavedFiles: props.unsavedFiles,
			commitListLength: 10,
			allReviewersMustApprove: false,
			currentFile: "",
			addressesIssues: {},
			attachments: [],
			isDragging: 0,
		};

		const state = props.editingReview
			? merge(defaultState, props.editingReview)
			: ({
					isLoading: false,
					isLoadingScm: false,
					isReloadingScm: false,
					scmError: false,
					scmErrorMessage: "",
					notify: false,
					...defaultState,
			  } as State);

		let assignees: any;
		if (props.isEditing && props.editingReview) {
			assignees = props.editingReview.reviewers.map(a =>
				state.assignableUsers.find((au: any) => au.value === a)
			);
			// @ts-ignore
			state.reviewerEmails = props.editingReview.reviewers
				.map(id => props.teamMembers.find(p => p.id === id))
				.map(p => p && p.email)
				.filter(Boolean);
		} else if (state.assignees === undefined) {
			assignees = undefined;
		} else if (Array.isArray(state.assignees)) {
			assignees = state.assignees.map(a => state.assignableUsers.find((au: any) => au.value === a));
		} else {
			assignees = state.assignableUsers.find((au: any) => au.value === state.assignees);
		}
		this.state = {
			...state,
			assignees,
		};

		if (props.isEditing && props.editingReview) {
			const selectedTags = {};
			(props.editingReview.tags || []).forEach(tag => {
				selectedTags[tag] = true;
			});
			this.state = {
				...this.state,
				selectedTags,
			};
		}
		if (props.isEditing && props.editingReview) {
			this.state = {
				...this.state,
				text: escapeHtml(this.state.text),
			};
		}
	}

	private async getScmInfoForURI(uri?: string, callback?: Function) {
		this.setState({ isLoadingScm: true });

		let firstRepoUri: string = "";
		const openRepos = await HostApi.instance.send(GetReposScmRequestType, {
			inEditorOnly: true,
		});
		if (openRepos && openRepos.repositories) {
			this.setState({ openRepos: openRepos.repositories });
			if (!uri && openRepos.repositories.length) {
				// use the uri of the first repo found
				// if there isn't a file's uri
				uri = firstRepoUri = openRepos.repositories[0].folder.uri;
			}
		}

		if (uri) {
			const scmInfo = await HostApi.instance.send(GetFileScmInfoRequestType, {
				uri: uri,
			});
			if (scmInfo.scm) {
				const repoId: string = scmInfo.scm.repoId || "";
				const repoName = this.props.repos[repoId] ? this.props.repos[repoId].name : "";
				this.setState({ scmInfo, repoName, startCommit: undefined }, () => {
					this.handleRepoChange(uri, callback);
				});
			} else {
				// if the URI we just updated to doesn't match a repo, for
				// example if the user initiates a code review from a diff
				// buffer, then try again but with the first URI from openRepos
				if (uri !== firstRepoUri) return this.getScmInfoForURI(firstRepoUri, callback);

				this.setState({ isLoadingScm: false, scmError: true });
				if (callback && typeof callback === "function") callback();
			}
		} else {
			this.setState({
				isLoadingScm: false,
				scmError: true,
				scmErrorMessage: "Please open a repository",
			});
			if (callback && typeof callback === "function") callback();
		}
	}

	private async getScmInfoForRepo() {
		this.setState({ isLoadingScm: true });
		const { editingReview } = this.props;

		const openRepos = await HostApi.instance.send(GetReposScmRequestType, {
			inEditorOnly: true,
		});
		if (editingReview && openRepos && openRepos.repositories) {
			const { reviewChangesets } = editingReview;
			const lastChangeset = reviewChangesets[reviewChangesets.length - 1];
			// FIXME -- when we have multi-repo reviews this needs to update
			const repoId = lastChangeset.repoId;
			const repo = openRepos.repositories.find(r => r.id === repoId);
			if (repo) {
				const repoName = repo.folder.name;
				const repoUri = repo.folder.uri;
				const commits = lastChangeset.commits || [];
				// the start commit of this checkpoint is the last commit
				const startCommit = commits.length > 0 ? commits[commits.length - 1].sha : "";
				this.setState(
					{
						repoName,
						startCommit,
						prevEndCommit: startCommit,
						editingReviewBranch: lastChangeset.branch,
					},
					() => {
						this.handleRepoChange(repoUri);
					}
				);
			}
		} else {
			this.setState({ isLoadingScm: false, scmError: true });
		}
	}

	componentDidMount() {
		const {
			isEditing,
			isAmending,
			textEditorUri,
			currentRepoPath,
			ideSupportsCreateReviewOnCommit,
			createReviewOnCommit,
			isAutoFREnabled,
		} = this.props;
		if (isEditing && !isAmending) return;

		this.setState({ mountedTimestamp: new Date().getTime() });
		if (!isEditing && !isAmending) {
			const isCreatingReviewOnCommit =
				this.props.currentReviewOptions && this.props.currentReviewOptions.includeLatestCommit;
			const showCreateReviewOnCommitToggle =
				ideSupportsCreateReviewOnCommit &&
				isAutoFREnabled &&
				(isCreatingReviewOnCommit || !createReviewOnCommit);
			this.setState({ showCreateReviewOnCommitToggle: showCreateReviewOnCommitToggle });

			if (isCreatingReviewOnCommit) {
				this._dismissAutoFRTimeout = setTimeout(() => {
					const { titleTouched, textTouched, reviewersTouched } = this.state;
					if (!titleTouched && !textTouched && !reviewersTouched) {
						this.props.closePanel();
					}
				}, 15 * 60 * 1000);
			}
		}

		if (isAmending) this.getScmInfoForRepo();
		else {
			const currentRepoUri = currentRepoPath ? path.join("file://", currentRepoPath) : undefined;
			this.getScmInfoForURI(currentRepoUri || textEditorUri, () => {
				this.props.setCurrentRepo();
				//HostApi.instance.send(TelemetryRequestType, {
				//	eventName: "Review Form Opened",
				//	properties: {
				//		"Repo Open": this.state.openRepos && this.state.openRepos.length > 0,
				//		"Suggested Reviewers": this.state.reviewerEmails && this.state.reviewerEmails.length > 0
				//	}
				//});
			});
		}

		this.focus();

		if (isAmending) {
			// https://github.com/iamdustan/smoothscroll/issues/28#issuecomment-638768782
			setTimeout(() => {
				if (this._formDiv)
					this._formDiv.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
			}, 0);
		}
	}

	componentWillUnmount = () => {
		clearTimeout(this._dismissAutoFRTimeout);
		this._disposableDidChangeDataNotification &&
			this._disposableDidChangeDataNotification.dispose();
	};

	async handleRepoChange(repoUri?, callback?) {
		this.setState({ isReloadingScm: true });
		try {
			const {
				teamMates,
				currentUser,
				isEditing,
				isAmending,
				inviteUsersOnTheFly,
				blameMap = {},
				editingReview,
			} = this.props;
			const {
				includeSaved,
				includeStaged,
				topSelectionIndex,
				repoStatus,
				startCommit,
				prevEndCommit,
			} = this.state;
			const includeLatestCommit =
				this.props.currentReviewOptions && this.props.currentReviewOptions.includeLatestCommit;

			const commits = repoStatus?.scm?.commits;
			const endCommit =
				commits != null && topSelectionIndex >= 0 ? commits[topSelectionIndex].sha : undefined;

			const uri = repoUri || this.state.repoUri;
			let statusInfo: GetRepoScmStatusResponse;
			try {
				statusInfo = await HostApi.instance.send(GetRepoScmStatusRequestType, {
					uri,
					startCommit,
					endCommit,
					includeStaged,
					includeSaved,
					currentUserEmail: currentUser.email,
					prevEndCommit,
					reviewId: editingReview && editingReview.id,
					includeLatestCommit,
				});
			} catch (e) {
				logError(e);
				this.setState({ isLoadingScm: false, isReloadingScm: false, scmError: true });
				return;
			}

			if (statusInfo.error) {
				this.setState({
					isLoadingScm: false,
					isReloadingScm: false,
					scmError: true,
					scmErrorMessage: statusInfo.error,
				});
				return;
			}

			if (!statusInfo.scm) {
				this.setState({
					isLoadingScm: false,
					isReloadingScm: false,
					scmError: true,
					scmErrorMessage: "Unable to retrieve Git repository information",
				});
			}

			if (statusInfo.scm?.remotes?.length === 0) {
				this.setState({
					isLoadingScm: false,
					isReloadingScm: false,
					scmError: true,
					scmErrorMessage:
						"This repository has no remotes.\n" +
						"Please configure a remote URL for this repository before creating a review.",
				});
				return;
			}

			this._disposableDidChangeDataNotification &&
				this._disposableDidChangeDataNotification.dispose();
			const self = this;
			const _debouncedHandleRepoChange = _debounce(() => {
				// if there is an error getting git info,
				// don't bother attempting since it's an error

				self.setState({ isReloadingScm: true });
				// handle the repo change, but don't pass the textEditorUri
				// as we don't want to switch the repo the form is pointing
				// to in these cases
				self.handleRepoChange();
			}, 100);

			this._disposableDidChangeDataNotification = HostApi.instance.on(
				DidChangeDataNotificationType,
				(e: any) => {
					// if we have a change to scm OR a file has been saved, update
					let update = false;
					if (
						e.type === ChangeDataType.Documents &&
						e.data &&
						(e.data as DocumentData).reason === "saved" &&
						(this.state.includeSaved || this.state.includeStaged)
					) {
						update = true;
					} else if (
						e.type === ChangeDataType.Commits &&
						e.data.repo &&
						this.state.repoStatus &&
						this.state.repoStatus.scm &&
						this.state.repoStatus.scm.repoId === e.data.repo.id &&
						!this.props.currentReviewOptions?.includeLatestCommit
					) {
						// listen only for changes related to the repo we are looking at
						update = true;
					}

					if (update && !this.state.scmError) {
						_debouncedHandleRepoChange();
					}
				}
			);

			this.setState({ repoStatus: statusInfo, repoUri: uri, currentFile: "" });
			if (!startCommit && statusInfo.scm && statusInfo.scm.startCommit) {
				let limitedLength: number | undefined = undefined;

				const startCommitIndex = this.getRowIndex(statusInfo.scm.startCommit);
				if (startCommitIndex != undefined && startCommitIndex >= 1) {
					const excludeCommit: { [sha: string]: boolean } = {};
					statusInfo.scm.commits?.forEach((commit, index) => {
						excludeCommit[commit.sha] = index >= startCommitIndex;
					});

					this.setState(
						{
							bottomSelectionIndex: startCommitIndex - 1,
							startCommit: statusInfo.scm.startCommit,
							excludeCommit,
						},
						() => this.handleRepoChange()
					);
				} else {
					const hasSavedFiles = (statusInfo?.scm?.savedFiles?.length || 0) > 0;
					const hasStagedFiles = (statusInfo?.scm?.stagedFiles?.length || 0) > 0;
					const excludeCommit: { [sha: string]: boolean } = {};
					if (!hasStagedFiles && !hasSavedFiles) {
						statusInfo.scm.commits?.forEach((commit, index) => {
							excludeCommit[commit.sha] = index > 0;
						});

						this.setState(
							{
								topSelectionIndex: 0,
								bottomSelectionIndex: 0,
								startCommit: statusInfo.scm.startCommit,
								excludeCommit,
							},
							() => this.handleRepoChange()
						);
					} else if (!hasStagedFiles && this.state.bottomSelectionIndex === -1) {
						statusInfo.scm.commits?.forEach(commit => {
							excludeCommit[commit.sha] = true;
						});
						this.setState({
							bottomSelectionIndex: -2,
							startCommit: statusInfo.scm.startCommit,
							excludeCommit,
						});
					} else if (!hasSavedFiles && this.state.topSelectionIndex === -2) {
						statusInfo.scm.commits?.forEach(commit => {
							excludeCommit[commit.sha] = true;
						});
						this.setState({
							topSelectionIndex: -1,
							startCommit: statusInfo.scm.startCommit,
							excludeCommit,
						});
					} else if (startCommitIndex === 0) {
						statusInfo.scm.commits?.forEach((commit, index) => {
							excludeCommit[commit.sha] = true;
						});
						this.setState({
							startCommit: statusInfo.scm.startCommit,
							excludeCommit,
						});
					}
				}

				if (
					includeLatestCommit &&
					statusInfo.scm.commits &&
					statusInfo.scm.commits.length > 1 &&
					statusInfo.scm.commits[0].info
				) {
					const splittedMessage = statusInfo.scm.commits[0].info.message.split(/(?<=^.+)\n/);
					this.setState({ title: splittedMessage[0] ? splittedMessage[0] : "" });
					this.setState({ text: splittedMessage[1] ? splittedMessage[1].trim() : "" });
					// only show this 1 commit
					limitedLength = 1;
				}

				if (statusInfo.scm.commits) {
					const commitListLength = statusInfo.scm.commits.findIndex(
						// @ts-ignore
						commit => commit.info.email !== currentUser.email
					);
					if (commitListLength) {
						// show only commits from the user logged in (limited to 10)
						this.setState({ commitListLength: Math.min(commitListLength, limitedLength || 10) });
					} else {
						// show last 10 commits from any author, since none of them are from the user logged in
						this.setState({ commitListLength: Math.min(10, statusInfo.scm.commits.length) });
					}
				}
			}

			if (isAmending && startCommit) {
				this.setState({
					bottomSelectionIndex: (statusInfo?.scm?.commits?.length || 0) - 1,
				});
			}

			if (statusInfo.scm) {
				const authorsBlameData = {};
				statusInfo.scm.authors
					.filter(_ => !_.email.match(/noreply/))
					.map(author => {
						const mappedId = blameMap[author.email.replace(/\./g, "*")];
						const mappedPerson = mappedId && this.props.teamMembers.find(t => t.id === mappedId);
						if (mappedPerson) {
							authorsBlameData[mappedPerson.email] = author;
						} else {
							authorsBlameData[author.email] = author;
						}
					});
				this.setState({ authorsBlameData });

				if (!isEditing && !this.state.reviewersTouched) {
					let reviewerEmails = Object.keys(authorsBlameData)
						// if email isn't supported, and we can't find the teammate, filter it out
						// because we can't email based on the blame data
						.filter(email => inviteUsersOnTheFly || teamMates.find(t => t.email === email))
						// remove yourself
						.filter(email => email !== currentUser.email)
						// remove members we've explicitly removed from the team
						.filter(
							email =>
								!authorsBlameData[email].id ||
								this.props.activeMemberIds.includes(authorsBlameData[email].id)
						)
						// get the top most impacted authors based on how many times their code
						// was stomped on, and make those the suggested reviewers, depending
						// on the team setting. we weigh 1 commits on the branch 10x as much as
						// 1 line of codes stomped on
						.sort(
							(a, b) =>
								authorsBlameData[b].commits * 10 +
								authorsBlameData[b].stomped -
								(authorsBlameData[a].commits * 10 + authorsBlameData[a].stomped)
						)
						.filter(Boolean);
					switch (this.props.reviewAssignment) {
						case CSReviewAssignmentSetting.Authorship1:
							reviewerEmails = reviewerEmails.slice(0, 1);
							break;
						case CSReviewAssignmentSetting.Authorship2:
							reviewerEmails = reviewerEmails.slice(0, 2);
							break;
						case CSReviewAssignmentSetting.Authorship3:
							reviewerEmails = reviewerEmails.slice(0, 3);
							break;
						case CSReviewAssignmentSetting.Random: {
							// the pseudo-random number is based on the time
							// this review form was mounted, and selects a random
							// teammate from the array
							const pseudoRandom = this.state.mountedTimestamp % teamMates.length;
							reviewerEmails = [teamMates[pseudoRandom].email];
							break;
						}
						case CSReviewAssignmentSetting.RoundRobin:
							const index = this.props.teamReviewCount % teamMates.length;
							reviewerEmails = [teamMates[index].email];
							break;
						default:
							reviewerEmails = [];
					}

					this.setState({ reviewerEmails });
				}

				const { excludedFiles } = this.state;
				// default any files which are `new` to be excluded from the review
				// but only those which haven't been explicitly set to true or false
				statusInfo.scm.modifiedFiles.forEach(f => {
					if (f.status === FileStatus.untracked && excludedFiles[f.file] === undefined)
						this.setState(state => ({ excludedFiles: { ...state.excludedFiles, [f.file]: true } }));
				});

				const response = await HostApi.instance.send(IgnoreFilesRequestType, {
					repoPath: statusInfo.scm.repoPath,
				});
				if (response && response.paths) {
					this.ignoredFiles = ignore(); // make a new one
					this.ignoredFiles.add(response.paths); // add the rules
				}
			} else {
				this.setState({ isLoadingScm: false, isReloadingScm: false, scmError: true });
				return;
			}
			this.setState({
				isLoadingScm: false,
				isReloadingScm: false,
				scmError: false,
				scmErrorMessage: "",
			});
		} catch (e) {
			logError(e);
		} finally {
			if (callback) callback();
		}
	}

	setTitleBasedOnBranch = () => {
		const { repoStatus } = this.state;
		if (repoStatus && repoStatus.scm && repoStatus.scm.branch) {
			const branch = repoStatus.scm.branch;
			this.setTitle(
				branch.charAt(0).toUpperCase() +
					branch
						.slice(1)
						.replace("-", " ")
						.replace(/^(\w+)\//, "$1: ")
			);
		}
	};

	async addIgnoreFile(filename: string) {
		const { scm } = this.state.scmInfo;
		if (!scm) return;
		const { repoPath } = scm;

		return await HostApi.instance.send(AddIgnoreFilesRequestType, { repoPath, path: filename });
	}

	focus = () => {
		this._titleInput && this._titleInput.focus();
	};

	toggleNotify = () => {
		this.setState({ notify: !this.state.notify });
	};

	getAssignableCSUsers() {
		return mapFilter(this.props.teamMembers, user => {
			if (!user.isRegistered) return;
			return {
				value: user.id,
				label: user.username,
			};
		});
	}

	handleClickSubmit = async (event?: React.SyntheticEvent) => {
		event && event.preventDefault();
		if (this.state.isLoading) return;
		if (this.state.isLoadingScm) return;
		if (this.isFormInvalid()) return;
		this.setState({ isLoading: true });

		const {
			title,
			text,
			replyText,
			selectedTags,
			repoStatus,
			startCommit,
			topSelectionIndex,
			excludeCommit,
			excludedFiles,
			allReviewersMustApprove,
			includeSaved,
			includeStaged,
			reviewerEmails,
			attachments,
		} = this.state;

		// FIXME first, process the email-only reviewers

		const addedUsers: string[] = [];
		const reviewerIds: string[] = [];
		reviewerEmails.forEach(email => {
			const person = this.props.teamMembers.find(p => p.email === email);
			if (person) reviewerIds.push(person.id);
			else addedUsers.push(email);
		});

		try {
			const { editingReview } = this.props;
			if (this.props.isEditing && this.props.editReview && editingReview) {
				const originalReviewers = editingReview.reviewers;
				const attributes: EditableAttributes = {
					title: title,
					text: replaceHtml(text || "")!,
					sharedTo: this.props.existingSharedTo,
					allReviewersMustApprove,
				};
				let repoChanges;
				// @ts-ignore
				const reviewerOperations = arrayDiff(originalReviewers, reviewerIds);
				if (reviewerOperations) {
					if (reviewerOperations.added && reviewerOperations.added.length) {
						attributes.$push = attributes.$push || {};
						attributes.$push.reviewers = reviewerOperations.added;
					}
					if (reviewerOperations.removed && reviewerOperations.removed.length) {
						attributes.$pull = attributes.$pull || {};
						attributes.$pull.reviewers = reviewerOperations.removed;
					}
				}
				const tagOperations = arrayDiff(editingReview.tags, keyFilter(selectedTags));
				if (tagOperations) {
					if (tagOperations.added && tagOperations.added.length) {
						attributes.$push = attributes.$push || {};
						attributes.$push.tags = tagOperations.added;
					}
					if (tagOperations.removed && tagOperations.removed.length) {
						attributes.$pull = attributes.$pull || {};
						attributes.$pull.tags = tagOperations.removed;
					}
				}

				//TODO de-dupe this
				// get the max checkpoint of the review, and add one
				const checkpoint =
					Math.max.apply(
						Math,
						editingReview.reviewChangesets.map(_ => (_.checkpoint === undefined ? 0 : _.checkpoint))
					) + 1;

				if (this.props.isAmending && repoStatus) {
					// if we're amending, don't edit the text of the review,
					// but pass in an arg so that a reply can be created
					delete attributes.text;
					const { scm } = repoStatus;
					repoChanges = [
						{
							repoId: scm!.repoId,
							scm,
							startCommit,
							endCommit:
								topSelectionIndex > 0 ? this.getRowIdentifier(topSelectionIndex) : undefined,
							excludeCommit,
							excludedFiles: keyFilter(excludedFiles),
							// new files will originally have excludedFiles[file] = true
							// and when they get added to the review they will be
							// excludedFiles[file] = false
							// therefore we can use the keys whose values are false
							// as the list of files that have been added
							newFiles: keyFilterFalsey(excludedFiles),
							includeSaved: includeSaved && scm!.savedFiles.length > 0,
							includeStaged: includeStaged && scm!.stagedFiles.length > 0,
							checkpoint,
						},
					];
					attributes.repoChanges = repoChanges;
				}

				const editResult = await this.props.editReview(
					editingReview.id,
					attributes,
					this.props.isAmending ? replaceHtml(replyText) || undefined : undefined
				);
				if (editResult && editResult.review) {
					keyFilter(this.state.addressesIssues as any).forEach(id => {
						this.props.setCodemarkStatus(id, "closed", `in update #${checkpoint}`);
					});

					if (this.props.onClose) {
						this.props.onClose();
					}
				}
			} else if (this.props.createPostAndReview && repoStatus) {
				const { scm } = repoStatus;
				const authorsById = {};
				reviewerEmails.forEach(email => {
					const person = this.props.teamMembers.find(t => t.email === email);
					if (person) authorsById[person.id] = this.state.authorsBlameData[person.email];
				});
				let review = {
					title,
					sharingAttributes: this.props.shouldShare ? this._sharingAttributes : undefined,
					text: replaceHtml(text)!,
					reviewers: reviewerIds,
					addedUsers,
					allReviewersMustApprove: allReviewersMustApprove || this.props.reviewApproval === "all",
					authorsById,
					tags: keyFilter(selectedTags),
					status: "open",
					repoChanges: [
						{
							scm,
							startCommit,
							endCommit:
								topSelectionIndex > 0 ? this.getRowIdentifier(topSelectionIndex) : undefined,
							excludeCommit,
							excludedFiles: keyFilter(excludedFiles),
							// new files will originally have excludedFiles[file] = true
							// and when they get added to the review they will be
							// excludedFiles[file] = false
							// therefore we can use the keys whose values are false
							// as the list of files that have been added
							newFiles: keyFilterFalsey(excludedFiles),
							includeSaved: includeSaved && scm!.savedFiles.length > 0,
							includeStaged: includeStaged && scm!.stagedFiles.length > 0,
							checkpoint: 0,
						},
					],
					files: attachments,
				} as any;

				const { type: createResult } = await this.props.createPostAndReview(
					review,
					this.props.newPostEntryPoint || "Global Nav"
				);
				if (createResult !== PostsActionsType.FailPendingPost) {
					// commented out as per https://trello.com/c/LR3KD2Lj/4320-posting-comment-in-a-review-or-a-pr-leads-to-misleading-confirmation-message
					if (true || this.props.skipPostCreationModal) {
						this.props.closePanel();
					} else {
						confirmPopup({
							title: "Review Submitted",
							closeOnClickA: true,
							message: (
								<div>
									You can see the review in your{" "}
									<a onClick={() => this.props.openPanel(WebviewPanels.Activity)}>activity feed</a>.
									<br />
									<br />
									<div
										style={{
											textAlign: "left",
											fontSize: "12px",
											display: "inline-block",
											margin: "0 auto",
										}}
									>
										<Checkbox
											name="skipPostCreationModal"
											onChange={() => {
												this.props.setUserPreference({
													prefPath: ["skipPostCreationModal"],
													value: !this.props.skipPostCreationModal,
												});
											}}
										>
											Don't show this again
										</Checkbox>
									</div>
								</div>
							),
							centered: true,
							buttons: [
								{
									label: "OK",
									action: () => this.props.closePanel(),
								},
							],
						});
					}
				}
			}
		} catch (error) {
			logError(error, {
				isEditing: this.props.isEditing,
			});
			this.setState({ reviewCreationError: error.message, isLoading: false });
		} finally {
			this.setState({ isLoading: false });
			this.props.setNewPostEntry(undefined);
		}
	};

	setAttachments = (attachments: AttachmentField[]) => this.setState({ attachments });

	isFormInvalid = () => {
		const { text, title, repoStatus } = this.state;
		const { isEditing } = this.props;

		const validationState: Partial<State> = {
			titleInvalid: false,
			textInvalid: false,
			reviewersInvalid: false,
			sharingAttributesInvalid: false,
			changesInvalid: false,
		};

		let invalid = false;
		if (title.length === 0) {
			validationState.titleInvalid = true;
			invalid = true;
		}

		if (!isEditing && !this.hasChanges()) {
			validationState.changesInvalid = true;
			invalid = true;
		}

		if (!this.props.isEditing && this.props.shouldShare && !this._sharingAttributes) {
			invalid = true;
			validationState.sharingAttributesInvalid = true;
		}

		this.setState(validationState as State);
		return invalid;
	};

	hasChanges = () => {
		const { repoStatus } = this.state;
		return (
			repoStatus &&
			repoStatus.scm &&
			repoStatus.scm.modifiedFiles.filter(f => !this.excluded(f.file)).length
		);
	};

	renderTitleHelp = () => {
		const { titleInvalid } = this.state;

		if (titleInvalid) return <small className="error-message">Required</small>;
		else return null;
	};

	renderTextHelp = () => {
		const { textInvalid } = this.state;

		if (textInvalid) return <small className="error-message">Required</small>;
		else return null;
	};

	renderSharingHelp = () => {
		const { sharingAttributesInvalid } = this.state;

		if (sharingAttributesInvalid) {
			return <small className="error-message">Select channel, or deselect sharing</small>;
		} else return null;
	};

	switchChannel = (event: React.SyntheticEvent) => {
		if (this.props.isEditing) return;

		event.stopPropagation();
		if (!this.state.channelMenuOpen) {
			const target = event.target;
			this.setState(state => ({
				channelMenuOpen: !state.channelMenuOpen,
				channelMenuTarget: target,
				crossPostMessage: true,
			}));
		}
	};

	selectChannel = (stream: CSStream | "show-all") => {
		if (stream === "show-all") {
			this.setState({ showAllChannels: true });
			return;
		} else if (stream && stream.id) {
			const channelName = (stream.type === StreamType.Direct ? "@" : "#") + (stream as any).name;
			this.setState({ selectedChannelName: channelName, selectedChannelId: stream.id });
		}
		this.setState({ channelMenuOpen: false });
		this.focus();
	};

	switchLabel = (event: React.SyntheticEvent) => {
		event.stopPropagation();
		const target = event.target;
		this.setState(state => ({
			labelMenuOpen: !state.labelMenuOpen,
			labelMenuTarget: target,
		}));
	};

	renderTags = () => {
		const { selectedTags } = this.state;
		const keys = Object.keys(selectedTags);
		if (keys.length === 0) return null;

		return (
			<div className="related">
				<div className="related-label">Tags</div>
				<div style={{ marginBottom: "-5px" }}>
					{this.props.teamTagsArray.map(tag => {
						return selectedTags[tag.id] ? <Tag tag={tag} /> : null;
					})}
					<div style={{ clear: "both" }} />
				</div>
			</div>
		);
	};

	renderSharingControls = () => {
		if (this.props.isEditing) return null;

		const repoId =
			this.state.repoStatus && this.state.repoStatus.scm ? this.state.repoStatus.scm.repoId : "";
		return (
			<div className="checkbox-row" style={{ float: "left" }}>
				{this.renderSharingHelp()}
				<SharingControls
					showToggle
					onChangeValues={values => {
						this._sharingAttributes = values;
					}}
					repoId={repoId}
				/>
			</div>
		);
	};

	handleChange = text => {
		this.setState({ text, textTouched: true });
	};

	handleChangeReply = replyText => {
		this.setState({ replyText });
	};

	handleToggleTag = tagId => {
		if (!tagId) return;
		let selectedTags = this.state.selectedTags;
		selectedTags[tagId] = !selectedTags[tagId];
		this.setState({ selectedTags });
	};

	renderAddressesIssues = () => {
		// find the open issues
		const openIssues = (this.props.changeRequests || []).filter(
			codemark => codemark.status !== CodemarkStatus.Closed
		);
		// if there are none open, this update can't address anything!
		if (openIssues.length == 0) return null;

		return (
			<div className="related">
				<div className="related-label">This Update Addresses Change Request</div>
				<MetaDescriptionForAssignees>
					{openIssues.map(codemark => {
						if (codemark.status === CodemarkStatus.Closed) return null;
						const text = codemark.title || codemark.text;
						const formattedText = text.length > 80 ? `${text.substring(0, 77)}...` : text;

						return (
							<MetaCheckboxWithHoverIcon key={codemark.id}>
								<Checkbox
									noMargin
									name={`addresses-${codemark.id}`}
									checked={this.state.addressesIssues[codemark.id]}
									onChange={value => {
										this.setState({
											addressesIssues: { ...this.state.addressesIssues, [codemark.id]: value },
										});
									}}
								>
									<MarkdownText text={formattedText} />
								</Checkbox>
							</MetaCheckboxWithHoverIcon>
						);
					})}
				</MetaDescriptionForAssignees>
			</div>
		);
	};

	renderMessageInput = () => {
		const { text, replyText } = this.state;
		const { isAmending } = this.props;

		const __onDidRender = ({ insertTextAtCursor, focus }) => {
			this.insertTextAtCursor = insertTextAtCursor;
			this.focusOnMessageInput = focus;
		};

		const placeholder = isAmending ? "Describe Changes (optional)" : "Description (Optional)";
		const onChange = isAmending ? this.handleChangeReply : this.handleChange;
		return (
			<MessageInput
				teamProvider={"codestream"}
				isDirectMessage={this.props.channel.type === StreamType.Direct}
				text={isAmending ? replyText : text}
				placeholder={placeholder}
				multiCompose
				withTags={!isAmending}
				onChange={onChange}
				toggleTag={this.handleToggleTag}
				shouldShowRelatableCodemark={codemark =>
					this.props.editingReview ? codemark.id !== this.props.editingReview.id : true
				}
				onSubmit={this.handleClickSubmit}
				selectedTags={this.state.selectedTags}
				__onDidRender={__onDidRender}
				autoFocus={isAmending ? true : false}
				attachments={this.state.attachments}
				attachmentContainerType="review"
				setAttachments={this.setAttachments}
			/>
		);
	};

	addBlameMap = async (author: string, assigneeId: string) => {
		await HostApi.instance.send(UpdateTeamSettingsRequestType, {
			teamId: this.props.teamId,
			// we need to replace . with * to allow for the creation of deeply-nested
			// team settings, since that's how they're stored in mongo
			settings: { blameMap: { [author.replace(/\./g, "*")]: assigneeId } },
		});
		// FIXME
		setTimeout(() => this.handleRepoChange(), 2000);
	};

	render() {
		const { repoStatus } = this.state;
		const totalModifiedLines = repoStatus && repoStatus.scm ? repoStatus.scm.totalModifiedLines : 0;
		const { currentUser, isAmending, blameMap = {} } = this.props;

		return (
			<FeatureFlag flag="lightningCodeReviews">
				{isOn => {
					if (!isOn) {
						return (
							<Modal verticallyCenter={true} onClose={() => this.props.closePanel()}>
								<p>
									This functionality is currently only available for VS Code and JetBrains.
									<br />
									<br />
									Contact <a href="mailto:sales@codestream.com">sales@codestream.com</a> to schedule
									a demo.
								</p>
							</Modal>
						);
					}

					return (
						<div
							className={cx({ "full-height-codemark-form": !isAmending })}
							ref={ref => (this._formDiv = ref)}
						>
							{!isAmending && <CancelButton onClick={this.confirmCancel} />}
							<div className={cx({ "review-container": !isAmending })}>
								{this.state.showCreateReviewOnCommitToggle && (
									<div style={{ margin: "-30px 30px 10px 0", display: "flex" }}>
										<span className="subhead muted">Auto-prompt for feedback when committing </span>
										<span
											key="toggle-review-create-on-commit"
											className="headline-flex"
											style={{ display: "inline-block", marginLeft: "10px" }}
										>
											<LabeledSwitch
												key="review-create-on-commit-toggle"
												on={this.props.createReviewOnCommit}
												offLabel="No"
												onLabel="Yes"
												onChange={this.toggleCreateReviewOnCommitEnabled}
												height={20}
												width={60}
											/>
										</span>
									</div>
								)}
								<div style={{ height: "5px" }}></div>

								<div className="codemark-form-container">{this.renderReviewForm()}</div>
								{this.renderExcludedFiles()}
								<div style={{ height: "5px" }}></div>
								{!this.props.isEditing && this.state.reviewerEmails.length > 0 && (
									<>
										<div style={{ height: "10px" }}></div>
										<CSText muted>
											<SmartFormattedList value={this.state.reviewerEmails} /> will be notified via
											email
										</CSText>
									</>
								)}

								{!this.props.isEditing && totalModifiedLines > 200 && (
									<div style={{ display: "flex", padding: "10px 0 0 2px" }}>
										<Icon name="alert" muted />
										<span style={{ paddingLeft: "10px" }}>
											<CSText as="span" muted>
												There are {totalModifiedLines.toLocaleString()} total modified lines in this
												review, which is a lot to digest. Increase your development velocity with{" "}
												<a href="https://www.codestream.com/blog/reviewing-the-code-review-part-i">
													shift left code reviews
												</a>
												.
											</CSText>
										</span>
									</div>
								)}
								{!this.props.isEditing && (
									<>
										<div style={{ height: "10px" }}></div>
										<CSText muted>
											CodeStream's lightweight code reviews let you request a review on the current
											state of your repo, without the friction of save, branch, commit, push, create
											PR, email, pull, web, email, web. Comments on your review are saved with the
											code even once merged in.
										</CSText>
									</>
								)}
							</div>
						</div>
					);
				}}
			</FeatureFlag>
		);
	}

	confirmCancel = (callbackOrEventArgs?: Function | Object) => {
		const { titleTouched, textTouched, reviewersTouched } = this.state;

		const finish = () => {
			const isEditing = this.props.isEditing;
			this.props.onClose && this.props.onClose();
			if (!isEditing) {
				this.props.closePanel();
				if (typeof callbackOrEventArgs === "function") callbackOrEventArgs();
			}
		};

		// if the user has made any changes in the form, confirm before closing
		if (titleTouched || textTouched || reviewersTouched) {
			confirmPopup({
				title: "Are you sure?",
				message: "Changes will not be saved.",
				centered: true,
				buttons: [
					{ label: "Go Back", className: "control-button" },
					{
						label: this.props.isEditing ? "Discard Edits" : "Discard Review",
						wait: true,
						action: () => finish(),
						className: "delete",
					},
				],
			});
		} else {
			finish();
		}
	};

	exclude = (event: React.SyntheticEvent, file: string) => {
		const { excludedFiles } = this.state;
		event.stopPropagation();
		this.setState({ excludedFiles: { ...excludedFiles, [file]: !excludedFiles[file] } });
	};

	excluded = (file: string) => this.state.excludedFiles[file] || this.ignoredFiles.ignores(file);

	excludeFuture = async (event: React.SyntheticEvent, file: string) => {
		const { repoStatus } = this.state;
		if (!repoStatus) return null;
		const { scm } = repoStatus;
		if (!scm) return null;

		event.stopPropagation();

		const ignoreFile = scm.repoPath + "/.codestreamignore";
		const success = await this.addIgnoreFile(file);
		if (success) {
			this.ignoredFiles.add(file);
			this.setState({ excludedFiles: { ...this.state.excludedFiles, [file]: true } });
			confirmPopup({
				title: "Exclude Files",
				message: (
					<div style={{ wordBreak: "break-word", fontSize: "12px" }}>
						<span className="monospace highlight bold">{file}</span>{" "}
						<span className="subtle">has been added to the CodeStream ignore file </span>
						<span className="monospace highlight bold">{ignoreFile}</span>
					</div>
				),
				centered: true,
				buttons: [
					{ label: "OK", className: "control-button" },
					{
						label: "Open Ignore File",
						className: "cancel",
						action: () => {
							HostApi.instance.send(EditorRevealRangeRequestType, {
								uri: "file://" + ignoreFile,
								range: Range.create(0, 0, 0, 0),
								atTop: true,
								preserveFocus: true,
							});
						},
					},
				],
			});
		} else {
			confirmPopup({
				title: "Ooops",
				message: (
					<>
						<span className="subtle">There was a problem adding </span>
						<span className="monospace highlight bold">{file}</span>{" "}
						<span className="subtle"> to the CodeStream ignore file </span>
						<span className="monospace highlight bold">{ignoreFile}</span>
					</>
				),
			});
		}
		return null;
	};

	changeScmState = settings => {
		this.setState({ ...settings }, () => this.handleRepoChange());
	};

	handleClickChangeSelectionRange = (event: React.SyntheticEvent, identifier: string) => {
		const target = event.target as HTMLElement;
		if (target.tagName === "A") return;
		this.changeSelectionRange(identifier, () => this.handleRepoChange());
	};

	changeSelectionRange = (identifier: string, callback?) => {
		if (!this.state.repoStatus) return;
		const { scm } = this.state.repoStatus;

		if (!scm) return;
		const { commits } = scm;
		if (!commits) return;

		const { isAmending } = this.props;
		const { topSelectionIndex, bottomSelectionIndex } = this.state;
		const hasStagedFiles = scm.stagedFiles.length > 0;
		let newTopSelectionIndex, newBottomSelectionIndex;
		const index = this.getRowIndex(identifier);
		if (index == null) return;

		if (isAmending) {
			if (index === topSelectionIndex && index < commits.length - 1) {
				// deselecting top of selection, unless it's the last bottom row
				newTopSelectionIndex = index + 1;
				if (!hasStagedFiles && newTopSelectionIndex === -1) {
					// deselected "saved", and there is no "staged"
					newTopSelectionIndex = 0;
				}
			} else {
				newTopSelectionIndex = index;
			}
			newBottomSelectionIndex = bottomSelectionIndex;
		} else {
			if (index < topSelectionIndex) {
				// expanding selection up
				newTopSelectionIndex = index;
				newBottomSelectionIndex = bottomSelectionIndex;
			} else if (index > bottomSelectionIndex) {
				// expanding selection down
				newTopSelectionIndex = topSelectionIndex;
				newBottomSelectionIndex = index;
			} else if (index === topSelectionIndex && index < bottomSelectionIndex) {
				// deselecting top row, if more than one row is selected
				newTopSelectionIndex = topSelectionIndex + 1;
				if (!hasStagedFiles && newTopSelectionIndex === -1) {
					// deselected "saved", and there is no "staged"
					newTopSelectionIndex = 0;
				}
				newBottomSelectionIndex = bottomSelectionIndex;
			} else if (index === bottomSelectionIndex && index > topSelectionIndex) {
				// deselecting bottom row, if more than one row is selected
				newTopSelectionIndex = topSelectionIndex;
				newBottomSelectionIndex = bottomSelectionIndex - 1;
				if (!hasStagedFiles && newBottomSelectionIndex === -1) {
					// deselected top commit, and there is no "staged"
					newBottomSelectionIndex = -2;
				}
			} else {
				// within the current selection
				newTopSelectionIndex = index;
				newBottomSelectionIndex = index;
			}
		}

		const excludeCommit: { [sha: string]: boolean } = {};
		commits.forEach((commit, index) => {
			if (index < newTopSelectionIndex) {
				excludeCommit[commit.sha] = true;
			} else if (index === newTopSelectionIndex) {
				excludeCommit[commit.sha] = false;
			} else if (newBottomSelectionIndex != null && index <= newBottomSelectionIndex) {
				excludeCommit[commit.sha] = false;
			} else {
				excludeCommit[commit.sha] = true;
			}
		});

		let startCommitIndex = 0;
		if (newBottomSelectionIndex >= 0) {
			startCommitIndex = newBottomSelectionIndex + 1;
		} else if (newTopSelectionIndex >= 0) {
			startCommitIndex = newTopSelectionIndex + 1;
		}

		let startCommit;
		if (commits[startCommitIndex]) {
			startCommit = commits[startCommitIndex].sha;
		} else {
			startCommit = commits[startCommitIndex - 1].sha + "^";
		}

		this.setState(
			{
				includeSaved: newTopSelectionIndex <= -2,
				includeStaged: newTopSelectionIndex <= -1,
				topSelectionIndex: newTopSelectionIndex,
				bottomSelectionIndex: newBottomSelectionIndex,
				startCommit,
				excludeCommit,
			},
			callback
		);
	};

	getRowIdentifier(index: number) {
		if (index === -2) {
			return "saved";
		} else if (index === -1) {
			return "staged";
		} else {
			const { repoStatus } = this.state;
			const commits = repoStatus?.scm?.commits;
			if (commits == null) return;
			return commits[index]?.sha;
		}
	}

	getRowIndex(identifier: string) {
		if (identifier === "saved") {
			return -2;
		} else if (identifier === "staged") {
			return -1;
		} else {
			const { repoStatus } = this.state;
			const commits = repoStatus?.scm?.commits;
			if (commits == null) return;
			const index = commits.findIndex(c => c.sha === identifier);
			if (index < 0) return;
			return index;
		}
	}

	highlightFromSelectionEdgeTo(index?: number) {
		const { topSelectionIndex, bottomSelectionIndex, repoStatus } = this.state;
		const topIndex = Math.min(
			topSelectionIndex,
			bottomSelectionIndex,
			index != null ? index : Number.MAX_SAFE_INTEGER
		);
		const bottomIndex = Math.max(
			topSelectionIndex,
			bottomSelectionIndex,
			index != null ? index : Number.MIN_SAFE_INTEGER
		);
		const commits = repoStatus?.scm?.commits;
		if (commits == null) return;

		let topSelectionId = this.getRowIdentifier(topIndex);
		if (topSelectionId == null) return;
		topSelectionId = "row-" + topSelectionId;

		let bottomSelectionId = this.getRowIdentifier(bottomIndex);
		if (bottomSelectionId == null) return;
		bottomSelectionId = "row-" + bottomSelectionId;

		const $rows = document.getElementsByClassName("row-with-icon-actions");
		let foundTop = false;
		let foundBottom = false;

		for (let i = 0; i < $rows.length; i++) {
			const row = $rows[i];
			if (!row.id.startsWith("row-")) continue; // skip rows representing files
			const isTop = row.id === topSelectionId;
			const isBottom = row.id === bottomSelectionId;
			if (isTop) foundTop = true;
			if (isBottom) foundBottom = true;

			const inRange = isTop || isBottom || foundTop != foundBottom;
			if (row.classList.contains("muted")) {
				if (inRange) row.classList.add("litup");
				else row.classList.remove("litup");
			} else {
				if (!inRange) row.classList.add("dimmed");
				else row.classList.remove("dimmed");
			}
		}
	}

	renderChange(
		id: string, // either the commit sha or the strings "saved" and "staged"
		index: number,
		onOff: boolean,
		headshot: ReactElement,
		title: string,
		message: string | ReactElement,
		onClick,
		tooltip?: string | ReactElement
	) {
		return (
			<Tooltip
				key={id}
				title={tooltip || ""}
				placement="top"
				delay={1}
				trigger={["hover"]}
				align={{ offset: [0, 5] }}
			>
				<div
					id={"row-" + id}
					className={`row-with-icon-actions ${onOff ? "" : "muted"}`}
					style={{ display: "flex", alignItems: "center" }}
					onClick={onClick}
					onMouseEnter={() => {
						this.highlightFromSelectionEdgeTo(index);
					}}
					onMouseLeave={() => {
						this.highlightFromSelectionEdgeTo();
					}}
				>
					<input
						type="checkbox"
						checked={onOff}
						readOnly
						style={{ flexShrink: 0, pointerEvents: "none" }}
					/>
					<label className="ellipsis-right-container no-margin" style={{ cursor: "pointer" }}>
						{/* headshot */}
						<span
							dangerouslySetInnerHTML={{
								__html: markdownify(title, { excludeOnlyEmoji: true, inline: true }),
							}}
						/>
					</label>
					<span
						key="message"
						className="message"
						style={{ textAlign: "right", flexGrow: 10, whiteSpace: "nowrap" }}
					>
						{message}
					</span>
					<span />
				</div>
			</Tooltip>
		);
	}

	// pluralize the label: "2 files" vs. "1 file"
	// and provide a tooltip listing the files
	fileListLabel = (files: string[]) => {
		const fileLabel = files.length === 1 ? "file" : "files";
		return `${files.length} ${fileLabel}`;
	};

	fileListTip = (files: string[]) => {
		return (
			<>
				{files.map(file => (
					<div key={file}>{file}</div>
				))}
			</>
		);
	};

	authorHeadshot = commit => {
		const { teamMembers } = this.props;
		const author = teamMembers.find(p => p.email === commit.info.email);
		if (author) return <Headshot person={author} size={20} display="inline-block" />;
		else return <></>;
	};

	renderGroupsAndCommits() {
		const { repoStatus, includeSaved, includeStaged, excludeCommit, commitListLength } = this.state;
		if (!repoStatus) return null;
		const { scm } = repoStatus;
		if (!scm) return null;
		const { commits = [] } = scm;

		const { unsavedFiles, isAmending } = this.props;
		let unsavedFilesInThisRepo: string[] = [];

		if (scm.repoPath) {
			for (let path of unsavedFiles) {
				const uri = URI.parse(path);
				const uriPath = uri.path;
				const index = uriPath.indexOf(scm.repoPath);
				if (index === 0 || index === 1) {
					// windows leads with a / before the drive letter
					unsavedFilesInThisRepo.push(uriPath);
				}
			}
		}

		const numSavedFiles = scm.savedFiles.length;
		const numStagedFiles = scm.stagedFiles.length;

		const commitList = commits.slice(0, commitListLength);
		const howManyMore = commits.length - commitList.length;

		const localCommits = commitList.filter(commit => commit.localOnly);
		const remoteCommits = commitList.filter(commit => !commit.localOnly);

		return (
			<div className="related">
				{(numSavedFiles > 0 || numStagedFiles > 0) && (
					<div className="related-label">
						Changes to {isAmending ? "Add To" : "Include In"} Review
					</div>
				)}
				{unsavedFilesInThisRepo.length > 0 && (
					<div style={{ display: "flex", padding: "0 0 2px 2px" }}>
						<Icon name="alert" muted />
						<span style={{ paddingLeft: "5px" }}>
							You have unsaved changes. If you want to include any of those changes in this review,
							save them first.
						</span>
					</div>
				)}
				{numSavedFiles > 0 &&
					this.renderChange(
						"saved",
						-2,
						includeSaved,
						<Headshot person={this.props.currentUser} size={20} display="inline-block" />,
						"Saved Changes (Working Tree)",
						this.fileListLabel(scm.savedFiles),
						e => this.handleClickChangeSelectionRange(e, "saved"),
						this.fileListTip(scm.savedFiles)
					)}
				{numStagedFiles > 0 &&
					this.renderChange(
						"staged",
						-1,
						includeStaged,
						<Headshot person={this.props.currentUser} size={20} display="inline-block" />,
						"Staged Changes (Index)",
						this.fileListLabel(scm.stagedFiles),
						e => this.handleClickChangeSelectionRange(e, "staged"),
						this.fileListTip(scm.stagedFiles)
					)}
				{localCommits.length > 0 && (
					<>
						<div className="related-label">
							<br />
							Local Commits
						</div>
						{this.renderCommitList(localCommits, excludeCommit)}
					</>
				)}
				{remoteCommits.length > 0 && (
					<>
						<div className="related-label">
							<br />
							{localCommits.length ? "Pushed " : ""}Commits
						</div>
						{this.renderCommitList(remoteCommits, excludeCommit)}
					</>
				)}
				{howManyMore > 0 && (
					<div
						style={{ marginTop: "5px", cursor: "pointer" }}
						onClick={e => this.setState({ commitListLength: this.state.commitListLength + 10 })}
					>
						Show Earlier Commits
					</div>
				)}
			</div>
		);
	}

	renderCommitList(commits, excludeCommit) {
		const { reviewsByCommit } = this.props;
		return commits.map((commit, index) =>
			this.renderChange(
				commit.sha,
				index,
				!excludeCommit[commit.sha],
				<></>,
				// @ts-ignore
				commit.info.shortMessage,
				<span className="monospace">{commit.sha.substr(0, 8)}</span>,
				e => this.handleClickChangeSelectionRange(e, commit.sha),
				<div style={{ maxWidth: "65vw" }}>
					{this.authorHeadshot(commit)}
					{commit.info && <b>{commit.info.author}</b>}
					{commit.info && commit.info.authorDate && (
						<Timestamp relative={true} time={new Date(commit.info.authorDate).getTime()} />
					)}
					<div style={{ paddingTop: "10px" }}>{commit.info.shortMessage}</div>
					{reviewsByCommit[commit.sha] && (
						<div style={{ paddingTop: "10px" }}>
							<div className="related-label">Included in Review</div>
							<div
								className="internal-link"
								onClick={() =>
									this.confirmCancel(() =>
										this.props.setCurrentReview(reviewsByCommit[commit.sha].id)
									)
								}
							>
								<Icon name="review" />
								{reviewsByCommit[commit.sha].title}
							</div>
						</div>
					)}
				</div>
			)
		);
	}

	showLocalDiff(path, oldPath) {
		const {
			repoStatus,
			includeSaved,
			includeStaged,
			excludedFiles,
			startCommit,
			topSelectionIndex,
		} = this.state;
		const { editingReview } = this.props;
		if (!repoStatus) return;
		const repoId = repoStatus.scm ? repoStatus.scm.repoId : "";
		if (!repoId) return;

		// if it's not excluded, but they key exists, that means the user manually added it to the review
		// and we need to pass that fact along to showlocaldiff
		const addedFileManually = path in excludedFiles;

		let endCommit;
		if (topSelectionIndex > 0) {
			// most recent commit is not selected
			endCommit = this.getRowIdentifier(topSelectionIndex);
		}

		HostApi.instance.send(ReviewShowLocalDiffRequestType, {
			path,
			oldPath,
			repoId,
			includeSaved: addedFileManually || (includeSaved && repoStatus.scm!.savedFiles.length > 0),
			includeStaged: includeStaged && repoStatus.scm!.stagedFiles.length > 0,
			editingReviewId: editingReview && editingReview.id,
			baseSha: startCommit || "",
			headSha: endCommit,
		});
		this.setState({
			currentFile: path,
		});
	}

	renderFile(fileObject, currentFile) {
		const { file, oldFile, linesAdded, linesRemoved, status } = fileObject;
		// https://davidwalsh.name/rtl-punctuation
		// ellipsis-left has direction: rtl so that the ellipsis
		// go on the left side, but without the <bdi> component
		// the punctuation would be messed up (such as filenames
		// beginning with a period)
		const excluded = this.excluded(file);
		let className = "row-with-icon-actions monospace ellipsis-left-container";
		if (file === currentFile) {
			className += " selected-simple";
		}
		if (excluded) {
			className += " excluded-file";
		}
		return (
			<div key={file} className={className} onClick={() => this.showLocalDiff(file, oldFile)}>
				<span className="file-info ellipsis-left">
					<bdi dir="ltr">{file}</bdi>
				</span>
				{linesAdded > 0 && <span className="added">+{linesAdded} </span>}
				{linesRemoved > 0 && <span className="deleted">-{linesRemoved}</span>}
				{status === FileStatus.untracked && <span className="added">new </span>}
				{status === FileStatus.added && <span className="added">added </span>}
				{status === FileStatus.copied && <span className="added">copied </span>}
				{status === FileStatus.unmerged && <span className="deleted">conflict </span>}
				{status === FileStatus.deleted && <span className="deleted">deleted </span>}
				{excluded ? (
					<span className="actions opaque">
						<Icon
							name="plus"
							title="Add to review"
							placement="bottom"
							className="clickable action"
							onClick={e => this.exclude(e, file)}
						/>
						<Icon
							name="trash"
							title="Exclude from future reviews"
							placement="bottom"
							className="clickable action"
							onClick={e => this.excludeFuture(e, file)}
						/>
					</span>
				) : (
					<span className="actions opaque">
						<Icon
							name="x"
							title="Exclude from review"
							className="clickable action"
							onClick={e => this.exclude(e, file)}
						/>
					</span>
				)}
			</div>
		);
	}

	nothingToReview() {
		return <div className="no-matches">No changes found or selected on this branch.</div>;
	}

	noScm() {
		return <div className="no-matches">No repo or changes found.</div>;
	}

	renderChangedFiles() {
		const { repoStatus, currentFile, isLoadingScm, isReloadingScm } = this.state;
		let scm;

		let changedFiles = <></>;
		if (repoStatus) {
			scm = repoStatus.scm;
			if (scm) {
				const { modifiedFiles } = scm;
				const modified = modifiedFiles.filter(f => !this.excluded(f.file));
				if (modified.length === 0) return this.nothingToReview();
				changedFiles = <>{modified.map(file => this.renderFile(file, currentFile))}</>;
			}
		}
		if (!scm) {
			return this.noScm();
		}

		return (
			<div className="related" style={{ padding: "0", marginBottom: 0, position: "relative" }}>
				<div className="related-label">
					Changed Files
					{this.props.isAmending && " - Since Last Update"}
					&nbsp;&nbsp;
					{isLoadingScm && <Icon style={{ margin: "-2px 0" }} className="spin" name="sync" />}
				</div>
				{changedFiles}
			</div>
		);
	}

	renderExcludedFiles() {
		const { repoStatus, excludedFiles, currentFile } = this.state;
		if (!repoStatus) return null;
		const { scm } = repoStatus;
		if (!scm) return null;
		const { modifiedFiles } = scm;
		const excluded = modifiedFiles.filter(
			f => excludedFiles[f.file] && !this.ignoredFiles.ignores(f.file)
		);
		if (excluded.length === 0) return null;

		return (
			<div className="related" style={{ padding: "0", marginBottom: 0, position: "relative" }}>
				<div className="related-label">Excluded from this Review</div>
				{excluded.map(file => this.renderFile(file, currentFile))}
			</div>
		);
	}

	setFrom = (commit: string) => {};

	toggleReviewer = person => this.toggleReviewerEmail(person.email);

	toggleReviewerEmail = email => {
		const { reviewerEmails } = this.state;

		if (reviewerEmails.includes(email)) {
			this.setState({ reviewerEmails: [...reviewerEmails.filter(e => e !== email)] });
		} else {
			this.setState({ reviewerEmails: [...reviewerEmails, email].filter(Boolean) });
		}

		this.setState({ reviewersTouched: true });
	};

	removeReviewer = email => {
		const { reviewerEmails } = this.state;
		this.setState({ reviewerEmails: [...reviewerEmails.filter(e => e !== email)] });

		this.setState({ reviewersTouched: true });
	};

	setRepo = repo => {
		this.setState({ isLoadingScm: true, scmError: false, scmErrorMessage: "" });
		this.getScmInfoForURI(repo.folder.uri);
	};

	handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === "Enter" && event.metaKey) {
			// command-enter should submit
			event.preventDefault();
			this.handleClickSubmit(event);
		}
	};

	setAllReviewersMustApprove = value => {
		this.setState({ allReviewersMustApprove: value });
	};

	renderMultiReviewSetting = () => {
		const { reviewApproval } = this.props;

		switch (reviewApproval) {
			case "user": {
				const dropdownItems = [
					{ label: "Anyone Can Approve", action: () => this.setAllReviewersMustApprove(false) },
					{ label: "Everyone Must Approve", action: () => this.setAllReviewersMustApprove(true) },
				];
				const { allReviewersMustApprove } = this.state;
				return (
					<span>
						&ndash;{" "}
						<DropdownButton variant="text" items={dropdownItems}>
							{allReviewersMustApprove ? "everyone must approve" : "anyone can approve"}
						</DropdownButton>
					</span>
				);
			}
			case "anyone":
				return <span>&ndash; anyone can approve</span>;
			case "all":
				return <span>&ndash; everyone must approve</span>;
			default:
				logError("Unknown reviewApproval value: " + reviewApproval);
				return null;
		}
	};

	renderPreviousCheckpoints = () => {
		const { editingReview } = this.props;
		if (!editingReview) return null;

		// console.warn("ER", editingReview);
		return editingReview.reviewChangesets.map((changeset, index) => {
			const { checkpoint = 0 } = changeset;
			return (
				<div style={{ margin: "10px 0 20px 0" }}>
					<Icon name="flag" />
					Checkpoint {1 + checkpoint}
					<div
						className="background-highlight"
						style={{
							padding: "10px",
							border: "1px solid var(--base-border-color)",
							marginTop: "3px",
						}}
					>
						<ChangesetFileList checkpoint={checkpoint} review={editingReview} noOnClick />
						<div style={{ height: "10px" }} />
						<Meta>
							<MetaLabel>Commits</MetaLabel>
							<MetaDescriptionForAssignees>
								<CommitList checkpoint={checkpoint} review={editingReview} />
							</MetaDescriptionForAssignees>
						</Meta>
					</div>
				</div>
			);
		});
	};

	makePerson(email: string) {
		const person = this.props.teamMembers.find(p => p.email === email);
		if (person) return person;
		return {
			email,
			username: email.replace(/@.*/, ""),
			isRegistered: false,
		};
	}

	setTitle(title: string) {
		this.setState({ title, titleTouched: true });
	}

	toggleCreateReviewOnCommitEnabled = (value: boolean) => {
		this.props.setUserPreference({ prefPath: ["reviewCreateOnCommit"], value });
		this.setState({ createReviewOnCommit: value });
	};

	renderReviewForm() {
		const { isEditing, isAmending, currentUser, repos } = this.props;
		const {
			repoStatus,
			repoName,
			reviewerEmails,
			// authorsById,
			authorsBlameData,
			openRepos,
			isLoadingScm,
			isReloadingScm,
			scmError,
			scmErrorMessage,
		} = this.state;

		// coAuthorLabels are a mapping from teamMate ID to the # of edits represented in
		// the autors variable (number of times you stomped on their code), and the number
		// of commits they pushed to this branch
		const coAuthorLabels = {};
		// Object.keys(authorsById).map(id => {
		reviewerEmails.map(email => {
			const data = authorsBlameData[email];
			if (!data) return;
			const label: string[] = [];
			if (data.stomped === 1) label.push("1 edit");
			else if (data.stomped > 1) label.push(data.stomped + " edits");
			if (data.commits === 1) label.push("1 commit");
			else if (data.commits > 1) label.push(data.commits + " commits");
			coAuthorLabels[email] = label.join(", ");
		});

		const modifier = navigator.appVersion.includes("Macintosh") ? "⌘" : "Ctrl";

		const submitTip = (
			<span>
				{isAmending ? "Amend Review" : isEditing ? "Edit Review" : "Submit Review"}
				<span className="keybinding extra-pad">{modifier} ENTER</span>
			</span>
		);

		const cancelTip = (
			<span>
				{isEditing ? "Cancel Edit" : "Discard Review"}
				<span className="keybinding extra-pad">ESC</span>
			</span>
		);

		const repoMenuItems =
			openRepos && !isAmending
				? openRepos
						.filter(repo => repo.remotes && repo.remotes?.length > 0)
						.map(repo => {
							const repoName = repo.id && repos[repo.id] && repos[repo.id].name;
							return {
								label: repoName || repo.folder.uri,
								key: repo.id,
								action: () => this.setRepo(repo),
							};
						})
				: [];

		let branchError: JSX.Element | null = null;
		if (
			this.props.isAmending &&
			repoStatus &&
			repoStatus.scm &&
			repoStatus.scm.branch &&
			repoStatus.scm.branch !== this.state.editingReviewBranch
		) {
			branchError = (
				<>
					This review was created on branch {this.state.editingReviewBranch} which does not match
					your current branch {repoStatus.scm.branch}. These two values must match to amend this
					review.
				</>
			);
		}

		const unregisteredAuthorItems = [] as any;
		if (this.props.inviteUsersOnTheFly) {
			Object.keys(authorsBlameData).forEach(email => {
				if (this.props.teamMembers.find(p => p.email === email)) return;
				unregisteredAuthorItems.push({
					label: email,
					searchLabel: email,
					checked: this.state.reviewerEmails.includes(email),
					key: email,
					icon: (
						<span style={{ paddingLeft: "5px" }}>
							<Headshot size={20} display="inline-block" person={{ email }} />
						</span>
					),
					action: () => this.toggleReviewerEmail(email),
				});
			});
		}

		const showChanges = (!isEditing || isAmending) && !isLoadingScm && !scmError && !branchError;
		// @ts-ignore
		const latestCommit: { shortMessage: string } | undefined =
			repoStatus &&
			repoStatus.scm &&
			repoStatus.scm.commits &&
			repoStatus.scm.commits[0] &&
			repoStatus.scm.commits[0].info;

		return (
			<form className="standard-form review-form" key="form">
				<fieldset className="form-body">
					{!isAmending && (
						<div id="controls" className="control-group" key="controls1">
							<div key="headshot" className="headline-flex">
								<div key="padded" style={{ paddingRight: "7px" }}>
									<Headshot person={currentUser} />
								</div>
								<div style={{ marginTop: "-1px" }}>
									<b>{currentUser.username}</b>
									<span className="subhead">
										is {isEditing ? "editing" : "requesting"} feedback
										{repoMenuItems.length > 0 && <> in </>}
									</span>
									{repoMenuItems.length === 1 && repoName && (
										<span className="highlight">{repoName}</span>
									)}
									{repoMenuItems.length > 1 && (
										<InlineMenu items={repoMenuItems}>{repoName || "select a repo"}</InlineMenu>
									)}
									{repoStatus && repoStatus.scm && repoStatus.scm.branch && (
										<>
											<span className="subhead">on branch&nbsp;</span>
											<span className="highlight">{repoStatus.scm.branch}</span>
										</>
									)}
								</div>
							</div>
							<div key="title" className="control-group has-input-actions">
								{this.renderTitleHelp()}
								<input
									key="title-text"
									type="text"
									name="title"
									className="input-text control"
									tabIndex={0}
									value={this.state.title}
									onChange={e => this.setState({ title: e.target.value, titleTouched: true })}
									placeholder="Title"
									ref={ref => (this._titleInput = ref)}
									onKeyDown={this.handleKeyDown}
								/>
								<div className="actions">
									{this.state.title && (
										<Icon
											name="x"
											placement="top"
											title="Clear Title"
											className="clickable"
											onClick={() => this.setTitle("")}
										/>
									)}
									{this.props.statusLabel && (
										<Icon
											placement="top"
											title={<NoWrap>Use Current Ticket</NoWrap>}
											name={this.props.statusIcon}
											className="clickable"
											onClick={() => this.setTitle(this.props.statusLabel)}
										/>
									)}
									{latestCommit && (
										<Icon
											placement="top"
											title={<NoWrap>Use Latest Commit Message</NoWrap>}
											name="git-commit-vertical"
											className="clickable"
											onClick={() => this.setTitle(latestCommit.shortMessage)}
										/>
									)}
									<Icon
										placement="top"
										title={<NoWrap>Use Branch Name</NoWrap>}
										name="git-branch"
										className="clickable"
										onClick={() => this.setTitleBasedOnBranch()}
									/>
								</div>
							</div>
							{this.renderTextHelp()}
							{this.renderMessageInput()}
							<div style={{ clear: "both" }} />
						</div>
					)}
					{!isAmending && this.renderTags()}
					{isAmending && (
						<div>
							<div key="headshot" className="headline-flex">
								<div key="padded" style={{ paddingRight: "7px" }}>
									<Headshot person={currentUser} />
								</div>
								<div style={{ marginTop: "-1px" }}>
									<b>{currentUser.username}</b>
									<span className="subhead">is amending the feedback request</span>
								</div>
							</div>
							{this.renderMessageInput()}
							<div style={{ clear: "both" }} />
							{this.renderAddressesIssues()}
						</div>
					)}
					{!isLoadingScm && !isEditing && !scmError && (
						<div
							className="related"
							style={{ padding: "0", marginBottom: 0, position: "relative" }}
						>
							<div className="related-label">
								Reviewers {reviewerEmails.length > 1 && this.renderMultiReviewSetting()}
							</div>
							{reviewerEmails.map(email => {
								const person = this.makePerson(email);
								const menuItems = [
									{ label: "-" },
									{
										label: "Remove from Review",
										key: "remove",
										action: () => this.removeReviewer(email),
									},
								] as any;
								if (!person.isRegistered && this.props.isCurrentUserAdmin) {
									menuItems.push({
										label: (
											<span>
												Assign all code from <span className="highlight">{email}</span> to{" "}
											</span>
										),
										key: "assign-code",
										submenu: this.props.teamMembers
											.filter(member => member.isRegistered)
											.map(member => {
												return {
													label: <HeadshotName person={member} />,
													key: "assign-" + member.id,
													action: () => this.addBlameMap(email, member.id),
												};
											}),
									});
								}
								const menu = <HeadshotMenu person={person} menuItems={menuItems} />;
								// # of times you stomped on their code
								if (coAuthorLabels[email]) {
									// console.warn("MENU ITEMS ARE: ", menuItems);
									return (
										<Tooltip placement="bottom" title={coAuthorLabels[email]}>
											<span>{menu}</span>
										</Tooltip>
									);
								} else return menu;
							})}
							<SelectPeople
								title="Select Reviewers"
								value={reviewerEmails}
								onChange={this.toggleReviewer}
								multiSelect={true}
								extraItems={unregisteredAuthorItems}
							>
								<span className="icon-button">
									<Icon
										name="plus"
										title="Specify who you want to review your code"
										placement="bottom"
									/>
								</span>
							</SelectPeople>
						</div>
					)}
					{isEditing && !scmError && !isAmending && (
						<div
							className="related"
							style={{ padding: "0", marginBottom: 0, position: "relative" }}
						>
							<div className="related-label">
								Reviewers {reviewerEmails.length > 1 && this.renderMultiReviewSetting()}
							</div>
							{reviewerEmails.map(email => {
								const menu = (
									<HeadshotMenu
										key={email}
										person={this.makePerson(email)}
										menuItems={[
											{
												label: "Remove from Review",
												action: () => this.removeReviewer(email),
											},
										]}
									/>
								);
								return menu;
							})}
							<SelectPeople
								title="Select Reviewers"
								value={reviewerEmails}
								onChange={this.toggleReviewer}
								multiSelect={true}
								extraItems={unregisteredAuthorItems}
							>
								<span className="icon-button">
									<Icon name="plus" title="Specify who you want to review your code" />
								</span>
							</SelectPeople>
						</div>
					)}
					{isReloadingScm && !isLoadingScm && (
						<FloatingLoadingMessage>Recalculating Diffs...</FloatingLoadingMessage>
					)}
					{isAmending && false && this.renderPreviousCheckpoints()}
					{showChanges && this.renderChangedFiles()}
					{showChanges && this.renderGroupsAndCommits()}
					{!isEditing && !isLoadingScm && !scmError && this.renderSharingControls()}
					{!isLoadingScm && (
						<div
							key="buttons"
							className="button-group"
							style={{
								marginLeft: "10px",
								marginTop: "10px",
								float: "right",
								width: "auto",
								marginRight: 0,
							}}
						>
							<CancelButton toolTip={cancelTip} onClick={this.confirmCancel} mode="button" />
							{!scmError && !branchError && (
								<Tooltip title={submitTip} placement="bottomRight" delay={1}>
									<Button
										key="submit"
										style={{
											paddingLeft: "10px",
											paddingRight: "10px",
											// fixed width to handle the isLoading case
											width: "80px",
											marginRight: 0,
										}}
										className={cx("control-button", { cancel: !this.state.title })}
										type="submit"
										disabled={isEditing ? false : !this.hasChanges()}
										loading={isReloadingScm || this.state.isLoading}
										onClick={this.handleClickSubmit}
									>
										{isAmending === true ? "Amend" : "Submit"}
									</Button>
								</Tooltip>
							)}
						</div>
					)}
					{isLoadingScm && <LoadingMessage>Loading repo info...</LoadingMessage>}
					{this.state.scmError && (
						<div className="color-warning" style={{ display: "flex", padding: "10px 0" }}>
							<Icon name="alert" />
							<div style={{ paddingLeft: "10px" }}>
								{scmErrorMessage || "Error loading git info."}
								{repoMenuItems.length > 0 && <> Select a repo above.</>}
							</div>
						</div>
					)}
					{branchError && (
						<div className="color-warning" style={{ display: "flex", padding: "10px 0" }}>
							<Icon name="alert" />
							<div style={{ paddingLeft: "10px" }}>{branchError}</div>
						</div>
					)}
					<div key="clear" style={{ clear: "both" }} />
					{this.state.reviewCreationError && (
						<div className="color-warning" style={{ display: "flex", padding: "10px 0" }}>
							<Icon name="alert" />
							<div style={{ paddingLeft: "10px" }}>{this.state.reviewCreationError}</div>
						</div>
					)}
				</fieldset>
			</form>
		);
	}
}

const EMPTY_OBJECT = {};

const mapStateToProps = (state: CodeStreamState, props): ConnectedProps => {
	const { context, editorContext, users, teams, session, preferences, repos, documents, ide } =
		state;
	const user = users[session.userId!] as CSMe;
	const channel = context.currentStreamId
		? getStreamForId(state.streams, context.currentTeamId, context.currentStreamId) ||
		  getStreamForTeam(state.streams, context.currentTeamId)
		: getStreamForTeam(state.streams, context.currentTeamId);

	const teamMates = getTeamMates(state).filter(_ => !_.email?.match(/noreply/));
	const teamMembers = getTeamMembers(state).filter(_ => !_.email?.match(/noreply/));
	const teamTagsArray = getTeamTagsArray(state);

	let unsavedFiles: string[] = [];
	if (documents) {
		unsavedFiles = Object.keys(documents).filter(uri => {
			return documents[uri].isDirty;
		});
	}

	const team = teams[context.currentTeamId];
	const activeMemberIds = getActiveMemberIds(team);
	const blameMap = team.settings ? team.settings.blameMap : {};

	const skipPostCreationModal = preferences ? preferences.skipPostCreationModal : false;

	const reviewsByCommit = getAllByCommit(state) || {};

	const changeRequests = props.editingReview && getReviewChangeRequests(state, props.editingReview);
	const inviteUsersOnTheFly =
		isFeatureEnabled(state, "emailSupport") && isFeatureEnabled(state, "inviteUsersOnTheFly");

	const adminIds = team.adminIds || [];
	const isCurrentUserAdmin = adminIds.includes(session.userId!);
	const statusLabel =
		user &&
		user.status &&
		user.status[context.currentTeamId] &&
		user.status[context.currentTeamId].label
			? user.status[context.currentTeamId].label
			: "";
	const statusIcon =
		user &&
		user.status &&
		user.status[context.currentTeamId] &&
		user.status[context.currentTeamId].label
			? user.status[context.currentTeamId].ticketProvider || "ticket"
			: "";
	return {
		unsavedFiles: unsavedFiles,
		reviewsByCommit,
		teamReviewCount: teamReviewCount(state),
		shouldShare:
			safe(() => state.preferences[state.context.currentTeamId].shareCodemarkEnabled) || false,
		channel,
		teamId: team.id,
		teamMates,
		teamMembers,
		activeMemberIds,
		reviewApproval: getTeamSetting(team, "reviewApproval"),
		reviewAssignment: getTeamSetting(team, "reviewAssignment"),
		providerInfo: (user.providerInfo && user.providerInfo[context.currentTeamId]) || EMPTY_OBJECT,
		currentUser: user,
		skipPostCreationModal,
		currentReviewOptions: state.context.currentReviewOptions,
		textEditorUri: editorContext.textEditorUri,
		teamTagsArray,
		repos,
		changeRequests,
		inviteUsersOnTheFly,
		newPostEntryPoint: context.newPostEntryPoint,
		blameMap,
		isCurrentUserAdmin,
		statusLabel,
		statusIcon,
		currentRepoPath: context.currentRepo && context.currentRepo.path,
		ideSupportsCreateReviewOnCommit: ide.name === "JETBRAINS" || ide.name === "VSC",
		isAutoFREnabled: isFeatureEnabled(state, "autoFR"),
		createReviewOnCommit: state.preferences.reviewCreateOnCommit !== false,
	};
};

const ConnectedReviewForm = connect(mapStateToProps, {
	openPanel,
	openModal,
	closePanel,
	createPostAndReview,
	editReview,
	setUserPreference,
	setCurrentReview,
	setCurrentRepo,
	setCodemarkStatus,
	setNewPostEntry,
})(ReviewForm);

export { ConnectedReviewForm as ReviewForm };
