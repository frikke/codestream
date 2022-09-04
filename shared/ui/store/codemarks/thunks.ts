import {
	AddMarkersRequest,
	AddMarkersRequestType,
	CodemarkPlus,
	CreatePassthroughCodemarkResponse,
	CreateShareableCodemarkRequestType,
	CreateThirdPartyPostRequestType,
	DeleteCodemarkRequestType,
	DeleteMarkerRequestType,
	GetRangeScmInfoResponse,
	MoveMarkerRequest,
	MoveMarkerRequestType,
	UpdateCodemarkRequestType,
	UpdatePostSharingDataRequestType,
} from "@codestream/protocols/agent";
import { CSCodemark } from "@codestream/protocols/api";
import { logError } from "@codestream/webview/logger";
import { CodeStreamState } from "@codestream/webview/store";
import {
	_deleteCodemark,
	addCodemarks,
	CreateCodemarkError,
	isCreateCodemarkError,
	SharingNewCodemarkAttributes,
	updateCodemarks,
} from "@codestream/webview/store/codemarks/actions";
import providerPullRequestSlice from "../providerPullRequests/reducer";
import { getConnectedProviders } from "@codestream/webview/store/providers/reducer";
import { addStreams } from "@codestream/webview/store/streams/actions";
import { capitalize } from "@codestream/webview/utils";
import { HostApi } from "@codestream/webview/webview-api";

type EditableAttributes = Partial<
	Pick<CSCodemark, "tags" | "text" | "title" | "assignees" | "relatedCodemarkIds">
> & {
	deleteMarkerLocations?: {
		[index: number]: boolean;
	};
	codeBlocks?: GetRangeScmInfoResponse[];
};

export const createCodemark =
	(attributes: SharingNewCodemarkAttributes) =>
	async (dispatch, getState: () => CodeStreamState) => {
		const { accessMemberIds, ...rest } = attributes;
		const state = getState();

		try {
			const response = await HostApi.instance.send(CreateShareableCodemarkRequestType, {
				attributes: rest,
				memberIds: accessMemberIds,
				textDocuments: attributes.textDocuments,
				entryPoint: attributes.entryPoint,
				mentionedUserIds: attributes.mentionedUserIds,
				addedUsers: attributes.addedUsers,
				parentPostId: attributes.parentPostId,
				isPseudoCodemark: attributes.isPseudoCodemark,
				isProviderReview: attributes.isProviderReview,
				files: attributes.files,
				ideName: state.ide.name,
			});
			if (response) {
				let result;
				let responseAsPassthrough = response as any as CreatePassthroughCodemarkResponse;
				if (responseAsPassthrough?.isPassThrough) {
					if (responseAsPassthrough && responseAsPassthrough.directives) {
						dispatch(
							providerPullRequestSlice.actions.handleDirectives({
								providerId: responseAsPassthrough.pullRequest.providerId,
								id: responseAsPassthrough.pullRequest.id,
								data: responseAsPassthrough.directives.directives,
							})
						);
						return {
							handled: true,
						};
					} else {
						console.error("missing directives", response);
					}
				} else {
					result = dispatch(addCodemarks([response.codemark]));
					dispatch(addStreams([response.stream]));

					if (attributes.sharingAttributes) {
						const { sharingAttributes } = attributes;
						try {
							const { post, ts, permalink } = await HostApi.instance.send(
								CreateThirdPartyPostRequestType,
								{
									providerId: sharingAttributes.providerId,
									channelId: sharingAttributes.channelId,
									providerTeamId: sharingAttributes.providerTeamId,
									text: rest.text,
									codemark: response.codemark,
									remotes: attributes.remotes,
									mentionedUserIds: attributes.mentionedUserIds,
								}
							);
							if (ts) {
								await HostApi.instance.send(UpdatePostSharingDataRequestType, {
									postId: response.codemark.postId,
									sharedTo: [
										{
											createdAt: post.createdAt,
											providerId: sharingAttributes.providerId,
											teamId: sharingAttributes.providerTeamId,
											teamName: sharingAttributes.providerTeamName || "",
											channelId: sharingAttributes.channelId,
											channelName: sharingAttributes.channelName || "",
											postId: ts,
											url: permalink || "",
										},
									],
								});
							}
							HostApi.instance.track("Shared Codemark", {
								Destination: capitalize(
									getConnectedProviders(getState()).find(
										config => config.id === attributes.sharingAttributes!.providerId
									)!.name
								),
								"Codemark Status": "New",
							});
						} catch (error) {
							logError("Error sharing a codemark", { message: error.toString() });
							throw { reason: "share" } as CreateCodemarkError;
						}
					}
				}
				return result;
			}
		} catch (error) {
			// if this is a sharing error just throw it
			if (isCreateCodemarkError(error)) throw error;

			logError(
				attributes &&
					attributes.codeBlocks &&
					attributes.codeBlocks.length &&
					attributes.codeBlocks[0].context &&
					attributes.codeBlocks[0].context.pullRequest
					? "Error creating PR comment"
					: "Error creating a codemark",
				{ message: error.toString() }
			);

			let regex = /(?<=\:)(.*?)(?=\:)/;
			let userFriendlyMessage = regex.exec(error?.message);
			throw {
				reason: "create",
				message: userFriendlyMessage ? userFriendlyMessage[0] : "",
			} as CreateCodemarkError;
		}
	};

