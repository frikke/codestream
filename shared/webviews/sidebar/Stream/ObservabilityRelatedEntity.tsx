import {
	EntityGoldenMetrics,
	GetAlertViolationsResponse,
	GetNewRelicUrlRequestType,
	GetServiceLevelTelemetryRequestType,
	isNRErrorResponse,
	RelatedEntityByType,
} from "@codestream/protocols/agent";
import cx from "classnames";
import React, { useEffect, useState } from "react";

import { OpenUrlRequestType } from "@codestream/sidebar/ipc/sidebar.protocol";
import { HealthIcon } from "@codestream/sidebar/src/components/HealthIcon";
import { HostApi } from "@codestream/sidebar/sidebar-api";
import { PaneNodeName } from "../src/components/Pane";
import { useDidMount, useInterval } from "../utilities/hooks";
import { ALERT_SEVERITY_COLORS } from "./CodeError/index";
import Icon from "./Icon";
import { ObservabilityAlertViolations } from "./ObservabilityAlertViolations";
import { ObservabilityGoldenMetricDropdown } from "./ObservabilityGoldenMetricDropdown";

interface Props {
	relatedEntity: RelatedEntityByType;
	currentRepoId: string;
}

export const ObservabilityRelatedEntity = React.memo((props: Props) => {
	const [expanded, setExpanded] = useState<boolean>(false);
	const [loadingGoldenMetrics, setLoadingGoldenMetrics] = useState<boolean>(true);
	const [entityGoldenMetrics, setEntityGoldenMetrics] = useState<EntityGoldenMetrics>();
	const [entityGoldenMetricsErrors, setEntityGoldenMetricsErrors] = useState<Array<string>>([]);
	const [newRelicUrl, setNewRelicUrl] = useState<string>("");
	const [recentAlertViolations, setRecentAlertViolations] = useState<
		GetAlertViolationsResponse | undefined
	>();

	const { relatedEntity } = props;
	const alertSeverityColor = ALERT_SEVERITY_COLORS[relatedEntity?.alertSeverity];

	useDidMount(() => {
		fetchNewRelicUrl(relatedEntity.guid);
	});

	useEffect(() => {
		if (expanded) {
			HostApi.sidebarInstance.track("Related Service Clicked", {});
			setLoadingGoldenMetrics(true);
			fetchGoldenMetrics(relatedEntity.guid);
		}
	}, [expanded]);

	useInterval(() => {
		if (expanded) {
			fetchGoldenMetrics(relatedEntity.guid);
		}
	}, 300000);

	const fetchNewRelicUrl = async (entityGuid?: string | null) => {
		if (entityGuid) {
			const response = await HostApi.sidebarInstance.send(GetNewRelicUrlRequestType, {
				entityGuid,
			});
			if (response) {
				setNewRelicUrl(response.newRelicUrl);
			}
			setLoadingGoldenMetrics(false);
		}
	};

	const fetchGoldenMetrics = async (entityGuid?: string | null) => {
		if (entityGuid) {
			const response = await HostApi.sidebarInstance.send(GetServiceLevelTelemetryRequestType, {
				newRelicEntityGuid: entityGuid,
				repoId: props.currentRepoId,
				skipRepoFetch: true,
				fetchRecentAlertViolations: true,
			});

			const errors: string[] = [];

			if (isNRErrorResponse(response.entityGoldenMetrics)) {
				errors.push(
					response.entityGoldenMetrics.error.message ?? response.entityGoldenMetrics.error.type
				);
			} else {
				setEntityGoldenMetrics(response.entityGoldenMetrics);
			}

			if (isNRErrorResponse(response.recentAlertViolations)) {
				errors.push(
					response.recentAlertViolations.error.message ?? response.recentAlertViolations.error.type
				);
			} else {
				setRecentAlertViolations(response.recentAlertViolations);
			}

			setEntityGoldenMetricsErrors(errors);

			setLoadingGoldenMetrics(false);
		}
	};

	return (
		<>
			<PaneNodeName
				title={
					<div style={{ display: "flex", alignItems: "center" }}>
						<HealthIcon color={alertSeverityColor} />
						<div>
							<span>{relatedEntity?.name}</span>
							<span className="subtle" style={{ fontSize: "11px", verticalAlign: "bottom" }}>
								{relatedEntity.accountName && relatedEntity.accountName.length > 25
									? relatedEntity.accountName.substr(0, 25) + "..."
									: relatedEntity.accountName}
								{relatedEntity?.domain ? ` (${relatedEntity?.domain})` : ""}
							</span>
						</div>
					</div>
				}
				labelIsFlex={true}
				collapsed={!expanded}
				showChildIconOnCollapse={true}
				actionsVisibleIfOpen={true}
				customPadding={`2px 10px 2px 50px`}
				onClick={() => setExpanded(!expanded)}
			>
				{newRelicUrl && (
					<Icon
						name="globe"
						className={cx("clickable", {
							"icon-override-actions-visible": true,
						})}
						title="View on New Relic"
						placement="bottomLeft"
						delay={1}
						onClick={e => {
							e.preventDefault();
							e.stopPropagation();
							HostApi.sidebarInstance.track("Open Service Summary on NR", {
								Section: "Related Services",
							});
							HostApi.sidebarInstance.send(OpenUrlRequestType, {
								url: newRelicUrl,
							});
						}}
					/>
				)}
			</PaneNodeName>
			{expanded && (
				<>
					<ObservabilityGoldenMetricDropdown
						entityGoldenMetrics={entityGoldenMetrics}
						errors={entityGoldenMetricsErrors}
						loadingGoldenMetrics={loadingGoldenMetrics}
						noDropdown={true}
						entityGuid={relatedEntity.guid}
					/>
					<ObservabilityAlertViolations
						alertViolations={recentAlertViolations?.recentAlertViolations}
					/>
				</>
			)}
		</>
	);
});
