import { AppDispatch } from "@codestream/webview/store";
import { HostApi } from "@codestream/webview/webview-api";
import { NrCapabilitiesState } from "./types";
import { GetNewRelicAIEligibilityRequestType } from "@codestream/protocols/agent";
import { updateNrCapabilities } from "./actions";
import { createAppAsyncThunk } from "../helper";

export const bootstrapNrCapabilities = () => async (dispatch: AppDispatch) => {
	Promise.all([dispatch(getNrCapability("nrai"))]);
};

export const getNrCapability = createAppAsyncThunk<boolean, keyof NrCapabilitiesState>(
	"nrCapabilities/get",
	async (capability, { getState, dispatch }) => {
		const { nrCapabilities } = getState();
		if (nrCapabilities[capability] !== undefined) {
			return !!nrCapabilities[capability];
		}
		let value: boolean;
		switch (capability) {
			case "nrai":
				value = await HostApi.instance.send(GetNewRelicAIEligibilityRequestType, undefined);
				dispatch(updateNrCapabilities({ nrai: value }));
				return value;
		}
	}
);
