import { darken, lighten, readableColor, rgba } from "polished";

export type PropsWithTheme<P = any> = { theme: CSTheme } & P;

const Colors = {
	White: "#ffffff",
	Black: "#1e1e1e",
} as const;

export const lightTheme: CSTheme = {
	colors: {
		text: rgba("#333333", 0.8),
		textHighlight: "#333333",
		textSubtle: rgba("#333333", 0.6),
		appBackground: Colors.White,
		baseBackground: darken(0.03, Colors.White),
		baseBorder: darken(0.1, Colors.White),
		grey1: "#c4c4c4",
		grey2: "#787878",
		white: "#ffffff",
		success: "#7aba5d",
		error: "#d9634f",
	},
	fontSizes: {
		normal: "16px",
		small: "14px",
		large: "18px",
	},
};

export const darkTheme: CSTheme = {
	colors: {
		text: rgba("#c7c7c6", 0.8),
		textHighlight: "#c7c7c6",
		textSubtle: rgba("#c7c7c6", 0.6),
		appBackground: Colors.Black,
		baseBackground: lighten(0.04, Colors.Black),
		baseBorder: lighten(0.1, "#1e1e1e"),
		grey1: "#6c757d",
		grey2: "#343a40",
		white: "#f8f9fa",
		success: "#7aba5d",
		error: "#d9634f",
	},
	fontSizes: {
		normal: "16px",
		small: "14px",
		large: "18px",
	},
};

export interface CSTheme {
	fontSizes: {
		normal: string;
		small: string;
		large: string;
	};
	colors: {
		text: string;
		textHighlight: string;
		textSubtle: string;
		appBackground: string;
		baseBackground: string;
		baseBorder: string;
		success: string;
		error: string;
		grey1: string;
		grey2: string;
		white: string;
	};
}

export function isDark(color: string): boolean {
	try {
		const colorResult = readableColor(color, "false", "true", true);
		return JSON.parse(colorResult);
	} catch (x0) {
		try {
			// try again but without strict mode enabled
			const colorResult = readableColor(color, "false", "true", false);
			return JSON.parse(colorResult);
		} catch (x1) {}
		return false;
	}
}

export function isDarkTheme(theme: CSTheme) {
	return isDark(theme.colors.baseBackground);
}

export function createTheme(): CSTheme {
	const computedStyle = getComputedStyle(document.body);
	const fontSize = parseValue(computedStyle.getPropertyValue("--font-size").trim());

	return {
		colors: {
			...darkTheme.colors,
			text: computedStyle.getPropertyValue("--text-color").trim() || darkTheme.colors.text,
			textHighlight: computedStyle.getPropertyValue("--text-color-highlight").trim(),
			textSubtle: computedStyle.getPropertyValue("--text-color-subtle").trim(),
			appBackground:
				computedStyle.getPropertyValue("--app-background-color").trim() ||
				darkTheme.colors.appBackground,
			baseBackground:
				computedStyle.getPropertyValue("--base-background-color").trim() ||
				darkTheme.colors.baseBackground,
			baseBorder: computedStyle.getPropertyValue("--base-border-color").trim(),
		},
		fontSizes: {
			large: `${fontSize + 2}px`,
			normal: `${fontSize}px`,
			small: `${fontSize - 2}px`,
		},
	};
}

function parseValue(str: string): number {
	const [value] = str.match(/(\d+)/) || ["0"];

	return parseInt(value, 10);
}
