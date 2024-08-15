import * as consoul from "./lib/Consoul.ts";
import { isTeamCity } from "./lib/TeamCity.ts";
import * as vs from "./vs/PreBuild.ts";
import path from "path";

const args = process.argv.slice(2);

if (args.length !== 1) {
	consoul.error(`Incorrect number of parameters to script`);
	consoul.error();
	consoul.error(`Example Usage`);
	consoul.error(`  npx tsx PreBuild.tx vs`);
	consoul.error();
	process.exit(1);
}

const product = args[0];

if (!isTeamCity()) {
	consoul.error("Unable to run build scripts locally; must be run on CI server");
	process.exit(1);
}

const rootProductDirectory = path.resolve(`${process.env.TC_CHECKOUT_DIR}`, product);

switch (product) {
	case "vs":
		vs.default(rootProductDirectory);
		break;
}
