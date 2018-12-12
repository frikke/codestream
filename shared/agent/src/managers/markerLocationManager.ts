"use strict";
import { structuredPatch } from "diff";
import * as path from "path";
import { TextDocumentIdentifier } from "vscode-languageserver";
import { Range } from "vscode-languageserver-protocol";
import URI from "vscode-uri";
import { getCache } from "../cache";
import { Container } from "../container";
import { GitRepository } from "../git/models/repository";
import { Logger } from "../logger";
import { calculateLocation, calculateLocations } from "../markerLocation/calculator";
import { MarkerNotLocatedReason } from "../shared/agent.protocol.markers";
import {
	CSLocationArray,
	CSMarker,
	CSMarkerLocation,
	CSMarkerLocations
} from "../shared/api.protocol";
import { xfs } from "../xfs";
import { ManagerBase } from "./baseManager";
import { IndexParams, IndexType } from "./cache";
import { getValues, KeyValue } from "./cache/baseCache";
import { Id } from "./entityManager";

export interface LocationsById {
	[id: string]: CSMarkerLocation;
}

export interface MissingLocationsById {
	[id: string]: {
		reason: MarkerNotLocatedReason;
		details?: string;
	};
}

interface ArraysById {
	[id: string]: CSLocationArray;
}

interface UncommittedLocation {
	fileContents: string;
	location: CSMarkerLocation;
}

interface UncommittedLocationsById {
	[id: string]: UncommittedLocation;
}

interface GetLocationsResult {
	locations: LocationsById;
	missingLocations: MissingLocationsById;
}

function newGetLocationsResult(): GetLocationsResult {
	return {
		locations: {},
		missingLocations: {}
	};
}

export class MarkerLocationManager extends ManagerBase<CSMarkerLocations> {
	protected forceFetchToResolveOnCacheMiss = true;

	getIndexedFields(): IndexParams<CSMarkerLocations>[] {
		return [
			{
				fields: ["streamId", "commitHash"],
				type: IndexType.Unique,
				fetchFn: this.fetch.bind(this)
			}
		];
	}

	async cacheSet(
		entity: CSMarkerLocations,
		oldEntity?: CSMarkerLocations
	): Promise<CSMarkerLocations | undefined> {
		if (oldEntity) {
			entity.locations = {
				...oldEntity.locations,
				...entity.locations
			};
		}
		return super.cacheSet(entity, oldEntity);
	}

	protected async fetch(criteria: KeyValue<CSMarkerLocations>[]): Promise<CSMarkerLocations> {
		const [streamId, commitHash] = getValues(criteria);
		const response = await this.session.api.fetchMarkerLocations({
			streamId,
			commitHash
		});
		return response.markerLocations;
	}

	protected fetchCriteria(obj: CSMarkerLocations): KeyValue<CSMarkerLocations>[] {
		return [["streamId", obj.streamId], ["commitHash", obj.commitHash]];
	}

