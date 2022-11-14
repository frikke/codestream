"use strict";
import { DocumentMarker } from "codestream-common/agent-protocol";
import { CSMarkerIdentifier } from "codestream-common/api-protocol";
import { Range } from "vscode";

import { Dates, memoize } from "../../system";
import { CodeStreamSession } from "../session";

export class DocMarker {
	private readonly _range: Range;

	constructor(
		public readonly session: CodeStreamSession,
		private readonly _entity: DocumentMarker
	) {
		this._range = new Range(
			_entity.range.start.line,
			_entity.range.start.character,
			_entity.range.end.line,
			_entity.range.end.character
		);
	}

	get code(): string {
		return this._entity.code;
	}

	get codemarkId() {
		return this._entity.codemarkId;
	}

	get isReviewDescendant() {
		return this._entity.codemark && !!this._entity.codemark.reviewId;
	}

	get color(): string {
		// TODO: -- Use a setting
		return !this.pinned ? "gray" : this.status === "closed" ? "purple" : "green";
		// return "blue";
	}

	get creatorName() {
		return this._entity.creatorName;
	}

	@memoize
	get date() {
		return new Date(this._entity.createdAt);
	}

	// @memoize
	// get entity(): CSMarker {
	// 	return this._entity;
	// }

	@memoize
	get hoverRange() {
		return new Range(this._range.start.line, 0, this._range.start.line, 0);
	}

	get id() {
		return this._entity.id;
	}

	@memoize
	get identifier(): CSMarkerIdentifier {
		return { id: this._entity.id, file: this._entity.file, repoId: this._entity.repoId };
	}

	get range() {
		return this._range;
	}

	get status(): string {
		return (this._entity.codemark && this._entity.codemark.status) || "open";
	}

	get title() {
		return this._entity.title;
	}

	get summary() {
		return this._entity.summary;
	}

	get summaryMarkdown() {
		return this._entity.summaryMarkdown;
	}

	get pinned() {
		// internal codemarks have the pinned property set
		// external markers (from github PRs, etc default to pinned)
		return this._entity.codemark ? this._entity.codemark.pinned : false;
	}

	get type(): string {
		return this._entity.type || "comment";
	}

	get externalContent() {
		return this._entity.externalContent;
	}

	private _dateFormatter?: Dates.IDateFormatter;

	formatDate(format?: string | null) {
		if (format == null) {
			format = "MMMM Do, YYYY h:mma";
		}

		if (this._dateFormatter === undefined) {
			this._dateFormatter = Dates.toFormatter(this.date);
		}
		return this._dateFormatter.format(format);
	}

	fromNow() {
		if (this._dateFormatter === undefined) {
			this._dateFormatter = Dates.toFormatter(this.date);
		}
		return this._dateFormatter.fromNow();
	}
}
