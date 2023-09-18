import { action } from "../common";
import { ServicesActionsType } from "./types";

export const reset = () => action("RESET");

export const bootstrapServices = (services: {}) => action(ServicesActionsType.Bootstrap, services);