	async getCurrentLocations(documentUri: string): Promise<GetLocationsResult> {
		const { documents, git } = Container.instance();
		const result = newGetLocationsResult();

		const filePath = URI.parse(documentUri).fsPath;
		const repoRoot = await git.getRepoRoot(filePath);
		if (!repoRoot) {
			Logger.log(`MARKERS: no repo root for ${filePath}`);
			return result;
		}

		const currentCommitHash = await git.getFileCurrentRevision(filePath);
		const currentCommitLocations = currentCommitHash
			? await this.getCommitLocations(filePath, currentCommitHash)
			: newGetLocationsResult();
		Object.assign(result.missingLocations, currentCommitLocations.missingLocations);

		Logger.log(`MARKERS: classifying locations`);
		const stream = await Container.instance().files.getByPath(filePath);
		const markers = await Container.instance().markers.getByStreamId(stream!.id, true);
		Logger.log(`MARKERS: found ${markers.length} markers - retrieving current locations`);
		const {
			committedLocations,
			uncommittedLocations
		} = await MarkerLocationManager.classifyLocations(
			repoRoot,
			markers,
			currentCommitLocations.locations
		);
		const doc = documents.get(documentUri);
		Logger.log(`MARKERS: retrieving current text from document manager`);
		let currentBufferText = doc && doc.getText();
		if (currentBufferText == null) {
			Logger.log(`MARKERS: current text not found in document manager - reading from disk`);
			currentBufferText = await xfs.readText(filePath);
		}
		if (!currentBufferText) {
			throw new Error(`Could not retrieve contents for ${filePath}`);
		}

		if (Object.keys(committedLocations).length) {
			Logger.log(`MARKERS: calculating current location for committed locations`);
			const currentCommitText = await git.getFileContentForRevision(filePath, currentCommitHash!);
			if (currentCommitText === undefined) {
				throw new Error(`Could not retrieve contents for ${filePath}@${currentCommitHash}`);
			}
			const diff = structuredPatch(
				filePath,
				filePath,
				currentCommitText,
				currentBufferText,
				"",
				""
			);
			const calculatedLocations = await calculateLocations(committedLocations, diff);
			for (const id in committedLocations) {
				const commLoc = committedLocations[id];
				const currLoc = calculatedLocations[id];
				Logger.log(
					`MARKERS: ${id} [${commLoc.lineStart}, ${commLoc.colStart}, ${commLoc.lineEnd}, ${
						commLoc.colEnd
					}] => [${currLoc.lineStart}, ${currLoc.colStart}, ${currLoc.lineEnd}, ${currLoc.colEnd}]`
				);
				if (currLoc.meta && currLoc.meta.contentChanged) {
					// Logger.log("IT'S A TRAP!!!!!!!!!!!");
				}
			}
			Object.assign(result.locations, calculatedLocations);
		}

		if (Object.keys(uncommittedLocations).length) {
			Logger.log(`MARKERS: calculating current location for uncommitted locations`);
			for (const id in uncommittedLocations) {
				const uncommittedLocation = uncommittedLocations[id];
				const uncommittedBufferText = uncommittedLocation.fileContents;
				const diff = structuredPatch(
					filePath,
					filePath,
					uncommittedBufferText,
					currentBufferText,
					"",
					""
				);
				const currLoc = (await calculateLocation(uncommittedLocation.location, diff)) || {};
				result.locations[id] = currLoc;

				const uncommLoc = uncommittedLocation.location || {};

				Logger.log(
					`MARKERS: ${id} [${uncommLoc.lineStart}, ${uncommLoc.colStart}, ${uncommLoc.lineEnd}, ${
						uncommLoc.colEnd
					}] => [${currLoc.lineStart}, ${currLoc.colStart}, ${currLoc.lineEnd}, ${currLoc.colEnd}]`
				);
			}
		}

		return result;
	}

	private static async classifyLocations(
		repoPath: string,
		markers: CSMarker[],
		committedLocations: LocationsById
	): Promise<{
		committedLocations: LocationsById;
		uncommittedLocations: UncommittedLocationsById;
	}> {
		const result = {
			committedLocations: {} as LocationsById,
			uncommittedLocations: {} as UncommittedLocationsById
		};
		Logger.log(`MARKERS: retrieving uncommitted locations from local cache`);
		const cache = await getCache(repoPath);
		const cachedUncommittedLocations = cache.getCollection("uncommittedLocations");
		for (const { id } of markers) {
			const committedLocation = committedLocations[id];
			const uncommittedLocation = cachedUncommittedLocations.get(id);
			if (uncommittedLocation) {
				Logger.log(`MARKERS: ${id}: uncommitted`);
				result.uncommittedLocations[id] = uncommittedLocation;
			} else if (committedLocation) {
				Logger.log(`MARKERS: ${id}: committed`);
				result.committedLocations[id] = committedLocation;
			}
		}

		return result;
	}

	async backtrackLocation(
		documentId: TextDocumentIdentifier,
		text: string,
		location: CSMarkerLocation
	): Promise<CSMarkerLocation> {
		const { git } = Container.instance();
		const documentUri = documentId.uri;
		const filePath = URI.parse(documentUri).fsPath;

		const fileCurrentRevision = await git.getFileCurrentRevision(filePath);
		if (!fileCurrentRevision) {
			// TODO marcelo - must signal
			return location;
			// return deletedLocation(location);
		}

		const currentCommitText = await git.getFileContentForRevision(filePath, fileCurrentRevision);
		if (currentCommitText === undefined) {
			throw new Error(`Could not retrieve contents for ${filePath}@${fileCurrentRevision}`);
		}

		// Maybe in this case the IDE should inform the buffer contents to ensure we have the exact same
		// buffer text the user is seeing
		const diff = structuredPatch(filePath, filePath, text, currentCommitText, "", "");
		return calculateLocation(location, diff);
	}

