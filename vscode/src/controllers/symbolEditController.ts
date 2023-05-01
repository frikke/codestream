import { SymbolLocator } from "providers/symbolLocator";
import {
	EditorCopySymbolRequest,
	EditorCopySymbolResponse,
	EditorReplaceSymbolRequest,
	EditorReplaceSymbolResponse
} from "../../../shared/ui/ipc/host.protocol.editor";
import { Editor } from "extensions";
import { Uri, commands } from "vscode";
import { CancellationTokenSource } from "vscode-languageclient";
import { BuiltInCommands } from "../constants";

const symbolLocator = new SymbolLocator();

export async function copySymbol(
	params: EditorCopySymbolRequest
): Promise<EditorCopySymbolResponse> {
	const editor = await Editor.findOrOpenEditor(Uri.parse(params.uri));
	const symbolLocator = new SymbolLocator();
	if (!editor?.document) {
		return { success: false };
	}
	const symbols = await symbolLocator.locate(editor?.document, new CancellationTokenSource().token);
	for (const symbol of symbols.allSymbols) {
		if (symbol.name === params.symbolName) {
			// Logger.warn(`Found symbol ${JSON.stringify(symbol)}`);
			const theText = editor.document.getText(symbol.range);
			return {
				success: true,
				text: theText,
				range: symbol.range
			};
		}
	}
	return {
		success: false
	};
}

export async function replaceSymbol(
	params: EditorReplaceSymbolRequest
): Promise<EditorReplaceSymbolResponse> {
	const uri = Uri.parse(params.uri);
	const editor = await Editor.findOrOpenEditor(uri);
	const symbolLocator = new SymbolLocator();
	if (!editor?.document) {
		return { success: false };
	}
	const symbols = await symbolLocator.locate(editor?.document, new CancellationTokenSource().token);
	const targetSymbol = symbols.allSymbols.find(s => s.name === params.symbolName);
	if (!targetSymbol) {
		return {
			success: false
		};
	}
	await editor.edit(builder => {
		builder.replace(targetSymbol.range, params.codeBlock);
	});
	// grap the updated symbol to get the range for formatting
	const updatedSymbols = await symbolLocator.locate(
		editor?.document,
		new CancellationTokenSource().token
	);
	const updatedTargetSymbol = symbols.allSymbols.find(s => s.name === params.symbolName);
	if (!updatedTargetSymbol) {
		// we still win but not formatted?
		return {
			success: true
		};
	}
	await Editor.selectRange(editor.document.uri, updatedTargetSymbol.range, undefined, {
		preserveFocus: false
	});
	await commands.executeCommand(BuiltInCommands.IndentSelection);
	await commands.executeCommand(BuiltInCommands.FormatSelection);
	await Editor.highlightRange(uri, updatedTargetSymbol.range, undefined, true);
	return {
		success: true
	};
}
