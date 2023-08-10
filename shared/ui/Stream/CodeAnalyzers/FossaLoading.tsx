import React from "react";
import { SkeletonLoader, SkeletonFlexContainer } from "@codestream/webview/Stream/SkeletonLoader";

export const FossaLoading = () => {
	return (
		<>
			<SkeletonLoader style={{ width: "50%", marginLeft: "20px" }} />
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "65%", margin: "0px 10px 3px 40px" }} />
				<SkeletonLoader style={{ width: "6%", margin: "0px 10px 3px 0px" }} />
			</SkeletonFlexContainer>
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "45%", margin: "3px 10px 3px 40px" }} />
				<SkeletonLoader style={{ width: "6%", margin: "3px 10px 3px 0px" }} />
			</SkeletonFlexContainer>
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "45%", margin: "3px 10px 3px 40px" }} />
				<SkeletonLoader style={{ width: "6%", margin: "3px 10px 3px 0px" }} />
			</SkeletonFlexContainer>
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "55%", margin: "3px 10px 3px 40px" }} />
				<SkeletonLoader style={{ width: "6%", margin: "3px 10px 3px 0px" }} />
			</SkeletonFlexContainer>

			<SkeletonLoader style={{ width: "45%", marginLeft: "20px" }} />
			<SkeletonLoader style={{ width: "70%", margin: "3px 10px 3px 40px" }} />
			<SkeletonLoader style={{ width: "60%", margin: "3px 10px 3px 40px" }} />
			<SkeletonLoader style={{ width: "50%", margin: "3px 10px 3px 40px" }} />
			<SkeletonLoader style={{ width: "70%", margin: "3px 10px 3px 40px" }} />
			<SkeletonLoader style={{ width: "65%", margin: "3px 10px 3px 40px" }} />
		</>
	);
};

export const IssuesLoading = () => {
	return (
		<>
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "55%", margin: "3px 10px 3px 40px" }} />
				<SkeletonLoader style={{ width: "6%", margin: "3px 10px 3px 0px" }} />
			</SkeletonFlexContainer>
			<SkeletonFlexContainer>
				<SkeletonLoader style={{ width: "45%", margin: "3px 10px 3px 40px" }} />
				<SkeletonLoader style={{ width: "6%", margin: "3px 10px 3px 0px" }} />
			</SkeletonFlexContainer>
		</>
	);
};