export const deleteCodemark = (codemarkId: string) => async dispatch => {
	try {
		void (await HostApi.instance.send(DeleteCodemarkRequestType, {
			codemarkId,
		}));
		dispatch(_deleteCodemark(codemarkId));
	} catch (error) {
		logError(error, { detail: `failed to delete codemark`, codemarkId });
	}
};

export const editCodemark =
	(codemark: CodemarkPlus, attributes: EditableAttributes) => async dispatch => {
		try {
			const { markers = [] } = codemark;
			const { deleteMarkerLocations = {}, codeBlocks } = attributes;

			if (Object.keys(deleteMarkerLocations).length > 0) {
				const toDelete: { markerId: string }[] = [];

				Object.keys(deleteMarkerLocations).forEach(index => {
					if (markers[index]) toDelete.push({ markerId: markers[index].id });
				});

				await Promise.all(
					toDelete.map(args => HostApi.instance.send(DeleteMarkerRequestType, args))
				);
			}

			if (codeBlocks) {
				const toAdd: AddMarkersRequest = { codemarkId: codemark.id, newMarkers: [] };
				const toMove: MoveMarkerRequest[] = [];

				codeBlocks.forEach((codeBlock, index) => {
					if (!codeBlock || deleteMarkerLocations[index]) return;

					if (index >= markers.length && codeBlock.scm) {
						toAdd.newMarkers.push({
							code: codeBlock.contents,
							documentId: { uri: codeBlock.uri },
							range: codeBlock.range,
							source: codeBlock.scm,
						});
					} else if (markers[index] && codeBlock.scm) {
						toMove.push({
							markerId: markers[index].id,
							code: codeBlock.contents,
							range: codeBlock.range,
							documentId: { uri: codeBlock.uri },
							source: codeBlock.scm,
						});
					}
				});

				if (toAdd.newMarkers.length > 0) {
					await HostApi.instance.send(AddMarkersRequestType, toAdd);
				}
				if (toMove.length > 0) {
					await Promise.all(toMove.map(args => HostApi.instance.send(MoveMarkerRequestType, args)));
				}
			}

			const response = await HostApi.instance.send(UpdateCodemarkRequestType, {
				codemarkId: codemark.id,
				...attributes,
			});

			dispatch(updateCodemarks([response.codemark]));
		} catch (error) {
			logError(error, {
				detail: `failed to update codemark`,
				codemarkId: codemark.id,
			});
		}
	};
