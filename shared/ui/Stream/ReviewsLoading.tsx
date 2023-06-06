import React from "react";
import { SkeletonLoader } from "@codestream/webview/Stream/SkeletonLoader";

export const ReviewsLoading = () => {
	return (
		<>
			<SkeletonLoader style={{ width: "15%", marginLeft: "20px" }} />
			<SkeletonLoader style={{ width: "25%", marginLeft: "20px" }} />
			<SkeletonLoader style={{ width: "30%", marginLeft: "20px" }} />
			<div style={{ display: "flex", justifyContent: "space-between" }}>
				<SkeletonLoader style={{ width: "45%", margin: "0px 10px 3px 40px" }} />
				<SkeletonLoader style={{ width: "6%", margin: "0px 10px 3px 0px" }} />
			</div>
			<div style={{ display: "flex", justifyContent: "space-between" }}>
				<SkeletonLoader style={{ width: "35%", margin: "3px 10px 3px 40px" }} />
				<SkeletonLoader style={{ width: "6%", margin: "3px 10px 3px 0px" }} />
			</div>
		</>
	);
};
