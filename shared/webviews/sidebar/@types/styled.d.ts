import "styled-components";

declare module "styled-components" {
	export interface DefaultTheme {
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
		breakpoint?: string;
	}
}
