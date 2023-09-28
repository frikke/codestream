import {
	FetchAssignableUsersRequestType,
	FetchThirdPartyBoardsRequestType,
	GitLabBoard,
	ThirdPartyProviderConfig,
} from "@codestream/protocols/agent";
import { CodeStreamState } from "@codestream/sidebar/store";
import { updateForProvider } from "@codestream/sidebar/store/activeIntegrations/actions";
import { getIntegrationData } from "@codestream/sidebar/store/activeIntegrations/reducer";
import { GitLabIntegrationData } from "@codestream/sidebar/store/activeIntegrations/types";
import { setIssueProvider } from "@codestream/sidebar/store/context/actions";
import { useDidMount } from "@codestream/sidebar/utilities/hooks";
import { emptyArray, mapFilter } from "@codestream/sidebar/utils";
import { HostApi } from "@codestream/sidebar/sidebar-api";
import React from "react";
import ReactDOM from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import AsyncSelect from "react-select/async";
import { CrossPostIssueContext } from "../CodemarkForm";
import Icon from "../Icon";
import Menu from "../Menu";

export function GitLabCardControls(
	props: React.PropsWithChildren<{ provider: ThirdPartyProviderConfig }>
) {
	const dispatch = useDispatch();
	const data = useSelector((state: CodeStreamState) =>
		getIntegrationData<GitLabIntegrationData>(state.activeIntegrations, props.provider.id)
	);
	const updateDataState = React.useCallback(
		(data: Partial<GitLabIntegrationData>) => {
			dispatch(updateForProvider<GitLabIntegrationData>(props.provider.id, data));
		},
		[props.provider.id]
	);

	const crossPostIssueContext = React.useContext(CrossPostIssueContext);

	const selectRepoForCodeBlock = (repos: GitLabBoard[] = emptyArray) => {
		const { codeBlock } = crossPostIssueContext;
		let repoToSelect = repos[0];
		for (const repo of repos) {
			if (repo.path === (codeBlock && codeBlock.scm && codeBlock.scm.repoPath)) {
				repoToSelect = repo;
			}
		}

		if (repoToSelect) {
			updateDataState({ currentRepo: repoToSelect });
			crossPostIssueContext.setValues({ boardName: repoToSelect.name });
		}
	};

	useDidMount(() => {
		if (data.repos && data.repos.length > 0) {
			selectRepoForCodeBlock(data.repos);
		}
		if (!data.isLoading) {
			updateDataState({
				isLoading: true,
			});
		}

		let isValid = true;

		const fetchBoards = async () => {
			let response = await HostApi.instance.send(FetchThirdPartyBoardsRequestType, {
				providerId: props.provider.id,
			});

			if (!isValid) return;

			selectRepoForCodeBlock(response.boards as GitLabBoard[]);
			updateDataState({
				isLoading: false,
				repos: response.boards as GitLabBoard[],
			});
		};

		fetchBoards();

		return () => {
			isValid = false;
		};
	});

	const [repoMenuState, setRepoMenuState] = React.useState<{ open: boolean; target?: EventTarget }>(
		{ open: false }
	);
	const handleClickRepo = React.useCallback((event: React.MouseEvent) => {
		event.preventDefault();
		event.persist();
		setRepoMenuState(state => ({ open: !state.open, target: event.target }));
	}, []);
	const selectRepo = React.useCallback((repo?: GitLabBoard) => {
		setRepoMenuState({ open: false, target: undefined });
		if (repo) {
			updateDataState({
				currentRepo: repo,
			});
			crossPostIssueContext.setValues({ boardName: repo.name });
		}
	}, []);

	const loadAssignableUsers = React.useCallback(
		async (inputValue: string) => {
			if (!data.currentRepo) return [];

			const { users } = await HostApi.instance.send(FetchAssignableUsersRequestType, {
				providerId: props.provider.id,
				boardId: data.currentRepo.id,
			});

			return mapFilter(users, u => {
				if (u.displayName.toLowerCase().includes(inputValue.toLowerCase()))
					return { label: u.displayName, value: u };
				else return;
			});
		},
		[data.currentRepo]
	);

	const assigneesInput = (() => {
		if (crossPostIssueContext.assigneesInputTarget == undefined) return null;

		const { currentRepo } = data;

		return ReactDOM.createPortal(
			<AsyncSelect
				key={currentRepo ? currentRepo.id : "no-board"}
				id="input-assignees"
				name="assignees"
				classNamePrefix="react-select"
				defaultOptions
				loadOptions={loadAssignableUsers}
				value={crossPostIssueContext.selectedAssignees}
				placeholder="Assignee (optional)"
				onChange={value => crossPostIssueContext.setSelectedAssignees(value)}
			/>,
			crossPostIssueContext.assigneesInputTarget
		);
	})();

	if (data.isLoading)
		return (
			<div className="loading-boards">
				{assigneesInput}
				<span>
					<Icon className="spin" name="sync" />
					Fetching repositories...
				</span>
				<a
					style={{ marginLeft: "5px" }}
					onClick={e => {
						e.preventDefault();
						dispatch(setIssueProvider(undefined));
						updateDataState({ isLoading: false });
					}}
				>
					cancel
				</a>
			</div>
		);

	return (
		<>
			{assigneesInput}
			<div className="checkbox-row">
				<input type="checkbox" checked onChange={_ => dispatch(setIssueProvider(undefined))} />
				{" Add an issue on "}
				<span className="channel-label" onClick={handleClickRepo}>
					{data.currentRepo && data.currentRepo.name}
					<Icon name="chevron-down" />
					{repoMenuState.open && (
						<Menu
							align="center"
							compact={true}
							target={repoMenuState.target}
							items={(data.repos || emptyArray).map(board => ({
								label: board.name,
								key: board.id,
								action: board,
							}))}
							action={selectRepo}
						/>
					)}
				</span>
				{` on `}
				{props.children}
			</div>
		</>
	);
}
