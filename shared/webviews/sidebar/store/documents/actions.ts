import { Document } from "@codestream/protocols/agent";
import { action } from "../common";
import { DocumentActionsType } from "./types";

export const resetDocuments = () => action("RESET_DOCUMENTS");
export const reset = () => action("RESET");

export const updateDocument = (document: Document) => action(DocumentActionsType.Update, document);

export const removeDocument = (document: Document) => action(DocumentActionsType.Remove, document);
