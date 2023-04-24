import { getChatResponse } from "./chatGpt";

const prompt1 = `Analyze this stack trace:

\`\`\`
TypeError: Cannot read properties of undefined (reading 'get')
    at /app/src/data/users.js:37:23
    at Array.reduce (<anonymous>)
    at countUsersFromState (/app/src/data/users.js:36:29)
    at userView (/app/src/data/users.js:46:17)
    at fetchUsers (/app/src/controllers/usersController.js:4:18)
    at runInContextCb (/app/node_modules/newrelic/lib/shim/shim.js:1315:22)
    at LegacyContextManager.runInContext (/app/node_modules/newrelic/lib/context-manager/legacy-context-manager.js:59:23)
    at WebFrameworkShim.applySegment (/app/node_modules/newrelic/lib/shim/shim.js:1305:25)
    at _applyRecorderSegment (/app/node_modules/newrelic/lib/shim/shim.js:936:20)
    at _doRecord (/app/node_modules/newrelic/lib/shim/shim.js:909:17)
\`\`\`

And fix the following code:

\`\`\`
function countUsersByState(userData) {
  const stateMap = userData.reduce((map, user) => {
    const count = map.get(user.address.state) ?? 0
    map.set(user.address.state, count + 1)
  }, new Map())
  return stateMap
}
\`\`\`
`;

const ID = "1234";

const sequence = [
	{
		role: "system",
		prompt:
			"You are an expert at fixing bugs. You will output brief descriptions and the fixed code blocks. " +
			prompt1,
	},
	{
		prompt: "Write a unit test for this code using jasmine. Only include the test code.",
	},
	{
		prompt: "Is there any other way to improve this function?",
	},
];

async function run() {
	let count = 0;
	for (const seq of sequence) {
		const start = Date.now();
		const response = await getChatResponse(ID, seq.prompt, seq.role);
		const elapsed = Date.now() - start;
		console.log(`\n### ${count++} ${elapsed} ms ${response} ###\n`);
	}
}

run()
	.catch(e => console.log("Uh oh", e))
	.finally(() => process.exit(0));
