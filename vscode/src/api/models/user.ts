"use strict";
import {
	CSMe,
	CSUser,
	CSNotificationDeliveryPreference,
	CSMePreferences,
} from "codestream-common/api-protocol";

import { CodeStreamSession } from "../session";
import { CodeStreamItem } from "./item";

export class User extends CodeStreamItem<CSUser> {
	constructor(session: CodeStreamSession, user: CSUser) {
		super(session, user);
	}

	get email() {
		return this.entity.email;
	}

	get fullName() {
		return `${this.entity.firstName || ""} ${this.entity.lastName || ""}`.trim();
	}

	get name() {
		return this.entity.username || this.fullName;
	}

	get hasGitLens() {
		return this.entity.hasGitLens;
	}

	get preferences(): CSMePreferences | undefined {
		return this.entity.preferences;
	}

	hasMutedChannel(streamId: string) {
		const preferences = (this.entity as CSMe).preferences;
		if (preferences === undefined) return false;

		const mutedStreams = preferences.mutedStreams;
		if (mutedStreams === undefined) return false;

		return mutedStreams[streamId] === true;
	}

	// default is true
	wantsToastNotifications() {
		const preferences = (this.entity as CSMe).preferences;
		if (preferences === undefined) return true;

		return (
			!preferences.notificationDelivery ||
			preferences.notificationDelivery === CSNotificationDeliveryPreference.All ||
			preferences.notificationDelivery === CSNotificationDeliveryPreference.ToastOnly
		);
	}
}