	async getCommitLocations(filePath: string, commitHash: string): Promise<GetLocationsResult> {
		Logger.log(`MARKERS: getting locations for ${filePath}@${commitHash}`);
		const stream = await Container.instance().files.getByPath(filePath);
		if (!stream) {
			Logger.log(`MARKERS: cannot find streamId for ${filePath}`);
			return newGetLocationsResult();
		}

		const markers = await Container.instance().markers.getByStreamId(stream.id, true);
		Logger.log(`MARKERS: found ${markers.length} markers for stream ${stream.id}`);

		const currentCommitLocations = await this.getLocationsById(stream.id, commitHash);
		const missingLocations: MissingLocationsById = {};
		const missingMarkersByCommit = this.getMissingMarkersByCommit(markers, currentCommitLocations);

		if (missingMarkersByCommit.size === 0) {
			Logger.log(`MARKERS: no missing locations`);
		} else {
			Logger.log(`MARKERS: missing locations detected - will calculate`);
		}

		const { git, session } = Container.instance();

		for (const entry of missingMarkersByCommit.entries()) {
			const commitHashWhenCreated = entry[0];
			const missingMarkers = entry[1];
			Logger.log(
				`MARKERS: Getting original locations for ${
					missingMarkers.length
				} markers created at ${commitHashWhenCreated}`
			);

			const allCommitLocations = await this.getLocationsById(stream.id, commitHashWhenCreated);
			const locationsToCalculate: LocationsById = {};
			for (const marker of missingMarkers) {
				const originalLocation = allCommitLocations[marker.id];
				if (originalLocation) {
					locationsToCalculate[marker.id] = originalLocation;
				} else {
					const details = `Could not find original location for marker ${marker.id}`;
					missingLocations[marker.id] = {
						reason: MarkerNotLocatedReason.MISSING_ORIGINAL_LOCATION,
						details
					};
					Logger.warn(details);
				}
			}

			Logger.log(`MARKERS: diffing ${filePath} from ${commitHashWhenCreated} to ${commitHash}`);
			const diff = await git.getDiffBetweenCommits(commitHashWhenCreated, commitHash, filePath);
			if (!diff) {
				const details = `cannot obtain diff - skipping calculation from ${commitHashWhenCreated} to ${commitHash}`;
				for (const marker of missingMarkers) {
					missingLocations[marker.id] = {
						reason: MarkerNotLocatedReason.MISSING_ORIGINAL_COMMIT,
						details
					};
				}
				Logger.log(`MARKERS: ${details}`);
				continue;
			}
			Logger.log(`MARKERS: calculating locations`);
			const calculatedLocations = await calculateLocations(locationsToCalculate, diff);
			for (const id in calculatedLocations) {
				const origLoc = locationsToCalculate[id] || {};
				const currLoc = calculatedLocations[id] || {};
				Logger.log(
					`MARKERS: ${id} [${origLoc.lineStart}, ${origLoc.colStart}, ${origLoc.lineEnd}, ${
						origLoc.colEnd
					}] => [${currLoc.lineStart}, ${currLoc.colStart}, ${currLoc.lineEnd}, ${currLoc.colEnd}]`
				);
				currentCommitLocations[id] = calculatedLocations[id];
			}

			Logger.log(
				`MARKERS: saving ${
					Object.keys(calculatedLocations).length
				} calculated locations to API server`
			);
			await session.api.createMarkerLocation({
				streamId: stream.id,
				commitHash,
				locations: this.arraysById(calculatedLocations)
			});
		}

		return {
			locations: currentCommitLocations,
			missingLocations
		};
	}

	arraysById(locations: LocationsById): ArraysById {
		const result: ArraysById = {};
		for (const id in locations) {
			result[id] = this.locationToArray(locations[id]);
		}
		return result;
	}

	async saveUncommittedLocation(
		filePath: string,
		fileContents: string,
		location: CSMarkerLocation
	) {
		Logger.log(`MARKERS: saving uncommitted marker location ${location.id} to local cache`);
		const { git } = Container.instance();
		const repoRoot = await git.getRepoRoot(filePath);

		if (!repoRoot) {
			throw new Error(`Could not find repo root for ${filePath}`);
		}

		const cache = await getCache(repoRoot);
		const uncommittedLocations = cache.getCollection("uncommittedLocations");
		uncommittedLocations.set(location.id, {
			fileContents,
			location
		} as UncommittedLocation);
		Logger.log(`MARKERS: flushing local cache`);
		await cache.flush();
		Logger.log(`MARKERS: local cache flushed`);
	}

