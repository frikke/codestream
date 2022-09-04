import { IdeState } from "@codestream/webview/store/ide/types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: IdeState = { name: undefined };

// export function reduceIde(state = initialState, action: IdeActions) {
// 	switch (action.type) {
// 		case IdeActionType.Set:
// 			return { ...state, ...action.payload };
// 		default:
// 			return state;
// 	}
// }

const slice = createSlice({
	name: "ide",
	initialState,
	reducers: {
		setIde: (state, action: PayloadAction<IdeState>) => {
			return { ...state, ...action.payload };
		},
	},
});

export default slice.reducer;
