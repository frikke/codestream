import { escapeNrql, LanguageId } from "../newrelic";

export function generateMethodThroughputQuery(
	languageId: LanguageId,
	newRelicEntityGuid: string,
	metricTimesliceNames?: string[],
	codeNamespace?: string
): string {
	const extrapolationsLookup = metricTimesliceNames?.length
		? `name in (${metricTimesliceNames.map(metric => `'${metric}'`).join(",")})`
		: `name LIKE '${codeNamespace}%'`;
	const extrapolationsQuery = `FROM Span SELECT count(*) AS 'sampleSize' WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND ${extrapolationsLookup} FACET name AS metricTimesliceName SINCE 30 minutes AGO LIMIT 100 EXTRAPOLATE`;
	const metricsLookup = metricTimesliceNames?.length
		? `(metricTimesliceName in ( ${metricTimesliceNames
				.map(mtsn => `'${mtsn}'`)
				.join(",")}) OR metricTimesliceName in (${metricTimesliceNames
				.map(mtsn => `'OtherTransactions/${mtsn}'`)
				.join(",")}))`
		: `metricTimesliceName LIKE '${codeNamespace}%'`;

	const metricsQuery = `SELECT count(newrelic.timeslice.value) AS 'sampleSize' FROM Metric WHERE \`entity.guid\` = '${newRelicEntityGuid}' AND ${metricsLookup} FACET metricTimesliceName SINCE 30 minutes AGO LIMIT 100`;

	return `query GetMethodThroughput($accountId:Int!) {
	actor {
		account(id: $accountId) {
			metrics: nrql(query: "${escapeNrql(metricsQuery)}") {
				results
				metadata {
					timeWindow {
						begin
						end
					}
				}
			}
			extrapolations: nrql(query: "${escapeNrql(extrapolationsQuery)}") {
				results
				metadata {
					timeWindow {
						begin
						end
					}
				}
			}
		}
	}
}`;
}
