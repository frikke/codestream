import {
	DeleteReviewRequestType,
	FetchReviewsRequestType,
	RepoScmStatus,
} from "@codestream/protocols/agent";
import { Attachment, CSRepoChange, CSReview } from "@codestream/protocols/api";
import { ReviewCheckpoint } from "@codestream/protocols/webview";
import { logError } from "@codestream/webview/logger";
import { HostApi } from "@codestream/webview/webview-api";
import { action } from "../common";
import { ReviewsActionsTypes } from "./types";

export const reset = () => action("RESET");

export const _bootstrapReviews = (reviews: CSReview[]) =>
	action(ReviewsActionsTypes.Bootstrap, reviews);

export const bootstrapReviews = () => async dispatch => {
	const { reviews } = await HostApi.instance.send(FetchReviewsRequestType, {});
	dispatch(_bootstrapReviews(reviews));
};

export const addReviews = (reviews: CSReview[]) => action(ReviewsActionsTypes.AddReviews, reviews);

export const saveReviews = (reviews: CSReview[]) =>
	action(ReviewsActionsTypes.SaveReviews, reviews);

export const updateReviews = (reviews: CSReview[]) =>
	action(ReviewsActionsTypes.UpdateReviews, reviews);

export interface NewReviewAttributes {
	title: string;
	text: string;
	reviewers: string[];
	allReviewersMustApprove?: boolean;
	authorsById: { [authorId: string]: { stomped: number; commits: number } };
	tags: string[];

	// these changes will be massaged into a changeSet
	repoChanges: {
		scm: RepoScmStatus;
		startCommit: string;
		excludeCommit: string;
		excludedFiles: string[];
		// we have to pass these separately because
		// git diff isn't smart enough to be able to
		// show diffs for untracked files
		newFiles: string[];
		includeSaved: boolean;
		includeStaged: boolean;
		remotes: { name: string; url: string }[];
		checkpoint: ReviewCheckpoint;
	}[];

	accessMemberIds: string[];
	sharingAttributes?: {
		providerId: string;
		providerTeamId: string;
		providerTeamName?: string;
		channelId: string;
		channelName?: string;
	};
	mentionedUserIds?: string[];
	addedUsers?: string[];
	entryPoint?: string;
	files?: Attachment[];
}

export interface CreateReviewError {
	reason: "share" | "create";
	message?: string;
}

export const _deleteReview = (id: string) => action(ReviewsActionsTypes.Delete, id);

export const deleteReview = (id: string) => async dispatch => {
	try {
		await HostApi.instance.send(DeleteReviewRequestType, {
			id,
		});
		dispatch(_deleteReview(id));
	} catch (error) {
		logError(error, { detail: `failed to delete review`, id });
	}
};

/**
 * "Advanced" properties that can come from the client (webview)
 */
interface AdvancedEditableReviewAttributes {
	repoChanges?: CSRepoChange[];
	// array of userIds / tags to add
	$push: { reviewers?: string[]; tags?: string[] };
	// array of userIds / tags to remove
	$pull: { reviewers?: string[]; tags?: string[] };
}

export type EditableAttributes = Partial<
	Pick<CSReview, "tags" | "text" | "title" | "reviewers" | "allReviewersMustApprove"> &
		AdvancedEditableReviewAttributes
>;

export interface NewCodeErrorAttributes {
	title: string;
	stackTrace: string;
}
