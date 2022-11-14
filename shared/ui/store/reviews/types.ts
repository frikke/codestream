import { CSReview } from "codestream-common/api-protocol";

import { Index } from "../common";

export enum ReviewsActionsTypes {
	AddReviews = "ADD_REVIEWS",
	SaveReviews = "@reviews/SaveReviews",
	UpdateReviews = "@reviews/UpdateReviews",
	Delete = "@reviews/Delete",
	Bootstrap = "@reviews/Bootstrap",
}

export type ReviewsState = {
	bootstrapped: boolean;
	reviews: Index<CSReview>;
};
