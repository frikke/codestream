import { darken, lighten } from "polished";
import React from "react";
import styled from "styled-components";
import { CSTheme, isDark, PropsWithTheme } from "../../themes";

export type Size = "small" | "normal" | "large";

export interface SwitchProps {
	onChange?: (on: boolean, event: React.MouseEvent) => void;
	on?: boolean;
	colored?: boolean;
	offLabel?: string;
	onLabel?: string;
	size?: Size;
	width?: number;
	height?: number;
	disabled?: boolean;
}

type RootProps = {
	on: boolean;
	colored: boolean;
	$height: number;
	$width: number;
	$disabled: boolean;
};

const getDimensions = (size?: Size) => {
	switch (size) {
		case "small":
			return { $height: 12, $width: 26 };
		case "large":
			return { $height: 24, $width: 56 };
		default:
			return { $height: 16, $width: 36 };
	}
};
const getRootProps = (props: SwitchProps): RootProps => ({
	on: Boolean(props.on),
	colored: Boolean(props.colored),
	$disabled: Boolean(props.disabled),
	...getDimensions(props.size),
});

const getRootBackgroundColor = (theme: CSTheme, props: RootProps) => {
	if (props.$disabled) {
		return "rgba(127, 127, 127, 0.25)";
	}
	if (props.colored) {
		return props.on ? theme.colors.success : theme.colors.error;
	}
	const onColor = "rgba(127, 127, 127, 0.85)";
	const offColor = "rgba(127, 127, 127, 0.25)";

	return props.on ? onColor : offColor;
};

const Root = styled.span((props: PropsWithTheme<RootProps>) => {
	const backgroundColor = getRootBackgroundColor(props.theme, props);

	return `
  background-color: ${backgroundColor};
  height: ${props.$height}px;
  width: ${props.$width}px;
  position: relative;
  display: flex;
  align-items: center;
  border-radius: 14px;
  cursor: ${props.$disabled ? "not-allowed" : "pointer"};
`;
});

const getKnobBackgroundColor = (props: PropsWithTheme<RootProps>) => {
	return props.$disabled
		? isDark(props.theme.colors.baseBackground)
			? darken(0.2, props.theme.colors.text)
			: lighten(0.6, props.theme.colors.text)
		: props.theme.colors.text;
};

const Knob = styled.span<PropsWithTheme<RootProps>>(props => {
	return `
  transition: all 0.2s;
  border-radius: ${props.$height * 2.2}px;
  position: absolute;
  background-color: ${getKnobBackgroundColor(props)};
  width: ${props.$width}px;
  height: ${props.$height}px;
  left: ${props.on ? `calc(100% - ${props.$width + 1}px)` : "1px"};
`;
});

export function Switch(props: SwitchProps) {
	const rootProps = getRootProps(props);
	const knobHeightWidth = rootProps.$height * 0.9;
	const knobProps = {
		...rootProps,
		$height: knobHeightWidth,
		$width: knobHeightWidth,
	};
	return (
		<Root
			{...rootProps}
			onClickCapture={e => {
				e.preventDefault();
				!rootProps.$disabled && props.onChange && props.onChange(!props.on, e);
			}}
		>
			<Knob {...knobProps} />
		</Root>
	);
}
