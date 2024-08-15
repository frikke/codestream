import React from "react";
import styled from "styled-components";
import Icon from "../Stream/Icon";

const Main = styled.main``;

const TimelineWrapper = styled.div`
	padding: 1rem 3rem;
`;

const TimelineContent = styled.div`
	padding-left: 25.6px;
	border-left: 3px solid var(--base-border-color);

	&:last-child .tl-body {
		border-left: 3px solid transparent;
	}
`;

const TimelineHeader = styled.div`
	position: relative;
	display: grid;
`;

const TimelineTitle = styled.h2`
	font-weight: 600;
	border-bottom: 1px solid var(--base-border-color);
	padding-bottom: 2px;
	margin-bottom: 0.2em;
`;

const TimelineMarker = styled.span`
	display: block;
	position: absolute;
	width: 14px;
	height: 14px;
	border-radius: 50% / 50%;
	background: var(--base-border-color);
	left: -2.56rem;
	top: 50%;
	transform: translate(50%, -50%);
`;

const TimelineDate = styled.div`
	font-size: smaller;
	font-style: italic;
`;

const Update = styled.div``;
const UpdateTitle = styled.h3`
	margin-bottom: 6px;
`;
const UpdateItem = styled.div`
	margin-bottom: 4px;
`;

const ListContainer = styled.ul`
	margin-top: 2px;
	padding-left: 20px;
`;

export const WhatsNewPanel = () => {
	return (
		<TimelineWrapper>
			<h1>
				<Icon
					style={{
						transform: "scale(2)",
						display: "inline-block",
						marginRight: "15px",
						top: "15px",
					}}
					name="newrelic"
				/>
				What's New
			</h1>
			<TimelineContent>
				<TimelineHeader>
					<TimelineMarker />
					<TimelineTitle>15.10.0</TimelineTitle>
					<TimelineDate>June 20, 2024</TimelineDate>
				</TimelineHeader>
				<div className="tl-body">
					<Update>
						<UpdateTitle>Service Search</UpdateTitle>
						<UpdateItem>
							You can now search for any APM, browser, mobile or OTel service to see how it's performing, without needing to have the repository open in your IDE.
						</UpdateItem>
						<UpdateItem>
							<img src="https://images.codestream.com/misc/WN-service-search.png" />
						</UpdateItem>
					</Update>
				</div>
			</TimelineContent>
			<TimelineContent>
				<TimelineHeader>
					<TimelineMarker />
					<TimelineTitle>15.6.0</TimelineTitle>
					<TimelineDate>April 4, 2024</TimelineDate>
				</TimelineHeader>
				<div className="tl-body">
					<Update>
						<UpdateTitle>Support for Infra logs and log partitions</UpdateTitle>
						<UpdateItem>
							You can now search for logs from any entity type, and leverage your log partitions as well. Just select the
							appropriate entity from the dropdown at the top of the log search page, and the appropriate partition.
						</UpdateItem>
						<UpdateItem>
							<img src="https://images.codestream.com/misc/WN-infra-logs.png" />
						</UpdateItem>
					</Update>
					<Update>
						<UpdateTitle>Updated Tree View</UpdateTitle>
						<UpdateItem>
							Repository is now the top level in the tree view in the CodeStream pane, allowing you to view
							observability data for services built from any of the repositories you have open in your IDE, regardles
							of which files you have open.
						</UpdateItem>
					</Update>
				</div>
			</TimelineContent>
		</TimelineWrapper>
	);
};
