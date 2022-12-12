export interface JenkinsJobsResponse {
	jobs?: {
		name?: string;
		url?: string;
		color?: string;
	}[];
}
