import {
	CreateShareableReviewRequestType,
	CreateThirdPartyPostRequestType,
	GetReviewRequestType,
	UpdatePostSharingDataRequestType,
	UpdateReviewRequestType,
	UpdateReviewResponse,
} from "@codestream/protocols/agent";
import {
	ReviewCheckpoint,
	ReviewCloseDiffRequestType,
	ReviewShowDiffRequestType,
} from "@codestream/protocols/webview";
import { logError } from "@codestream/webview/logger";
import { CodeStreamState } from "@codestream/webview/store";
import { addPosts } from "@codestream/webview/store/posts/actions";
import { getConnectedProviders } from "@codestream/webview/store/providers/reducer";
import {
	addReviews,
	CreateReviewError,
	EditableAttributes,
	NewReviewAttributes,
	saveReviews,
	updateReviews,
} from "@codestream/webview/store/reviews/actions";
import { addStreams } from "@codestream/webview/store/streams/actions";
import { getTeamMembers } from "@codestream/webview/store/users/reducer";
import { createPost } from "@codestream/webview/Stream/actions";
import { phraseList } from "@codestream/webview/utilities/strings";
import { capitalize, mapFilter } from "@codestream/webview/utils";
import { HostApi } from "@codestream/webview/webview-api";

export const createReview =
	(attributes: NewReviewAttributes) => async (dispatch, getState: () => CodeStreamState) => {
		const { accessMemberIds, ...rest } = attributes;

		try {
			const response = await HostApi.instance.send(CreateShareableReviewRequestType, {
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
						const { post, ts, permalink } = await HostApi.instance.send(
							CreateThirdPartyPostRequestType,
							{
								providerId: attributes.sharingAttributes.providerId,
								channelId: attributes.sharingAttributes.channelId,
								providerTeamId: attributes.sharingAttributes.providerTeamId,
								text: rest.text,
								review: response.review,
								mentionedUserIds: attributes.mentionedUserIds,
							}
						);
						if (ts) {
							await HostApi.instance.send(UpdatePostSharingDataRequestType, {
								postId: response.post.id,
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
						HostApi.instance.track("Shared Review", {
							Destination: capitalize(
								getConnectedProviders(getState()).find(
									config => config.id === attributes.sharingAttributes!.providerId
								)!.name
							),
							"Review Status": "New",
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

export const editReview =
	(id: string, attributes: EditableAttributes, replyText?: string) =>
	async (dispatch, getState: () => CodeStreamState) => {
		let response: UpdateReviewResponse | undefined;
		try {
			response = await HostApi.instance.send(UpdateReviewRequestType, {
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
		} catch (error) {
			logError(error, { detail: `failed to update review`, id });
		}
		return response;
	};

export const fetchReview = (reviewId: string) => async dispatch => {
	const response = await HostApi.instance.send(GetReviewRequestType, { reviewId });

	if (response.review) return dispatch(saveReviews([response.review]));
};

export const showDiff =
	(reviewId: string, checkpoint: ReviewCheckpoint, repoId: string, path: string) =>
	async dispatch => {
		const response = HostApi.instance.send(ReviewShowDiffRequestType, {
			reviewId,
			checkpoint,
			repoId,
			path,
		});
		// if (response.success)
		// return dispatch()
	};

export const closeDiff = () => async dispatch => {
	const response = HostApi.instance.send(ReviewCloseDiffRequestType, {});
	// if (response.success)
	// return dispatch()
};
