import React from "react";

export const HealthIcon = (props: { color: string }) => {
	return (
		<span style={{ color: props.color ?? "white" }}>
			<svg
				style={{ fill: "currentColor", verticalAlign: "middle" }}
				role="presentation"
				xmlns="http://www.w3.org/2000/svg"
				width="18"
				height="18"
				viewBox="0 0 18 18"
				focusable="false"
			>
				<path d="M5.5 2L11 5v6l-5.5 3L0 11V5l5.5-3z"></path>
			</svg>
		</span>
	);
};