	async flushUncommittedLocations(repo: GitRepository) {
		Logger.log(`MARKERS: flushing uncommitted locations`);
		const { files, git, markers, session } = Container.instance();
		const cache = await getCache(repo.path);
		const uncommittedLocations = cache.getCollection("uncommittedLocations");

		for (const id of uncommittedLocations.keys()) {
			Logger.log(`MARKERS: checking uncommitted marker ${id}`);
			const marker = await markers.getById(id);
			const fileStream = await files.getById(marker!.fileStreamId);
			const uncommittedLocation = uncommittedLocations.get(id) as UncommittedLocation;
			const originalContents = uncommittedLocation.fileContents;
			const relPath = fileStream.file;
			const absPath = path.join(repo.path, relPath);
			const commitHash = await git.getFileCurrentRevision(absPath);
			if (!commitHash) {
				Logger.log(`MARKERS: file ${relPath} is not committed yet - skipping`);
				continue;
			}
			const commitContents = await git.getFileContentForRevision(absPath, commitHash);
			if (!commitContents) {
				Logger.log(`MARKERS: file ${relPath} has no contents on revision ${commitHash} - skipping`);
				continue;
			}
			const diff = structuredPatch(relPath, relPath, originalContents, commitContents, "", "");
			const location = await calculateLocation(uncommittedLocation.location, diff);
			if (location.meta && location.meta.entirelyDeleted) {
				Logger.log(`MARKERS: location is not present on commit ${commitHash} - skipping`);
				continue;
			}
			const locationArraysById = {} as {
				[id: string]: CSLocationArray;
			};
			locationArraysById[id] = this.locationToArray(location);
			Logger.log(
				`MARKERS: committed ${id}@${commitHash} => [${location.lineStart}, ${location.colStart}, ${
					location.lineEnd
				}, ${location.colEnd}] - saving to API server`
			);
			await session.api.createMarkerLocation({
				streamId: fileStream.id,
				commitHash,
				locations: locationArraysById
			});
			Logger.log(`MARKERS: updating marker => commitHashWhenCreated:${commitHash}`);
			await session.api.updateMarker({
				markerId: id,
				commitHashWhenCreated: commitHash
			});
			uncommittedLocations.delete(id);
			Logger.log(`MARKERS: flushing local cache`);
			await cache.flush();
			Logger.log(`MARKERS: local cache flushed`);
		}
	}

	async getMarkerLocations(
		streamId: Id,
		commitHash: string
	): Promise<CSMarkerLocations | undefined> {
		return this.cache.get([["streamId", streamId], ["commitHash", commitHash]]);
	}

	async getLocationsById(streamId: Id, commitHash: string): Promise<LocationsById> {
		const markerLocations = await this.getMarkerLocations(streamId, commitHash);
		return this.byId(markerLocations);
	}

	getMissingMarkersByCommit(markers: CSMarker[], locations: LocationsById) {
		const missingMarkerIds = this.getMissingMarkerIds(markers, locations);

		const missingMarkersByCommitHashWhenCreated = new Map<string, CSMarker[]>();
		for (const m of markers) {
			if (!missingMarkerIds.has(m.id)) {
				continue;
			}

			let markersForCommitHash = missingMarkersByCommitHashWhenCreated.get(m.commitHashWhenCreated);
			if (!markersForCommitHash) {
				markersForCommitHash = [];
				missingMarkersByCommitHashWhenCreated.set(m.commitHashWhenCreated, markersForCommitHash);
			}
			Logger.log(`Missing location for marker ${m.id} - will calculate`);
			markersForCommitHash.push(m);
		}
		return missingMarkersByCommitHashWhenCreated;
	}

	getMissingMarkerIds(markers: CSMarker[], locations: { [p: string]: any }): Set<string> {
		const missingMarkerIds = new Set<string>();
		for (const m of markers) {
			if (!locations[m.id]) {
				missingMarkerIds.add(m.id);
			}
		}
		return missingMarkerIds;
	}

	arrayToLocation(id: string, array: CSLocationArray): CSMarkerLocation {
		return {
			id,
			lineStart: array[0],
			colStart: array[1],
			lineEnd: array[2],
			colEnd: array[3]
		};
	}

	locationToRange(location: CSMarkerLocation): Range {
		return Range.create(
			Math.max(location.lineStart - 1, 0),
			Math.max(location.colStart - 1, 0),
			Math.max(location.lineEnd - 1, 0),
			Math.max(location.colEnd - 1, 0)
		);
	}

	rangeToLocation(range: Range): CSMarkerLocation {
		return {
			id: "$transientLocation",
			lineStart: range.start.line + 1,
			colStart: range.start.character + 1,
			lineEnd: range.end.line + 1,
			colEnd: range.end.character + 1
		};
	}

	locationToArray(location: CSMarkerLocation): CSLocationArray {
		return [
			location.lineStart,
			location.colStart,
			location.lineEnd,
			location.colEnd,
			location.meta
		];
	}

	emptyFileLocation(): CSMarkerLocation {
		return {
			id: "$transientLocation",
			lineStart: 1,
			colStart: 1,
			lineEnd: 1,
			colEnd: 1,
			meta: {
				startWasDeleted: true,
				endWasDeleted: true,
				entirelyDeleted: true
			}
		};
	}

	private byId(markerLocations: CSMarkerLocations | undefined): LocationsById {
		if (!markerLocations) {
			return {};
		}

		const result: LocationsById = {};
		const { locations } = markerLocations;

		for (const id in locations) {
			const array = locations[id];
			result[id] = this.arrayToLocation(id, array);
		}

		return result;
	}

	protected getEntityName(): string {
		return "MarkerLocation";
	}
}
