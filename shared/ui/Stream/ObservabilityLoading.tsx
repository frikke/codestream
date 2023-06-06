import React from "react";
import { SkeletonLoader } from "@codestream/webview/Stream/SkeletonLoader";

export const ObservabilityLoadingServiceEntity = () => {
	return (
		<>
			<SkeletonLoader style={{ width: "30%", marginLeft: "40px" }} />
			<div style={{ display: "flex", justifyContent: "space-between" }}>
				<SkeletonLoader style={{ width: "20%", margin: "0px 10px 3px 50px" }} />
				<SkeletonLoader style={{ width: "6%", margin: "0px 10px 3px 0px" }} />
			</div>
			<div style={{ display: "flex", justifyContent: "space-between" }}>
				<SkeletonLoader style={{ width: "25%", margin: "3px 10px 3px 50px" }} />
				<SkeletonLoader style={{ width: "6%", margin: "3px 10px 3px 0px" }} />
			</div>
			<div style={{ display: "flex", justifyContent: "space-between" }}>
				<SkeletonLoader style={{ width: "20%", margin: "3px 10px 0px 50px" }} />
				<SkeletonLoader style={{ width: "6%", margin: "3px 10px 0px 0px" }} />
			</div>
			<SkeletonLoader style={{ width: "50%", marginLeft: "40px" }} />
			<SkeletonLoader style={{ width: "20%", marginLeft: "40px" }} />
			<SkeletonLoader style={{ width: "30%", marginLeft: "40px" }} />
			<div style={{ display: "flex", justifyContent: "space-between" }}>
				<SkeletonLoader style={{ width: "55%", margin: "0px 10px 3px 50px" }} />
				<SkeletonLoader style={{ width: "6%", margin: "0px 10px 3px 0px" }} />
			</div>
			<div style={{ display: "flex", justifyContent: "space-between" }}>
				<SkeletonLoader style={{ width: "70%", margin: "3px 10px 3px 50px" }} />
				<SkeletonLoader style={{ width: "6%", margin: "3px 10px 3px 0px" }} />
			</div>
			<div style={{ display: "flex", justifyContent: "space-between" }}>
				<SkeletonLoader style={{ width: "40%", margin: "3px 10px 0px 50px" }} />
				<SkeletonLoader style={{ width: "6%", margin: "3px 10px 0px 0px" }} />
			</div>
			<SkeletonLoader style={{ width: "25%", marginLeft: "40px" }} />
			<SkeletonLoader style={{ width: "30%", marginLeft: "40px" }} />
		</>
	);
};

export const ObservabilityLoadingServiceEntities = () => {
	return (
		<>
			<SkeletonLoader style={{ width: "45%", marginLeft: "20px" }} />
			<SkeletonLoader style={{ width: "35%", marginLeft: "20px" }} />
			<SkeletonLoader style={{ width: "60%", marginLeft: "20px" }} />
			<SkeletonLoader style={{ width: "70%", marginLeft: "20px" }} />
		</>
	);
};
