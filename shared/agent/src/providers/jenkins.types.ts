export interface JenkinsBuildMeta {
	number: number;
	url: string;
}

export interface JenkinsBuildResponse {
	number: number;
	building: boolean;
	duration: number;
	estimatedDuration: number;
	result: string;
	timestamp: number;
	url: string;
	description: string;
	fullDisplayName: string;
}

export interface JenkinsJobResponse {
	description: string;
	displayName: string;
	fullDisplayName: string;
	fullName: string;
	name: string;

	url: string;
	buildable: boolean;
	color: string;
	healthReport: {
		description: string;
		iconClassName: string;
		iconUrl: string;
		score: number;
	}[];
	inQueue: boolean;
	builds: JenkinsBuildMeta[];

	lastBuild: JenkinsBuildMeta;
	lastCompletedBuild: JenkinsBuildMeta;
	lastFailedBuild: JenkinsBuildMeta;
	lastStableBuild: JenkinsBuildMeta;
	lastSuccessfulBuild: JenkinsBuildMeta;
}
