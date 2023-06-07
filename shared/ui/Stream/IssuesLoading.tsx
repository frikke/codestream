import React from "react";
import { SkeletonLoader, SkeletonFlexContainer } from "@codestream/webview/Stream/SkeletonLoader";

export const IssuesLoading = () => {
	return (
		<>
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "75%", margin: "0px 10px 3px 20px" }} />
				<SkeletonLoader style={{ width: "6%", margin: "0px 10px 3px 0px" }} />
			</SkeletonFlexContainer>
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "65%", margin: "3px 10px 3px 20px" }} />
				<SkeletonLoader style={{ width: "6%", margin: "3px 10px 3px 0px" }} />
			</SkeletonFlexContainer>
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "65%", margin: "3px 10px 3px 20px" }} />
				<SkeletonLoader style={{ width: "6%", margin: "3px 10px 3px 0px" }} />
			</SkeletonFlexContainer>
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "55%", margin: "3px 10px 3px 20px" }} />
				<SkeletonLoader style={{ width: "6%", margin: "3px 10px 3px 0px" }} />
			</SkeletonFlexContainer>
		</>
	);
};
