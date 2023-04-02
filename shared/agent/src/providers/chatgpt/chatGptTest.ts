import { getChatResponse } from "./chatGpt";

const prompt = `Analyze this stack trace:

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

And tell me how to fix this code:

\`\`\`

function countUsersByState() {
  const stateMap = userData.reduce((map, user) => {
    const count = map.get(user.address.state) ?? 0
    map.set(user.address.state, count + 1)
  }, new Map())
  return stateMap
}

function userView() {
  return {
    users: userData,
    stateTally: countUsersByState()
  }
}

module.exports = {
  userView
}

\`\`\`
`;

// Example usage
getChatResponse("1234", prompt).then(response => {
	console.log(response);
	process.exit(0);
});
