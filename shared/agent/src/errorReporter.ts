import {
	ReportBreadcrumbRequest,
	ReportBreadcrumbRequestType,
	ReportMessageRequest,
	ReportMessageRequestType,
	WebviewErrorRequest,
	WebviewErrorRequestType,
} from "@codestream/protocols/agent";
import * as NRErrorReporter from "./nrErrorReporter";
import { lsp, lspHandler } from "./system";
import { CodeStreamAgent } from "./agent";

interface IErrorReporterProvider {
	reportMessage(request: ReportMessageRequest): void;
	reportBreadcrumb(request: ReportBreadcrumbRequest): void;
	webviewError(request: WebviewErrorRequest): void;
}

@lsp
export class ErrorReporter {
	private readonly _errorProviders: IErrorReporterProvider[];

	constructor(agent: CodeStreamAgent) {
		this._errorProviders = [new NewRelicErrorReporterProvider(agent)];
	}

	@lspHandler(ReportMessageRequestType)
	reportMessage(request: ReportMessageRequest) {
		this._errorProviders.forEach(_ => _.reportMessage(request));
	}

	@lspHandler(ReportBreadcrumbRequestType)
	reportBreadcrumb(request: ReportBreadcrumbRequest) {
		this._errorProviders.forEach(_ => _.reportBreadcrumb(request));
	}

	@lspHandler(WebviewErrorRequestType)
	webviewError(request: WebviewErrorRequest) {
		this._errorProviders.forEach(_ => _.webviewError(request));
	}
}

class NewRelicErrorReporterProvider implements IErrorReporterProvider {
	constructor(private agent: CodeStreamAgent) {}

	reportMessage(request: ReportMessageRequest) {
		const attributes = this.agent.createNewRelicCustomAttributes();
		NRErrorReporter.reportErrorToNr(request, attributes);
	}

	webviewError(request: WebviewErrorRequest): void {
		NRErrorReporter.webviewError(request);
	}

	reportBreadcrumb(request: ReportBreadcrumbRequest) {
		// noop
	}
}
