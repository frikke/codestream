import React from "react";
import Icon from "./Icon";
import { HealthIcon } from "@codestream/webview/src/components/HealthIcon";
import styled from "styled-components";

interface Props {}

const Container = styled.div`
	opacity: 0.2;
	cursor: default;
	margin-top: 10px;
`;

const StyledSpan = styled.span`
	margin-left: 2px;
	margin-right: 5px;
`;

export const ObservabilityPreview = React.memo((props: Props) => {
	return (
		<>
			<Container>
				<div
					style={{
						padding: "2px 10px 2px 20px",
					}}
				>
					<Icon name="chevron-down-thin" />
					<StyledSpan>
						<HealthIcon color={"#9FA5A5"} />
						Sample Service
					</StyledSpan>
				</div>
				<div
					style={{
						padding: "2px 10px 2px 30px",
					}}
				>
					<Icon name="chevron-down-thin" />
					<StyledSpan>Golden Metrics</StyledSpan>
				</div>

				<div
					style={{
						padding: "2px 20px 2px 40px",
						display: "flex",
						justifyContent: "space-between",
					}}
				>
					<div>
						<StyledSpan>Throughput</StyledSpan>
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
						<StyledSpan>Response Time</StyledSpan>
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
						<StyledSpan>Error Rate</StyledSpan>
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
					<StyledSpan>Service Level Objectives</StyledSpan>
				</div>
				<div
					style={{
						padding: "2px 10px 2px 30px",
					}}
				>
					<Icon name="chevron-down-thin" />
					<StyledSpan>Code-Level Metrics</StyledSpan>
				</div>
				<div
					style={{
						padding: "2px 10px 2px 40px",
					}}
				>
					<Icon name="chevron-right-thin" />
					<StyledSpan>Error Rate Increase</StyledSpan>
				</div>
				<div
					style={{
						padding: "2px 10px 2px 40px",
					}}
				>
					<Icon name="chevron-down-thin" />
					<StyledSpan>Average Duration Increase</StyledSpan>
				</div>
				<div
					style={{
						padding: "2px 20px 2px 50px",
						display: "flex",
						justifyContent: "space-between",
					}}
				>
					<div>
						<StyledSpan>api.client.CatFactClient/fetchCatfact</StyledSpan>
					</div>
					<div className="icons">
						<span style={{ color: "red" }} className={"details"}>
							+72%
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
						<StyledSpan>clm.PetFactController/getPetFacts</StyledSpan>
					</div>
					<div className="icons">
						<span style={{ color: "red" }} className={"details"}>
							+66%
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
						<StyledSpan>clm.clmController/dbMethod</StyledSpan>
					</div>
					<div style={{ color: "red" }} className="icons">
						<span className={"details"}>+54%</span>
					</div>
				</div>
				<div
					style={{
						padding: "2px 10px 2px 30px",
					}}
				>
					<Icon name="chevron-right-thin" />
					<StyledSpan>Vulnerabilities</StyledSpan>
				</div>
				<div
					style={{
						padding: "2px 10px 2px 30px",
					}}
				>
					<Icon name="chevron-right-thin" />
					<StyledSpan>Related Services</StyledSpan>
				</div>
				<div
					style={{
						padding: "2px 10px 2px 30px",
					}}
				>
					<Icon name="chevron-right-thin" />
					<StyledSpan>Errors</StyledSpan>
				</div>
			</Container>
		</>
	);
});
