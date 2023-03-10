export interface JenkinsBuildMeta {
	number: number;
	url: string;
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
	};
	inQueue: boolean;
	builds: JenkinsBuildMeta[];

	lastBuild: JenkinsBuildMeta;
	lastCompletedBuild: JenkinsBuildMeta;
	lastFailedBuild: JenkinsBuildMeta;
	lastStableBuild: JenkinsBuildMeta;
	lastSuccessfulBuild: JenkinsBuildMeta;
}
