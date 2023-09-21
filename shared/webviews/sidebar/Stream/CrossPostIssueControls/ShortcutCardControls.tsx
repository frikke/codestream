import {
	FetchAssignableUsersRequestType,
	FetchThirdPartyBoardsRequestType,
	ShortcutProject,
	ThirdPartyProviderConfig,
} from "@codestream/protocols/agent";
import { CodeStreamState } from "@codestream/sidebar/store";
import { updateForProvider } from "@codestream/sidebar/store/activeIntegrations/actions";
import { getIntegrationData } from "@codestream/sidebar/store/activeIntegrations/reducer";
import { ShortcutIntegrationData } from "@codestream/sidebar/store/activeIntegrations/types";
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

interface Props {
	provider: ThirdPartyProviderConfig;
}

export function ShortcutCardControls(props: React.PropsWithChildren<Props>) {
	const dispatch = useDispatch();
	const data = useSelector((state: CodeStreamState) =>
		getIntegrationData<ShortcutIntegrationData>(state.activeIntegrations, props.provider.id)
	);
	const updateDataState = React.useCallback(
		(data: Partial<ShortcutIntegrationData>) => {
			dispatch(updateForProvider<ShortcutIntegrationData>(props.provider.id, data));
		},
		[props.provider.id]
	);

	useDidMount(() => {
		if (data.projects && data.projects.length > 0 && data.currentProject) {
			const projectId = (data.currentProject || data.projects[0]).id;
			crossPostIssueContext.setValues({ projectId });
			return;
		}

		if (!data.isLoading) {
			updateDataState({
				isLoading: true,
			});
		}

		let isValid = true;

		const fetchProjects = async () => {
			const response = await HostApi.sidebarInstance.send(FetchThirdPartyBoardsRequestType, {
				providerId: props.provider.id,
			});

			if (!isValid) return;
			// make sure to persist current project selection if possible
			const newCurrentProject = (
				data.currentProject
					? response.boards.find(b => b.id === data.currentProject!.id)
					: response.boards[0]
			) as ShortcutProject;

			updateDataState({
				isLoading: false,
				projects: response.boards as ShortcutProject[],
				currentProject: newCurrentProject,
			});

			crossPostIssueContext.setValues({
				projectId: newCurrentProject.id,
			});
		};

		fetchProjects();

		return () => {
			isValid = false;
		};
	});

	const [projectMenuState, setProjectMenuState] = React.useState<{
		open: boolean;
		target?: EventTarget;
	}>({ open: false, target: undefined });
	const [listMenuState, setListMenuState] = React.useState<{
		open: boolean;
		target?: EventTarget;
	}>({ open: false, target: undefined });

	const handleClickProject = React.useCallback((event: React.MouseEvent) => {
		event.stopPropagation();
		const target = event.target;
		setProjectMenuState(state => ({
			open: !state.open,
			target,
		}));
	}, []);

	const selectProject = React.useCallback((project?: ShortcutProject) => {
		setProjectMenuState({ open: false });
		if (project) {
			crossPostIssueContext.setValues({
				projectId: project.id,
			});
			updateDataState({
				currentProject: project,
			});
		}
	}, []);

	const loadAssignableUsers = React.useCallback(
		async (inputValue: string) => {
			if (!data.currentProject) return [];

			const { users } = await HostApi.sidebarInstance.send(FetchAssignableUsersRequestType, {
				providerId: props.provider.id,
				boardId: data.currentProject!.id,
			});
			return mapFilter(users, u => {
				if (u.displayName.toLowerCase().includes(inputValue.toLowerCase()))
					return { label: u.displayName, value: u };
				else return;
			});
		},
		[data.currentProject]
	);

	const crossPostIssueContext = React.useContext(CrossPostIssueContext);

	const assigneesInput = (() => {
		if (crossPostIssueContext.assigneesInputTarget == undefined) return null;

		const { currentProject } = data;

		return ReactDOM.createPortal(
			<AsyncSelect
				key={currentProject ? currentProject.id : "no-board"}
				id="input-assignees"
				name="assignees"
				classNamePrefix="react-select"
				defaultOptions
				loadOptions={loadAssignableUsers}
				value={crossPostIssueContext.selectedAssignees}
				isMulti
				placeholder="Members (optional)"
				getOptionValue={option => option.value.id}
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
					Fetching projects...
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

	const projectItems = (data.projects || emptyArray).map(project => ({
		label: project.name,
		key: project.id,
		action: project,
	}));

	return (
		<>
			{assigneesInput}
			<div className="checkbox-row">
				<input type="checkbox" checked onChange={e => dispatch(setIssueProvider(undefined))} />
				{" Add a card on "}
				<span className="channel-label" onClick={handleClickProject}>
					{data.currentProject && data.currentProject.name}
					<Icon name="chevron-down" />
					{projectMenuState.open && (
						<Menu
							align="center"
							compact={true}
							target={projectMenuState.target}
							items={projectItems}
							action={selectProject}
						/>
					)}
				</span>
				{` on `}
				{props.children}
			</div>
		</>
	);
}
