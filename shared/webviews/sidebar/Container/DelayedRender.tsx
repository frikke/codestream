import React, { useState, useEffect } from "react";

interface Props {
	children: React.ReactNode;
	delay?: number;
}

export function DelayedRender(props: Props) {
	const [shouldRender, setShouldRender] = useState(false);

	useEffect(() => {
		const id = setTimeout(() => {
			setShouldRender(true);
		}, props.delay || 250);
		return () => clearTimeout(id);
	}, []);

	if (!shouldRender) return null;

	return <React.Fragment>{props.children}</React.Fragment>;
}
