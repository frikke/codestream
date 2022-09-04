import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface CapabilitiesState {
	[name: string]: any;
}

const initialState: CapabilitiesState = {};

// export function reduceCapabilities(state = initialState, { type, payload }: CapabilitiesActions) {
// 	switch (type) {
// 		case "UPDATE_CAPABILITIES":
// 			return { ...state, ...payload };
// 		default:
// 			return state;
// 	}
// }

const slice = createSlice({
	name: "capabilities",
	initialState,
	reducers: {
		updateCapabilities: (state, action: PayloadAction<CapabilitiesState>) => {
			return { ...state, ...action.payload };
		},
	},
});

export default slice;
