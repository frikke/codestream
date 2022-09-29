module.exports = {
	globalSetup: "./jest.global.js",
	moduleNameMapper: {
		"timed-cache": "<rootDir>/node_modules/timed-cache/dist/cache.min.js",
	},
	preset: "ts-jest",
	reporters: ["default", "jest-teamcity"], // jest-teamcity OK here since it only works when TEAMCITY_VERSION env var set
	testEnvironment: "node",
	transform: {
		"\\.(gql|graphql)$": "jest-transform-graphql",
	},
};
