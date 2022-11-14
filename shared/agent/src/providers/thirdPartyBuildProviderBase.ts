"use strict";

import { CSProviderInfos } from "codestream-common/api-protocol";

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
}
