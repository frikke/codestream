module.exports = {
	globalSetup: "./jest.global.js",
	moduleNameMapper: {
		"timed-cache": "<rootDir>/node_modules/timed-cache/dist/cache.min.js",
		"codestream-common/string": "<rootDir>/../common/src/system/string.ts",
		"codestream-common/agent-protocol": "<rootDir>/../common/src/protocols/agent/agent.protocol.ts",
		"codestream-common/api-protocol": "<rootDir>/../common/src/protocols/agent/api.protocol.ts",
	},
	preset: "ts-jest",
	reporters: ["default", "jest-teamcity"], // jest-teamcity OK here since it only works when TEAMCITY_VERSION env var set
	testEnvironment: "node",
	transform: {
		"\\.(gql|graphql)$": "jest-transform-graphql",
	},
};
