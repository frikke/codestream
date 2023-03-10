"use strict";

import { CSProviderInfos } from "@codestream/protocols/api";

import { ThirdPartyBuildProvider, ThirdPartyProviderSupportsBuilds } from "./provider";
import { ThirdPartyProviderBase } from "./thirdPartyProviderBase";

export abstract class ThirdPartyBuildProviderBase<
		TProviderInfo extends CSProviderInfos = CSProviderInfos
	>
	extends ThirdPartyProviderBase<TProviderInfo>
	implements ThirdPartyBuildProvider
{
	supportsBuilds(): this is ThirdPartyBuildProvider & ThirdPartyProviderSupportsBuilds {
		return ThirdPartyBuildProvider.supportsBuilds(this);
	}

	formatDurationFromMilliseconds(duration: number): string {
		const totalSeconds = Math.floor(duration / 1000);
		return this.formatDuration(totalSeconds);
	}

	formatDurationFromDates(from: Date, to: Date): string {
		const totalSeconds = Math.floor((+to - +from) / 1000);
		return this.formatDuration(totalSeconds);
	}

	private formatDuration(totalSeconds: number): string {
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds - hours * 3600) / 60);
		const seconds = totalSeconds - hours * 3600 - minutes * 60;
		return [
			hours > 0 ? `${hours}h` : undefined,
			minutes > 0 ? `${minutes}m` : undefined,
			seconds > 0 ? `${seconds}s` : undefined,
		]
			.filter(Boolean)
			.join(" ");
	}
}
