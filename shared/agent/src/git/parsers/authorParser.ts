"use strict";
import { Strings } from "../../system";
import { isUncommitted } from "../common";
import { GitAuthor } from "../models/author";

export interface AuthorEntry {
	name: string;
	date: Date;
	email: string;
	lines: number;
	hunks: number;
}

export class GitAuthorParser {
	static parse(data: string): GitAuthor[] {
		if (!data) return [];

		const authors = new Map<string, AuthorEntry>();

		let author: AuthorEntry | undefined;
		let index;
		let line;
		let sha: string | undefined;
		let prevSha;
		let process = false;

		for (line of Strings.lines(data + "\n")) {
			index = line.indexOf(" ");

			if (author === undefined || process) {
				if (process) {
					process = false;

					if (author !== undefined && author.name !== undefined) {
						const key = `${author.name}|${author.email}`;
						const a = authors.get(key);
						if (a !== undefined) {
							a.hunks++;
							a.lines += author.lines;
						} else {
							author.hunks = 1;
							authors.set(key, author);
						}
					}
				}

				if (index === -1) continue;

				prevSha = sha;
				sha = line.substring(0, index);

				index = line.lastIndexOf(" ") + 1;
				if (sha === prevSha) {
					author = {
						...author,
						lines: parseInt(line.substring(index), 10),
					} as AuthorEntry;
				} else {
					author = {
						lines: parseInt(line.substring(index), 10),
					} as AuthorEntry;
				}

				continue;
			}

			if (index === -1) continue;

			switch (line.substring(0, index)) {
				case "author":
					if (!isUncommitted(sha!)) {
						author.name = line.substring(index).trim();
					}
					break;

				case "author-mail":
					author.email = line.substring(index).trim();
					const start = author.email.indexOf("<");
					if (start >= 0) {
						const end = author.email.indexOf(">", start);
						if (end > start) {
							author.email = author.email.substring(start + 1, end);
						} else {
							author.email = author.email.substring(start + 1);
						}
					}
					break;

				case "author-time":
					author.date = new Date((line.substring(index).trim() as any) * 1000);
					break;

				case "filename":
					process = true;
					break;

				default:
					break;
			}
		}

		return [...authors.values()].sort(
			(a, b) => b.lines - a.lines || b.date.getTime() - a.date.getTime()
		);
	}
}
