import { useAppDispatch, useAppSelector } from "../utilities/hooks";
import React, { useState } from "react";
import { CodeStreamState } from "../store";
import { closeModal } from "./actions";
import ScrollBox from "./ScrollBox";
import { Dialog } from "../src/components/Dialog";
import Button from "./Button";
import { useDidMount } from "../utilities/hooks";
import { RadioGroup, Radio } from "../src/components/RadioGroup";
import { setUserPreference } from "../Stream/actions";
import { setRefreshAnomalies } from "../store/context/actions";
import { HostApi } from "../webview-api";
import { isEmpty as _isEmpty } from "lodash-es";
import { GetDeploymentsRequestType, GetDeploymentsResponse } from "@codestream/protocols/agent";

export const CLMSettings = () => {
	const dispatch = useAppDispatch();
	const derivedState = useAppSelector((state: CodeStreamState) => {
		const clmSettings = state.preferences.clmSettings || {};
		const activeO11y = state.preferences.activeO11y;
		const currentO11yRepoId = state.preferences.currentO11yRepoId;
		return {
			clmSettings,
			activeO11y,
			currentO11yRepoId,
		};
	});
	const { clmSettings } = derivedState;
	const [isChangeTrackingEnabled, setIsChangeTrackingEnabled] = useState(
		clmSettings.isChangeTrackingEnabled || false
	);
	const [changeTrackingRadioValue, setChangeTrackingRadioValue] = useState(
		clmSettings.changeTrackingRadioValue || "LATEST_RELEASE"
	);
	const [compareDataLastValue, setCompareDataLastValue] = useState(
		clmSettings.compareDataLastValue || "7"
	);
	const [compareDataLastReleaseValue, setCompareDataLastReleaseValue] = useState(
		clmSettings.compareDataLastReleaseValue || "7"
	);
	const [againstDataPrecedingValue, setAgainstDataPrecedingValue] = useState(
		clmSettings.againstDataPrecedingValue || "21"
	);
	const [minimumChangeValue, setMinimumChangeValue] = useState(
		clmSettings.minimumChangeValue || "10"
	);
	const [minimumBaselineValue, setMinimumBaselineValue] = useState(
		clmSettings.minimumBaselineValue || "30"
	);
	const [minimumErrorRateValue, setMinimumErrorRateValue] = useState(
		clmSettings.minimumErrorRateValue || "1"
	);
	const [minimumAverageDurationValue, setMinimumAverageDurationValue] = useState(
		clmSettings.minimumAverageDurationValue || "10"
	);

	useDidMount(() => {
		const entityGuid = derivedState?.activeO11y?.[derivedState?.currentO11yRepoId || ""];

		if (entityGuid) {
			HostApi.instance
				.send(GetDeploymentsRequestType, { entityGuid })
				.then((_: GetDeploymentsResponse) => {
					if (!_isEmpty(_?.deployments)) {
						setIsChangeTrackingEnabled(true);
					} else {
						setIsChangeTrackingEnabled(false);
					}
					setUserPreference({
						prefPath: ["clmSettings"],
						value: {
							["isChangeTrackingEnabled"]: isChangeTrackingEnabled,
						},
					});
				})
				.catch(ex => {
					console.error("ERROR: GetDeploymentsRequestType", ex);
				});
		}
	});

	const handleClickSubmit = () => {
		dispatch(
			setUserPreference({
				prefPath: ["clmSettings"],
				value: {
					["isChangeTrackingEnabled"]: isChangeTrackingEnabled,
					["compareDataLastValue"]: compareDataLastValue,
					["againstDataPrecedingValue"]: againstDataPrecedingValue,
					["minimumChangeValue"]: minimumChangeValue,
					["minimumBaselineValue"]: minimumBaselineValue,
					["minimumErrorRateValue"]: minimumErrorRateValue,
					["minimumAverageDurationValue"]: minimumAverageDurationValue,
				},
			})
		);
		dispatch(setRefreshAnomalies(true));

		dispatch(closeModal());
	};

	const handleNumberChange = e => {
		let { value, min, max, name } = e.target;
		value = Math.max(Number(min), Math.min(Number(max), Number(value)));
		switch (name) {
			case "min-change":
				setMinimumChangeValue(value);
				break;
			case "min-baseline":
				setMinimumBaselineValue(value);
				break;
			case "min-error-rate":
				setMinimumErrorRateValue(value);
				break;
			case "min-average-duration":
				setMinimumAverageDurationValue(value);
				break;
			case "compare-last":
				setCompareDataLastValue(value);
				break;
			case "compare-last-release":
				setCompareDataLastReleaseValue(value);
				break;
			case "against-preceding":
				setAgainstDataPrecedingValue(value);
				break;
			default:
				throw new Error("Invalid input name");
		}
	};

	return (
		<Dialog wide title="Code-Level Metrics Settings" onClose={() => dispatch(closeModal())}>
			<ScrollBox>
				<form className="standard-form vscroll">
					<fieldset className="form-body">
						<div id="controls">
							{!isChangeTrackingEnabled && (
								<>
									<div style={{ display: "flex", marginTop: "10px" }}>
										<div>Compare data from the last:</div>
										<div style={{ marginLeft: "auto" }}>
											<input
												name="compare-last"
												type="number"
												min="1"
												max="100"
												value={compareDataLastValue}
												onChange={e => handleNumberChange(e)}
											/>{" "}
											days
										</div>
									</div>
									<div style={{ display: "flex", marginTop: "5px" }}>
										<div>Against data from the preceding:</div>
										<div style={{ marginLeft: "auto" }}>
											<input
												name="against-preceding"
												type="number"
												min="1"
												max="100"
												value={againstDataPrecedingValue}
												onChange={e => handleNumberChange(e)}
											/>{" "}
											days
										</div>
									</div>
									<div>
										<span style={{ fontSize: "smaller" }}>
											Set up{" "}
											<a href="https://docs.newrelic.com/docs/change-tracking/change-tracking-introduction/">
												change tracking
											</a>{" "}
											to compare across releases
										</span>
									</div>
								</>
							)}
							{isChangeTrackingEnabled && (
								<>
									<RadioGroup
										selectedValue={changeTrackingRadioValue}
										onChange={value => setChangeTrackingRadioValue(value)}
										name="change-tracking"
									>
										<div style={{ display: "flex", margin: "10px 0 5px 0" }}>
											<div style={{ width: "100%", marginRight: "5px" }}>
												<Radio value="LATEST_RELEASE">
													Compare data from the most recent release that is at least:
												</Radio>
											</div>
											<div style={{ marginLeft: "auto", minWidth: "112px" }}>
												<input
													name="compare-last-release"
													type="number"
													min="1"
													max="100"
													value={compareDataLastReleaseValue}
													onChange={e => handleNumberChange(e)}
												/>{" "}
												days ago
											</div>
										</div>
										<div style={{ display: "flex" }}>
											<div style={{ width: "100%", marginRight: "5px" }}>
												<Radio value="LATEST_DAYS">Compare data from the last: </Radio>
											</div>
											<div style={{ marginLeft: "auto", minWidth: "86px" }}>
												<input
													name="compare-last"
													type="number"
													min="1"
													max="100"
													value={compareDataLastValue}
													onChange={e => handleNumberChange(e)}
												/>{" "}
												days
											</div>
										</div>
									</RadioGroup>
									<div style={{ display: "flex" }}>
										<div>Against data from the preceding:</div>
										<div style={{ marginLeft: "auto" }}>
											<input
												name="against-preceding"
												type="number"
												min="1"
												max="100"
												value={againstDataPrecedingValue}
												onChange={e => handleNumberChange(e)}
											/>{" "}
											days
										</div>
									</div>
								</>
							)}
							<div style={{ marginTop: "20px", display: "flex" }}>
								<div>Minimum change to be anomalous:</div>
								<div style={{ marginLeft: "auto" }}>
									<input
										name="min-change"
										type="number"
										min="1"
										max="100"
										value={minimumChangeValue}
										onChange={e => handleNumberChange(e)}
									/>
								</div>
								<div style={{ marginLeft: "5px", width: "24px", paddingTop: "2px" }}>%</div>
							</div>
							<div style={{ marginTop: "5px", display: "flex" }}>
								<div>Minimum sample size:</div>
								<div style={{ marginLeft: "auto" }}>
									<input
										name="min-baseline"
										type="number"
										min="1"
										max="100"
										value={minimumBaselineValue}
										onChange={e => handleNumberChange(e)}
									/>
								</div>
								<div style={{ marginLeft: "5px", width: "24px", paddingTop: "2px" }}>rpm</div>
							</div>
							<div style={{ marginTop: "5px", display: "flex" }}>
								<div>Minimum error rate:</div>
								<div style={{ marginLeft: "auto" }}>
									<input
										name="min-error-rate"
										type="number"
										min="1"
										max="100"
										value={minimumErrorRateValue}
										onChange={e => handleNumberChange(e)}
									/>
								</div>
								<div style={{ marginLeft: "5px", width: "24px", paddingTop: "2px" }}>%</div>
							</div>
							<div style={{ marginTop: "5px", display: "flex" }}>
								<div>Minimum average duration:</div>
								<div style={{ marginLeft: "auto" }}>
									<input
										name="min-average-duration"
										type="number"
										min="1"
										max="100"
										value={minimumAverageDurationValue}
										onChange={e => handleNumberChange(e)}
									/>
								</div>
								<div style={{ marginLeft: "5px", width: "24px", paddingTop: "2px" }}>ms</div>
							</div>
							<div style={{ margin: "30px 0 10px 0" }} className="button-group">
								<Button
									style={{ width: "100px" }}
									className="control-button cancel"
									type="button"
									onClick={() => dispatch(closeModal())}
								>
									Cancel
								</Button>
								<Button
									style={{ width: "100px" }}
									className="control-button"
									type="button"
									loading={false}
									onClick={() => handleClickSubmit()}
								>
									Submit
								</Button>
							</div>
						</div>
					</fieldset>
				</form>
			</ScrollBox>
		</Dialog>
	);
};
