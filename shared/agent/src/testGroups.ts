"use strict";

export interface TestGroupDef {
	choices: string[];
}

export interface TestGroupDefs {
	[key: string]: TestGroupDef;
}

export const testGroups: TestGroupDefs = {
	// each key here is the name of a test group, and the choices listed
	// are the groups to which a given company can be randomly assigned
	// sample: {
	// 	choices: ["A", "B"]
	// },
	// onboard: {
	// choices: ["tour", "sidebar"]
	// },
	// "onboard-edu": {
	// 	choices: ["educate", "sidebar"]
	// }
	// "simple-ui": {
	// 	choices: ["simple", "standard"],
	// },
};
