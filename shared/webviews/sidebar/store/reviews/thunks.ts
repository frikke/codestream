import {
	CreateShareableReviewRequestType,
	CreateThirdPartyPostRequestType,
	DeleteReviewRequestType,
	DeleteThirdPartyPostRequestType,
	FetchReviewsRequestType,
	GetReviewRequestType,
	UpdatePostSharingDataRequestType,
	UpdateReviewRequestType,
	UpdateReviewResponse,
} from "@codestream/protocols/agent";
import { ShareTarget } from "@codestream/protocols/api";
import {
	ReviewCheckpoint,
	ReviewCloseDiffRequestType,
	ReviewShowDiffRequestType,
} from "@codestream/sidebar/ipc/sidebar.protocol";
import { logError } from "@codestream/sidebar/logger";
import { CodeStreamState } from "@codestream/sidebar/store";
import { addPosts } from "@codestream/sidebar/store/posts/actions";
import { getConnectedProviders } from "@codestream/sidebar/store/providers/reducer";
import {
	addReviews,
	EditableAttributes,
	NewReviewAttributes,
	saveReviews,
	updateReviews,
	_bootstrapReviews,
	_deleteReview,
} from "@codestream/sidebar/store/reviews/actions";
import { addStreams } from "@codestream/sidebar/store/streams/actions";
import { findMentionedUserIds, getTeamMembers } from "@codestream/sidebar/store/users/reducer";
import { createPost } from "@codestream/sidebar/Stream/actions";
import { phraseList } from "@codestream/sidebar/utilities/strings";
import { capitalize, mapFilter } from "@codestream/sidebar/utils";
import { HostApi } from "@codestream/sidebar/sidebar-api";

export interface CreateReviewError {
	reason: "share" | "create";
	message?: string;
}

export const bootstrapReviews = () => async dispatch => {
	const { reviews } = await HostApi.sidebarInstance.send(FetchReviewsRequestType, {});
	dispatch(_bootstrapReviews(reviews));
};

export const createReview =
	(attributes: NewReviewAttributes) => async (dispatch, getState: () => CodeStreamState) => {
		const { accessMemberIds, ...rest } = attributes;

		try {
			const response = await HostApi.sidebarInstance.send(CreateShareableReviewRequestType, {
				attributes: rest,
				memberIds: accessMemberIds,
				entryPoint: attributes.entryPoint,
				mentionedUserIds: attributes.mentionedUserIds,
				addedUsers: attributes.addedUsers,
			});
			if (response) {
				const result = dispatch(addReviews([response.review]));
				dispatch(addStreams([response.stream]));
				dispatch(addPosts([response.post]));

				if (attributes.sharingAttributes) {
					const { sharingAttributes } = attributes;
					try {
						const { post, ts, permalink, channelId } = await HostApi.sidebarInstance.send(
							CreateThirdPartyPostRequestType,
							{
								providerId: attributes.sharingAttributes.providerId,
								channelId:
									sharingAttributes.type === "channel" ? sharingAttributes.channelId : undefined,
								memberIds:
									sharingAttributes.type === "direct" ? sharingAttributes.userIds : undefined,
								providerTeamId: attributes.sharingAttributes.providerTeamId,
								providerServerTokenUserId: sharingAttributes.botUserId,
								text: rest.text,
								review: response.review,
								mentionedUserIds: attributes.mentionedUserIds,
								files: attributes.files,
							}
						);
						if (ts) {
							await HostApi.sidebarInstance.send(UpdatePostSharingDataRequestType, {
								postId: response.post.id,
								sharedTo: [
									{
										createdAt: post.createdAt,
										providerId: sharingAttributes.providerId,
										teamId: sharingAttributes.providerTeamId,
										teamName: sharingAttributes.providerTeamName || "",
										channelId:
											channelId ||
											(sharingAttributes.type === "channel" ? sharingAttributes.channelId : ""),
										channelName: sharingAttributes.channelName || "",
										postId: ts,
										url: permalink || "",
									},
								],
							});
						}
						HostApi.sidebarInstance.track("Shared Review", {
							Destination: capitalize(
								getConnectedProviders(getState()).find(
									config => config.id === attributes.sharingAttributes!.providerId
								)!.name
							),
							"Review Status": "New",
							"Conversation Type": sharingAttributes.type === "channel" ? "Channel" : "Group DM",
						});
					} catch (error) {
						logError("Error sharing a review", { message: error.toString() });
						// TODO: communicate failure to users
						throw { reason: "share" } as CreateReviewError;
					}
				}
				return result;
			}
		} catch (error) {
			logError(error, {
				detail: "Error creating a review",
			});
			throw { reason: "create", ...error } as CreateReviewError;
		}
	};

