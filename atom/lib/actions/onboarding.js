import { post, put } from "../network-request";
import db from "../local-cache";

const normalize = ({ _id, ...rest }) => ({ id: _id, ...rest });

const requestStarted = () => ({ type: "REQUEST_STARTED" });
const requestFinished = () => ({ type: "REQUEST_FINISHED" });

const addUser = user => dispatch => {
	db.users.add(user).then(() =>
		dispatch({
			type: "ADD_USER",
			payload: user
		})
	);
};

const addTeams = teams => dispatch => {
	db.teams.bulkPut(teams).then(() =>
		dispatch({
			type: "ADD_TEAMS",
			payload: teams
		})
	);
};

const addTeam = team => dispatch => {
	db.teams.add(team).then(() =>
		dispatch({
			type: "ADD_TEAM",
			payload: team
		})
	);
};

const addRepos = repos => dispatch => {
	db.repos.bulkPut(repos).then(() =>
		dispatch({
			type: "ADD_REPOS",
			payload: repos
		})
	);
};

const addRepo = repo => dispatch => {
	db.repos.add(repo).then(() =>
		dispatch({
			type: "ADD_REPO",
			payload: repo
		})
	);
};

const initSession = ({ user, accessToken }) => dispatch => {
	db.users.put(user).then(() => {
		dispatch({ type: "UPDATE_USER", payload: user });
		dispatch({ type: "INIT_SESSION", payload: { accessToken, userId: user.id } });
	});
};

export const register = attributes => dispatch => {
	post("/no-auth/register", attributes)
		.then(({ user }) => {
			user = normalize(user);
			dispatch(addUser(user));
			dispatch({ type: "SIGNUP_SUCCESS", payload: { ...attributes, userId: user.id } });
		})
		.catch(({ data }) => {
			if (data.code === "RAPI-1004")
				dispatch({
					type: "SIGNUP_EMAIL_EXISTS",
					payload: { email: attributes.email, alreadySignedUp: true }
				});
		});
};

export const goToSignup = () => ({ type: "GO_TO_SIGNUP" });

export const confirmEmail = attributes => (dispatch, getState) => {
	dispatch(requestStarted());
	post("/no-auth/confirm", attributes)
		.then(({ accessToken, user, teams, repos }) => {
			dispatch(requestFinished());
			user = normalize(user);
			dispatch(initSession({ user, accessToken }));

			const { team } = getState();
			const teamForRepo = team && team.id;
			const userTeams = teams.map(normalize);

			dispatch(addRepos(repos.map(normalize)));
			dispatch(addTeams(userTeams));
			if (!teamForRepo && userTeams.length === 0)
				dispatch({ type: "NEW_USER_CONFIRMED_IN_NEW_REPO" });
			if (!teamForRepo && userTeams.length > 0)
				dispatch({ type: "EXISTING_USER_CONFIRMED_IN_NEW_REPO" });
			if (userTeams.find(t => t.id === teamForRepo)) {
				dispatch({ type: "EXISTING_USER_CONFIRMED" });
			}
		})
		.catch(({ data }) => {
			dispatch(requestFinished());
			if (data.code === "USRC-1006")
				dispatch({
					type: "USER_ALREADY_CONFIRMED",
					payload: { alreadyConfirmed: true, email: attributes.email }
				});
			if (data.code === "USRC-1004") dispatch({ type: "GO_TO_SIGNUP" });
			if (data.code === "USRC-1002") dispatch({ type: "INVALID_CONFIRMATION_CODE" });
			if (data.code === "usrc-1003") dispatch({ type: "EXPIRED_CONFIRMATION_CODE" });
		});
};

export const sendNewCode = attributes => dispatch => {
	post("/no-auth/register", attributes).catch(({ data }) => {
		if (data.code === "RAPI-1004") atom.notifications.addInfo("Email sent!"); // TODO: i18n
	});
};

export const createTeam = name => (dispatch, getState) => {
	const { session, repoMetadata } = getState();
	const params = {
		url: repoMetadata.url,
		firstCommitHash: repoMetadata.firstCommitHash,
		team: { name }
	};
	dispatch(requestStarted());
	post("/repos", params, session.accessToken).then(data => {
		dispatch(requestFinished());
		const team = normalize(data.team);
		dispatch({ type: "TEAM_CREATED", payload: { teamId: team.id } });
		dispatch(addTeam(team));
		dispatch(addRepo(normalize(data.repo)));
		dispatch({ type: "TEAM_SELECTED_FOR_REPO", payload: team });
	});
};

export const addRepoForTeam = teamId => (dispatch, getState) => {
	const { repoMetadata, session } = getState();
	const params = { ...repoMetadata, teamId };
	dispatch(requestStarted());
	post("/repos", params, session.accessToken)
		.then(data => {
			const repo = normalize(data.repo);
			dispatch(requestFinished());
			dispatch(addRepo(repo));
			dispatch({ type: "SET_CURRENT_REPO", payload: repo.id });
			dispatch({ type: "REPO_ADDED_FOR_TEAM" });
		})
		.catch(error => {
			dispatch(requestFinished());
			if (error.data.code === "RAPI-1003") dispatch(teamNotFound());
			if (error.data.code === "RAPI-1011") dispatch(noPermission());
		});
};

export const teamNotFound = () => ({ type: "TEAM_NOT_FOUND" });
export const noPermission = () => ({ type: "INVALID_PERMISSION_FOR_TEAM" });

export const authenticate = async (store, attributes) => {
	const { accessToken, user, teams, repos } = await put("/no-auth/login", attributes);
	store.updateSession({ accessToken });
	store.upsertUser(user);
	store.upsertTeams(teams);
	store.upsertRepos(repos);
};

export default {
	goToSignup,
	register,
	confirmEmail,
	sendNewCode,
	authenticate,
	createTeam
};
