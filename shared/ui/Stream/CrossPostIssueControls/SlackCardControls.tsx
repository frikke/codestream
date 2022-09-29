import {
	FetchAssignableUsersRequestType,
	FetchThirdPartyChannelsRequestType,
	SlackChannel,
	ThirdPartyProviderConfig,
} from "@codestream/protocols/agent";
import { CodeStreamState } from "@codestream/webview/store";
import { updateForProvider } from "@codestream/webview/store/activeIntegrations/actions";
import { getIntegrationData } from "@codestream/webview/store/activeIntegrations/reducer";
import { SlackIntegrationData } from "@codestream/webview/store/activeIntegrations/types";
import { setIssueProvider } from "@codestream/webview/store/context/actions";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import { emptyArray, mapFilter } from "@codestream/webview/utils";
import { HostApi } from "@codestream/webview/webview-api";
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

export function SlackCardControls(props: React.PropsWithChildren<Props>) {
	const dispatch = useDispatch();
	const data = useSelector((state: CodeStreamState) =>
		getIntegrationData<SlackIntegrationData>(state.activeIntegrations, props.provider.id)
	);
	const updateDataState = React.useCallback(
		(data: Partial<SlackIntegrationData>) => {
			dispatch(updateForProvider<SlackIntegrationData>(props.provider.id, data));
		},
		[props.provider.id]
	);

	useDidMount(() => {
		if (data.boards && data.boards.length > 0) {
			crossPostIssueContext.setValues({
				//listId: data.currentList ? data.currentList.id : data.boards[0].lists[0].id
			});
			return;
		}

		if (!data.isLoading) {
			updateDataState({
				isLoading: true,
			});
		}

		let isValid = true;

		const fetchChannels = async () => {
			const response = await HostApi.instance.send(FetchThirdPartyChannelsRequestType, {
				providerId: props.provider.id,
				// TODO need the real providerTeamId
				providerTeamId: "T7DDT1L5R",
			});

			if (!isValid) return;
			// make sure to persist current board/list selection if possible
			const newCurrentBoard = (
				data.currentBoard
					? response.channels.find(b => b.id === data.currentBoard!.id)
					: response.channels[0]
			) as SlackChannel;

			// const newCurrentList = (data.currentList
			// 	? newCurrentBoard.lists.find(l => l.id === data.currentList!.id)
			// 	: newCurrentBoard) as SlackChannel;

			updateDataState({
				isLoading: false,
				boards: response.channels as SlackChannel[],
				currentBoard: newCurrentBoard,
				//currentList: newCurrentList
			});

			// crossPostIssueContext.setValues({
			// 	listId: newCurrentList.id
			// });
		};

		fetchChannels();

		return () => {
			isValid = false;
		};
	});

	const [boardMenuState, setBoardMenuState] = React.useState<{
		open: boolean;
		target?: EventTarget;
	}>({ open: false, target: undefined });
	const [listMenuState, setListMenuState] = React.useState<{
		open: boolean;
		target?: EventTarget;
	}>({ open: false, target: undefined });

	const handleClickBoard = React.useCallback((event: React.MouseEvent) => {
		event.stopPropagation();
		const target = event.target;
		setBoardMenuState(state => ({
			open: !state.open,
			target,
		}));
	}, []);

	const selectBoard = React.useCallback((board?: SlackChannel) => {
		setBoardMenuState({ open: false });
		if (board) {
			updateDataState({
				currentBoard: board,
				//currentList: board.lists[0]
			});
			// crossPostIssueContext.setValues({
			// 	listId: board.lists[0].id
			// });
		}
	}, []);

	const handleClickList = React.useCallback((event: React.MouseEvent) => {
		event.stopPropagation();
		const target = event.target;
		setListMenuState(state => ({
			open: !state.open,
			target,
		}));
	}, []);

	const selectList = React.useCallback((list?: SlackChannel) => {
		setListMenuState({ open: false });

		if (list) {
			crossPostIssueContext.setValues({
				listId: list.id,
			});
			// updateDataState({
			// 	currentList: list
			// });
		}
	}, []);

	const loadAssignableUsers = React.useCallback(
		async (inputValue: string) => {
			if (!data.currentBoard) return [];

			const { users } = await HostApi.instance.send(FetchAssignableUsersRequestType, {
				providerId: props.provider.id,
				boardId: data.currentBoard!.id,
			});
			return mapFilter(users, u => {
				if (u.displayName.toLowerCase().includes(inputValue.toLowerCase()))
					return { label: u.displayName, value: u };
				else return;
			});
		},
		[data.currentBoard]
	);

	const crossPostIssueContext = React.useContext(CrossPostIssueContext);

	const assigneesInput = (() => {
		if (crossPostIssueContext.assigneesInputTarget == undefined) return null;

		const { currentBoard } = data;

		return ReactDOM.createPortal(
			<AsyncSelect
				key={currentBoard ? currentBoard.id : "no-board"}
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
					Fetching boards...
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

	const boardItems = (data.boards || emptyArray).map(board => ({
		label: board.name,
		key: board.id,
		action: board,
	}));
	const listItems = [];
	//  data.currentBoard
	// 	? data.currentBoard.map(list => ({
	// 			label: list.name,
	// 			key: list.id,
	// 			action: list
	// 	  }))
	// 	: [];

	return (
		<>
			{assigneesInput}
			<div className="checkbox-row">
				<input type="checkbox" checked onChange={e => dispatch(setIssueProvider(undefined))} />
				{" Add a card on "}
				<span className="channel-label" onClick={handleClickBoard}>
					{data.currentBoard && data.currentBoard.name}
					<Icon name="chevron-down" />
					{boardMenuState.open && (
						<Menu
							align="center"
							compact={true}
							target={boardMenuState.target}
							items={boardItems}
							action={selectBoard}
						/>
					)}
				</span>
				{listItems.length > 0 && (
					<>
						{" in "}
						<span className="channel-label" onClick={handleClickList}>
							{/* {data.currentList ? data.currentList.name : ""} */}
							<Icon name="chevron-down" />
							{listMenuState.open && (
								<Menu
									align="center"
									compact={true}
									target={listMenuState.target}
									items={listItems}
									action={selectList}
								/>
							)}
						</span>{" "}
					</>
				)}
				{` on `}
				{props.children}
			</div>
		</>
	);
}
