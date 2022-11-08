import { CodeStreamState } from "@codestream/webview/store";
import Tooltip from "@codestream/webview/Stream/Tooltip";
import { useAppSelector } from "@codestream/webview/utilities/hooks";
import React, { PropsWithChildren } from "react";
import { OpenUrlRequestType } from "../ipc/host.protocol";
import { HostApi } from "../webview-api";

interface Props {
	href?: string;
	onClick?(event: React.SyntheticEvent): void;
	className?: string;
	useStopPropagation?: boolean;
	disabled?: boolean;
	disabledHover?: string;
}

export const Link = React.memo((props: PropsWithChildren<Props>) => {
	const derivedState = useAppSelector((state: CodeStreamState) => {
		return { useHref: props.href && state.capabilities.openLink };
	});

	const href = derivedState.useHref ? props.href : undefined;

	const onClick =
		props.onClick ||
		function (event: React.MouseEvent) {
			const target = event.target as HTMLAnchorElement;
			if (!target.href) {
				event.preventDefault();
				if (props.useStopPropagation) {
					event.stopPropagation();
				}
				if (props.href) {
					HostApi.instance.send(OpenUrlRequestType, { url: props.href });
				}
			}
		};

	return (
		<React.Fragment key={String(props.disabled)}>
			{props.disabled === true ? (
				<Tooltip content={props.disabledHover} placement={"bottom"}>
					<span className={props.className} style={{ textDecoration: "underline" }}>
						{props.children}
					</span>
				</Tooltip>
			) : (
				<a href={href} onClickCapture={onClick} className={props.className}>
					{props.children}
				</a>
			)}
		</React.Fragment>
	);
});
