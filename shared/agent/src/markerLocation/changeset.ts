"use strict";

import { Hunk, ParsedDiff } from "diff";

enum Operation {
	Sync,
	Add,
	Del,
	Comment,
}

enum State {
	Sync,
	Edit,
}

function getOperation(symbol: string): Operation {
	switch (symbol) {
		case " ":
			return Operation.Sync;
		case "+":
			return Operation.Add;
		case "-":
			return Operation.Del;
		case "\\":
			return Operation.Comment;
		default:
			throw new Error(`Unknown operation symbol ${symbol}`);
	}
}

interface Line {
	operation: Operation;
	content: string;
	oldLine: number;
	newLine: number;
}

export interface Change {
	delStart: number;
	addStart: number;
	delLength: number;
	addLength: number;
	dels: string[];
	adds: string[];
}

export interface Changeset {
	oldFile: string;
	newFile: string;
	changes: Change[];
}

export function buildChangeset(diff: ParsedDiff): Changeset {
	const builder = new ChangesetBuilder(diff);
	return builder.build();
}

class ChangesetBuilder {
	private readonly _oldFile: string;
	private readonly _newFile: string;
	private readonly _hunks: Hunk[];
	private readonly _changes: Change[];
	private _state: State;
	private _oldLine: number;
	private _newLine: number;
	private _adds: string[];
	private _dels: string[];
	private _delStart: number;
	private _addStart: number;

	constructor(diff: ParsedDiff) {
		this._oldFile = diff.oldFileName!;
		this._newFile = diff.newFileName!;
		this._hunks = diff.hunks;
		this._changes = [];
		this._state = State.Sync;
		this._oldLine = 0;
		this._newLine = 0;
		this._adds = [];
		this._dels = [];
		this._delStart = 0;
		this._addStart = 0;
	}

	build(): Changeset {
		this._processHunks();
		this._setState(State.Sync);
		return {
			oldFile: this._oldFile,
			newFile: this._newFile,
			changes: this._changes,
		};
	}

	_processHunks() {
		for (const hunk of this._hunks) {
			const { oldStart, newStart, lines } = hunk;
			let oldLine = oldStart;
			let newLine = newStart;
			for (const rawLine of lines) {
				const operation = getOperation(rawLine.charAt(0));
				const content = rawLine.substr(1);

				this._processLine({
					operation,
					content,
					oldLine,
					newLine,
				});

				if (operation === Operation.Sync || operation === Operation.Add) {
					newLine++;
				}
				if (operation === Operation.Sync || operation === Operation.Del) {
					oldLine++;
				}
			}
		}
	}

	_processLine(line: Line) {
		const operation = line.operation;
		switch (operation) {
			case Operation.Sync:
				return this._ctx(line);
			case Operation.Add:
				return this._add(line);
			case Operation.Del:
				return this._del(line);
			case Operation.Comment:
				return;
		}
	}

	_ctx(line: Line) {
		this._setState(State.Sync);
		this._oldLine = line.oldLine;
		this._newLine = line.newLine;
	}

	_add(line: Line) {
		this._setState(State.Edit);
		this._adds.push(line.content);
	}

	_del(line: Line) {
		this._setState(State.Edit);
		this._dels.push(line.content);
	}

	_setState(state: State) {
		if (state !== this._state) {
			this._state = state;
			switch (state) {
				case State.Sync:
					return this._sync();
				case State.Edit:
					return this._edit();
			}
		}
	}

	_sync() {
		const dels = this._dels;
		const adds = this._adds;
		const delStart = this._delStart;
		const addStart = this._addStart;
		const delLength = dels.length;
		const addLength = adds.length;

		this._changes.push({
			delStart: delStart,
			addStart: addStart,
			delLength: delLength,
			addLength: addLength,
			dels: dels,
			adds: adds,
		});
	}

	_edit() {
		this._delStart = this._oldLine + 1;
		this._addStart = this._newLine + 1;
		this._adds = [];
		this._dels = [];
	}
}
