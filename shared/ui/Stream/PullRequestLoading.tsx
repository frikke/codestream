import React from "react";
import { SkeletonLoader } from "@codestream/webview/Stream/SkeletonLoader";

export const PullRequestDetailsLoading = () => {
	return (
		<>
			<SkeletonLoader style={{ width: "35%", marginLeft: "45px" }} />
			<SkeletonLoader style={{ width: "30%", marginLeft: "50px" }} />
			<SkeletonLoader style={{ width: "35%", marginLeft: "50px" }} />
			<SkeletonLoader style={{ width: "45%", marginLeft: "60px", marginBottom: "5px" }} />
		</>
	);
};
