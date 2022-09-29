import React from "react";
import styled, { keyframes, ThemeContext } from "styled-components";
import { CSTheme, PropsWithTheme } from "../../themes";

export type Size = "small" | "normal" | "large";

export interface LabeledSwitchProps {
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

const getRootProps = (props: LabeledSwitchProps): RootProps => ({
	on: Boolean(props.on),
	colored: Boolean(props.colored),
	$height: props.height || 24,
	$width: props.width || 56,
	$disabled: Boolean(props.disabled),
});

const getRootBackgroundColor = (theme: CSTheme, props: RootProps) => {
	if (props.$disabled) return theme.colors.grey2;
	if (props.colored) {
		return props.on ? theme.colors.success : theme.colors.error;
	}
	return props.on ? theme.colors.grey1 : theme.colors.grey2;
};

const Root = styled.div((props: PropsWithTheme<RootProps>) => {
	const backgroundColor = getRootBackgroundColor(props.theme, props);

	const paddingValue = props.$width / 1.8;

	return `
  background-color: ${backgroundColor};
  height: ${props.$height}px;
  max-width: ${props.$width}px;
  padding-left: ${props.on ? 5 : paddingValue}px;
  padding-right: ${props.on ? paddingValue : 5}px;
  position: relative;
  display: flex;
  align-items: center;
  border-radius: 14px;
  cursor: ${props.$disabled ? "not-allowed" : "pointer"};
`;
});

const Knob = styled.div<PropsWithTheme<RootProps>>(props => {
	return `
  transition: all 0.2s;
  border-radius: ${props.$height * 2.2}px;
  position: absolute;
  background-color: ${props.$disabled ? props.theme.colors.grey1 : props.theme.colors.white};
  width: ${props.$width}px;
  height: ${props.$height}px;
  left: ${props.on ? `calc(100% - ${props.$width + 1}px)` : "1px"};
`;
});

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const Label = styled.div<PropsWithTheme<{ visible: boolean; color: string }>>`
	width: 100%;
	height: 100%;
	color: ${props => props.color};
	display: ${props => (props.visible ? "flex" : "none")};
	align-items: center;
	animation: ${fadeIn} 0.3s;
`;

const OffLabel = styled(Label)`
	margin-right: 5px;
	justify-content: flex-end;
`;

const OnLabel = styled(Label)`
	margin-left: 5px;
`;

export function LabeledSwitch(props: LabeledSwitchProps) {
	const rootProps = getRootProps(props);
	const knobHeightWidth = rootProps.$height * 0.9;
	const knobProps = {
		...rootProps,
		$height: knobHeightWidth,
		$width: knobHeightWidth,
	};

	const theme: CSTheme = React.useContext(ThemeContext);

	const [offLabelColor, onLabelColor] = (() => {
		if (props.colored) return [theme.colors.white, theme.colors.white];
		return [theme.colors.white, theme.colors.text];
	})();

	return (
		<Root
			{...rootProps}
			onClickCapture={e => {
				e.preventDefault();
				!rootProps.$disabled && props.onChange && props.onChange(!props.on, e);
			}}
		>
			<Knob {...knobProps} />
			<OnLabel color={onLabelColor} visible={Boolean(props.on)}>
				{props.onLabel}
			</OnLabel>
			<OffLabel color={offLabelColor} visible={!props.on}>
				{props.offLabel}
			</OffLabel>
		</Root>
	);
}