export const deleteReview = (id: string, sharedTo?: ShareTarget[]) => async dispatch => {
	try {
		await HostApi.sidebarInstance.send(DeleteReviewRequestType, {
			id,
		});
		try {
			if (sharedTo) {
				for (const shareTarget of sharedTo) {
					await HostApi.sidebarInstance.send(DeleteThirdPartyPostRequestType, {
						providerId: shareTarget.providerId,
						channelId: shareTarget.channelId,
						providerPostId: shareTarget.postId,
						providerTeamId: shareTarget.teamId,
					});
				}
			}
		} catch (error) {
			logError(`There was an error deleting a third party shared post: ${error}`);
		}
		dispatch(_deleteReview(id));
	} catch (error) {
		logError(error, { detail: `failed to delete review`, id });
	}
};

export const editReview =
	(id: string, attributes: EditableAttributes, replyText?: string) =>
	async (dispatch, getState: () => CodeStreamState) => {
		let response: UpdateReviewResponse | undefined;
		try {
			response = await HostApi.sidebarInstance.send(UpdateReviewRequestType, {
				id,
				...attributes,
			});
			dispatch(updateReviews([response.review]));

			if (
				attributes.$push != null &&
				attributes.$push.reviewers != null &&
				attributes.$push.reviewers.length
			) {
				// if we have additional ids we're adding via $push, map them here
				const filteredUsers = mapFilter(getTeamMembers(getState()), teamMember => {
					const user = attributes.$push!.reviewers!.find(_ => _ === teamMember.id);
					return user ? teamMember : undefined;
				}).filter(Boolean);

				if (filteredUsers.length) {
					dispatch(
						createPost(
							response.review.streamId,
							response.review.postId,
							`/me added ${phraseList(filteredUsers.map(u => `@${u.username}`))} to this review`,
							null,
							filteredUsers.map(u => u.id)
						)
					);
				}
			}

			if (attributes.repoChanges) {
				// FIXME multiple-repo
				const checkpoint = attributes.repoChanges[0].checkpoint || 0;

				dispatch(
					createPost(
						response.review.streamId,
						response.review.postId,
						replyText || "",
						undefined,
						undefined,
						{ reviewCheckpoint: checkpoint }
					)
				);
			}

			if (attributes.sharedTo) {
				const { sharedTo } = attributes;
				for (const shareTarget of sharedTo) {
					try {
						const { post, ts, permalink } = await HostApi.sidebarInstance.send(
							CreateThirdPartyPostRequestType,
							{
								providerId: shareTarget.providerId,
								channelId: shareTarget.channelId,
								providerTeamId: shareTarget.teamId,
								existingPostId: shareTarget.postId,
								text: attributes.text || "",
								review: response.review,
								mentionedUserIds: findMentionedUserIds(
									getTeamMembers(getState()),
									attributes.text || ""
								),
							}
						);
						if (ts) {
							await HostApi.sidebarInstance.send(UpdatePostSharingDataRequestType, {
								postId: response.review.id,
								sharedTo: [
									{
										createdAt: post.createdAt,
										providerId: shareTarget.providerId,
										teamId: shareTarget.teamId,
										teamName: shareTarget.teamName || "",
										channelId: shareTarget.channelId,
										channelName: shareTarget.channelName || "",
										postId: ts,
										url: permalink || "",
									},
								],
							});
						}
						HostApi.sidebarInstance.track("Shared Review", {
							Destination: capitalize(
								getConnectedProviders(getState()).find(
									config => config.id === shareTarget.providerId
								)!.name
							),
							"Review Status": "Edited",
						});
					} catch (error) {
						logError("Error sharing a review", { message: error.toString() });
						// TODO: communicate failure to users
						throw { reason: "share" } as CreateReviewError;
					}
				}
			}
		} catch (error) {
			logError(error, { detail: `failed to update review`, id });
		}
		return response;
	};

export const fetchReview = (reviewId: string) => async dispatch => {
	const response = await HostApi.sidebarInstance.send(GetReviewRequestType, { reviewId });

	if (response.review) return dispatch(saveReviews([response.review]));
};

export const showDiff =
	(reviewId: string, checkpoint: ReviewCheckpoint, repoId: string, path: string) =>
	async dispatch => {
		const response = HostApi.sidebarInstance.send(ReviewShowDiffRequestType, {
			reviewId,
			checkpoint,
			repoId,
			path,
		});
		// if (response.success)
		// return dispatch()
	};

export const closeDiff = () => async dispatch => {
	const response = HostApi.sidebarInstance.send(ReviewCloseDiffRequestType, {});
	// if (response.success)
	// return dispatch()
};
