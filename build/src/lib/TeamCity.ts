import * as consoul from "./Consoul.ts";

export function isWhatIfMode(): boolean {
	return process.env.what_if === "1";
}

export function getSupplmentalSoftwareDirectory(): string {
	const softwareDirectory = process.env.TCBUILD_SUPPLEMENTAL_SOFTWARE_PATH;

	if (softwareDirectory) {
		return softwareDirectory;
	}

	consoul.error(`Unable to locate process.env.TCBUILD_SUPPLEMENTAL_SOFTWARE_PATH`);
	process.exit(1);
}

export function getCheckoutDirectory(): string {
	const checkoutDirectory = process.env.TC_CHECKOUT_DIR;

	if (checkoutDirectory) {
		return checkoutDirectory;
	}

	consoul.error(`Unable to locate process.env.TC_CHECKOUT_DIR`);
	process.exit(1);
}

export function getBuildNumber(): string {
	return process.env.build_counter || "0";
}

export function setVersion(version: string): void {
	consoul.info(`##teamcity[buildNumber '${version}']`);
}

export function isTeamCity(): boolean {
	return isCI() || isPI() || isRelease();
}

export function isRelease(): boolean {
	try {
		return process.env.IS_RELEASE === "1";
	} catch (error) {
		consoul.error(JSON.stringify(error));
		process.exit(1);
	}
}

export function isCI(): boolean {
	try {
		return process.env.IS_CI === "1";
	} catch (error) {
		consoul.error(JSON.stringify(error));
		process.exit(1);
	}
}

export function isPI(): boolean {
	try {
		return process.env.IS_PI === "1";
	} catch (error) {
		consoul.error(JSON.stringify(error));
		process.exit(1);
	}
}
