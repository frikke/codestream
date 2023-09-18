import { activityFeedMiddleware } from "../activityFeed/middleware";
import { middlewareInjector } from "../middleware-injector";
import { sessionMiddleware } from "../session/middleware";
import { contextChangeObserver } from "./context-changes";
import { logging } from "./logging";
import { sideEffects } from "./side-effects";

export default [
	contextChangeObserver,
	middlewareInjector.createMiddleware(),
	sideEffects,
	logging,
	activityFeedMiddleware,
	sessionMiddleware,
];
