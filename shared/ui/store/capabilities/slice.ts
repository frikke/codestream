import { Capabilities } from "codestream-common/agent-protocol";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface CapabilitiesState extends Capabilities {}

const initialState: CapabilitiesState = {};

const slice = createSlice({
	name: "capabilities",
	initialState,
	reducers: {
		updateCapabilities: (state, action: PayloadAction<CapabilitiesState>) => {
			return { ...state, ...action.payload };
		},
	},
});

export const { updateCapabilities } = slice.actions;
export default slice;
