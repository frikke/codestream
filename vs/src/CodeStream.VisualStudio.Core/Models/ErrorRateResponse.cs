﻿using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Core.Models
{
	public class ErrorRateResponse
	{
		[JsonProperty("errorRate", NullValueHandling = NullValueHandling.Ignore)]
		public string ErrorRate { get; set; }

		[JsonProperty("namespace", NullValueHandling = NullValueHandling.Ignore)]
		public string Namespace { get; set; }

		[JsonProperty("className", NullValueHandling = NullValueHandling.Ignore)]
		public string ClassName { get; set; }

		[JsonProperty("functionName", NullValueHandling = NullValueHandling.Ignore)]
		public string FunctionName { get; set; }

		[JsonProperty("metricTimesliceName", NullValueHandling = NullValueHandling.Ignore)]
		public string MetricTimesliceName { get; set; }

		[JsonProperty("anomaly", NullValueHandling = NullValueHandling.Ignore)]
		public ObservabilityAnomaly Anomaly { get; set; }
	}
}
