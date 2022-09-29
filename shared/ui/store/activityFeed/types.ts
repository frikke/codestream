export type ActivityFeedState = { records: ActivityFeedActivity[]; hasMore: boolean };

export type ActivityFeedActivity = string;

export enum ActivityFeedActionType {
	AddOlder = "@activityFeed/AddOlderActivity",
	AddNew = "@activityFeed/AddNewActivity",
}
