import { IdeState } from "@codestream/sidebar/store/ide/types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: IdeState = { name: undefined };

const slice = createSlice({
	name: "ide",
	initialState,
	reducers: {
		setIde: (state, action: PayloadAction<IdeState>) => {
			if (action.payload.name) {
				action.payload.name = action.payload.name.toUpperCase();
			}
			return action.payload;
		},
	},
});

export const { setIde } = slice.actions;
export default slice.reducer;
