import { extensions } from "vscode";
import * as vscode from "vscode";

export async function validateExtension(language: string) {
	const languageValidationString = checkPlugin(language) || "VALID";
	return languageValidationString;
}

function checkPlugin(languageId: string): string | undefined {
	switch (languageId) {
		case "ruby": {
			return checkRubyPlugin();
		}
		case "java": {
			return checkJavaPlugin();
		}
		case "python": {
			return checkPythonPlugin();
		}
		case "csharp": {
			return checkCsharpPlugin();
		}
		case "go": {
			return checkGoPlugin();
		}
		case "php": {
			return checkPhpPlugin();
		}
	}
	return undefined;
}

function checkRubyPlugin(): string | undefined {
	if (extensions.getExtension("rebornix.ruby")) {
		const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("ruby"); // ruby.useLanguageServer
		const useLanguageServer = config.get("useLanguageServer");
		if (!useLanguageServer) {
			return "NO_RUBY_VSCODE_EXTENSION";
		}
		return;
	}

	if (extensions.getExtension("castwide.solargraph")?.isActive === true) {
		return;
	} else {
		return "NO_RUBY_VSCODE_EXTENSION";
	}
}

function checkPythonPlugin(): string | undefined {
	return extensions.getExtension("ms-python.python")?.isActive === true
		? undefined
		: "NO_PYTHON_VSCODE_EXTENSION";
}

function checkJavaPlugin(): string | undefined {
	// At least for Java isActive is wildly inaccurate
	const extension = extensions.getExtension("redhat.java");
	return extension ? undefined : "NO_JAVA_VSCODE_EXTENSION";
}

function checkCsharpPlugin(): string | undefined {
	return extensions.getExtension("ms-dotnettools.csharp")?.isActive === true
		? undefined
		: "NO_CSHARP_VSCODE_EXTENSION";
}

function checkGoPlugin(): string | undefined {
	return extensions.getExtension("golang.go")?.isActive === true
		? undefined
		: "NO_GO_VSCODE_EXTENSION";
}

function checkPhpPlugin(): string | undefined {
	return extensions.getExtension("bmewburn.vscode-intelephense-client")?.isActive === true
		? undefined
		: "NO_PHP_VSCODE_EXTENSION";
}
