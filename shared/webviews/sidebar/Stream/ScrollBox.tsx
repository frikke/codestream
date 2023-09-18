import React, { PropsWithChildren, useState } from "react";
import createClassString from "classnames";

// this component manages and renders shadow treatments at the
// top and bottom of scrolling divs, indicating that there is
// more content above or below the viewport
export const ScrollBox = (props: PropsWithChildren<{}>) => {
	const rootRef = React.useRef<any>(null);
	const [offTop, setOffTop] = useState(false);
	const [offBottom, setOffBottom] = useState(false);

	const handleScroll = target => {
		if (!target) return;

		if (target.scrollTop > 0) {
			if (!offTop) setOffTop(true);
		} else {
			if (offTop) setOffTop(false);
		}

		if (target.scrollHeight - target.scrollTop > target.clientHeight + 2) {
			if (!offBottom) setOffBottom(true);
		} else {
			if (offBottom) setOffBottom(false);
		}
	};

	// when we re-render because our children are different, they may be a different
	// height, so we need to check if they're taller than the viewport to render
	// the scrolling visual elements
	handleScroll(rootRef && rootRef.current ? rootRef.current.children[0] : null);

	return (
		<div
			ref={rootRef}
			className={createClassString("scrollbox", { "off-top": offTop, "off-bottom": offBottom })}
			style={{ overflow: "hidden", height: "100%" }}
			onScroll={e => handleScroll(e.target)}
		>
			{props.children}
		</div>
	);
};

export default ScrollBox;
