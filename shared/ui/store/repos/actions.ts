import { CSRepository } from "codestream-common/api-protocol";

import { action } from "../common";
import { ReposActionsType } from "./types";

export const reset = () => action("RESET");

export const bootstrapRepos = (repos: CSRepository[]) => action(ReposActionsType.Bootstrap, repos);

export const addRepos = (repos: CSRepository[]) => action(ReposActionsType.Add, repos);
