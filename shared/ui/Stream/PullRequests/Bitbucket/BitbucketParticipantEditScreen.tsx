import React, { useState } from "react";
import { Modal } from "../../Modal";
import { FetchThirdPartyPullRequestPullRequest } from "@codestream/protocols/agent";
import { Dialog } from "@codestream/webview/src/components/Dialog";
import { InlineMenu } from "@codestream/webview/src/components/controls/InlineMenu";
import Button from "../../Button";
import { api } from "../../../store/providerPullRequests/thunks";
import { useAppDispatch } from "@codestream/webview/utilities/hooks";

interface Props {
	pr: FetchThirdPartyPullRequestPullRequest;
	onClose: Function;
	isAddReviewer: boolean;
}

export const BitbucketParticipantEditScreen = (props: Props) => {
	const pr = props;
	const dispatch = useAppDispatch();
	const [isAdd, setIsAdd] = useState(props.isAddReviewer);
	const [reviewerSelection, setReviewerSelection] = useState("Select reviewer");
	const [reviewerId, setReviewerId] = useState("");
	const [error, setError] = useState("");

	const removeRevieweritems = () => {
		let itemsMap;
		if (props.pr.reviewers?.nodes.length) {
			itemsMap = props.pr.reviewers?.nodes.map(_ => {
				return {
					label: _.user.display_name,
					key: _.user.account_id,
					action: () => {
						setReviewerId(_.user.account_id);
						setReviewerSelection(_.user.display_name);
					},
				};
			});
		} else {
			itemsMap = [];
		}
		return itemsMap;
	};

	const getRemoveReviewerItems = removeRevieweritems();

	const addReviewerItems = () => {
		let itemsMap;
		if (props.pr.members.nodes.length) {
			itemsMap = props.pr.members.nodes.map(_ => {
				if (_.user.account_id !== pr.pr.author.id) {
					return {
						label: _.user.display_name,
						key: _.user.account_id,
						action: () => {
							setReviewerId(_.user.account_id);
							setReviewerSelection(_.user.display_name);
						},
					};
				} else {
					return {
						label: "",
						key: _.user.account_id,
						action: () => {},
					};
				}
			});
		} else {
			itemsMap = [];
		}
		return itemsMap;
	};

	const getAddReviewerItems = addReviewerItems();

	const removeReviewer = async () => {
		(await dispatch(
			api({
				method: "removeReviewerFromPullRequest",
				params: {
					reviewerId: reviewerId,
					pullRequestId: props.pr.id,
					fullname: props.pr.repository.nameWithOwner,
				},
			})
		)) as any;
		return props.onClose();
	};

	const addReviewer = async () => {
		(await dispatch(
			api({
				method: "addReviewerToPullRequest",
				params: {
					reviewerId: reviewerId,
					pullRequestId: props.pr.id,
					fullname: props.pr.repository.nameWithOwner,
				},
			})
		)) as any;
		return props.onClose();
	};

	return (
		<Modal translucent>
			{!isAdd ? (
				<>
					<Dialog
						narrow
						title="Remove reviewers"
						onClose={() => {
							props.onClose();
						}}
					>
						<div className="standard-form">
							<fieldset className="form-body">
								<div id="controls">
									{/* {reviewerError && <WarningBox items={[{ message: reviewerError }]}></WarningBox>} */}
									<div style={{ margin: "20px 0" }}>
										<div className="controls">
											<InlineMenu items={getRemoveReviewerItems}>{reviewerSelection}</InlineMenu>
											<div style={{ height: "10px" }} />
										</div>
									</div>
									<Button onClick={removeReviewer}>Remove</Button>
								</div>
							</fieldset>
						</div>
					</Dialog>
				</>
			) : (
				<>
					<Dialog
						narrow
						title="Add reviewers"
						onClose={() => {
							props.onClose();
						}}
					>
						<div className="standard-form">
							<fieldset className="form-body">
								<div id="controls">
									{/* {reviewerError && <WarningBox items={[{ message: reviewerError }]}></WarningBox>} */}
									<div style={{ margin: "20px 0" }}>
										<div className="controls">
											<InlineMenu items={getAddReviewerItems}>{reviewerSelection}</InlineMenu>
											<div style={{ height: "10px" }} />
										</div>
									</div>
									<Button onClick={addReviewer}>Add</Button>
								</div>
							</fieldset>
						</div>
					</Dialog>
				</>
			)}
		</Modal>
	);
};
