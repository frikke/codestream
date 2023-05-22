import React from "react";
import Icon from "./Icon";
import { HealthIcon } from "@codestream/webview/src/components/HealthIcon";

interface Props {}

export const ObservabilityPreview = React.memo((props: Props) => {
	return (
		<>
			<div style={{ opacity: ".2", cursor: "default", marginTop: "10px" }}>
				<div
					style={{
						padding: "2px 10px 2px 20px",
					}}
				>
					<Icon name="chevron-down-thin" />
					<span style={{ marginLeft: "2px", marginRight: "5px" }}>
						<HealthIcon color={"#9FA5A5"} />
						Sample Service
					</span>
				</div>
				<div
					style={{
						padding: "2px 10px 2px 30px",
					}}
				>
					<Icon name="chevron-down-thin" />
					<span style={{ marginLeft: "2px", marginRight: "5px" }}>Golden Metrics</span>
				</div>

				<div
					style={{
						padding: "2px 20px 2px 40px",
						display: "flex",
						justifyContent: "space-between",
					}}
				>
					<div>
						<span style={{ marginRight: "5px" }}>Throughput</span>
					</div>
					<div className="icons">
						<span className={"details"}>9.35 rpm</span>
					</div>
				</div>
				<div
					style={{
						padding: "2px 20px 2px 40px",
						display: "flex",
						justifyContent: "space-between",
					}}
				>
					<div>
						<span style={{ marginRight: "5px" }}>Response Time</span>
					</div>
					<div className="icons">
						<span className={"details"}>3,413.34 ms</span>
					</div>
				</div>
				<div
					style={{
						padding: "2px 20px 2px 40px",
						display: "flex",
						justifyContent: "space-between",
					}}
				>
					<div>
						<span style={{ marginRight: "5px" }}>Error Rate</span>
					</div>
					<div className="icons">
						<span className={"details"}>0.62 avg</span>
					</div>
				</div>
				<div
					style={{
						padding: "2px 10px 2px 30px",
					}}
				>
					<Icon name="chevron-right-thin" />
					<span style={{ marginLeft: "2px", marginRight: "5px" }}>Service Level Objectives</span>
				</div>
				<div
					style={{
						padding: "2px 10px 2px 30px",
					}}
				>
					<Icon name="chevron-down-thin" />
					<span style={{ marginLeft: "2px", marginRight: "5px" }}>Code-Level Metrics</span>
				</div>
				<div
					style={{
						padding: "2px 10px 2px 40px",
					}}
				>
					<Icon name="chevron-right-thin" />
					<span style={{ marginLeft: "2px", marginRight: "5px" }}>Error Rate Increase</span>
				</div>
				<div
					style={{
						padding: "2px 10px 2px 40px",
					}}
				>
					<Icon name="chevron-down-thin" />
					<span style={{ marginLeft: "2px", marginRight: "5px" }}>Average Duration Increase</span>
				</div>
				<div
					style={{
						padding: "2px 20px 2px 50px",
						display: "flex",
						justifyContent: "space-between",
					}}
				>
					<div>
						<span style={{ marginRight: "5px" }}>api.client.CatFactClient/fetchCatfact</span>
					</div>
					<div className="icons">
						<span style={{ color: "red" }} className={"details"}>
							-72%
						</span>
					</div>
				</div>
				<div
					style={{
						padding: "2px 20px 2px 50px",
						display: "flex",
						justifyContent: "space-between",
					}}
				>
					<div>
						<span style={{ marginRight: "5px" }}>clm.PetFactController/getPetFacts</span>
					</div>
					<div className="icons">
						<span style={{ color: "red" }} className={"details"}>
							-66%
						</span>
					</div>
				</div>
				<div
					style={{
						padding: "2px 20px 2px 50px",
						display: "flex",
						justifyContent: "space-between",
					}}
				>
					<div>
						<span style={{ marginRight: "5px" }}>clm.clmController/dbMethod</span>
					</div>
					<div style={{ color: "red" }} className="icons">
						<span className={"details"}>-54%</span>
					</div>
				</div>
				<div
					style={{
						padding: "2px 10px 2px 30px",
					}}
				>
					<Icon name="chevron-right-thin" />
					<span style={{ marginLeft: "2px", marginRight: "5px" }}>Vulnerabilities</span>
				</div>
				<div
					style={{
						padding: "2px 10px 2px 30px",
					}}
				>
					<Icon name="chevron-right-thin" />
					<span style={{ marginLeft: "2px", marginRight: "5px" }}>Related Services</span>
				</div>
				<div
					style={{
						padding: "2px 10px 2px 30px",
					}}
				>
					<Icon name="chevron-right-thin" />
					<span style={{ marginLeft: "2px", marginRight: "5px" }}>Errors</span>
				</div>
			</div>
		</>
	);
});
