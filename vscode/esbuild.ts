import * as path from "path";

import { BuildOptions } from "esbuild";

import {
	commonEsbuildOptions,
	processArgs,
	Args,
	startEsbuild
} from "../shared/build/src/esbuildCommon";
import { CopyStuff, copyPlugin } from "../shared/build/src/copyPlugin";
import { removeSymlinks } from "../shared/build/src/symlinks";
import { statsPlugin } from "../shared/build/src/statsPlugin";

async function webBuild(args: Args) {
	const context = path.resolve(__dirname, "src/webviews/app");
	const target = path.resolve(__dirname, "dist/webview");
	const dist = path.resolve(__dirname, "dist");

	const webCopy = copyPlugin({
		onEnd: [
			{
				from: path.resolve(context, "index.html"),
				to: __dirname,
				options: { rename: "webview.html" }
			},
			{
				from: path.resolve(target, "index.js.map"),
				to: dist
			}
		]
	});

	const buildOptions: BuildOptions = {
		...commonEsbuildOptions(true, args, [webCopy]),
		entryPoints: [
			path.resolve(context, "./index.ts"),
			path.resolve(context, "styles", "webview.less")
		],
		sourcemap: args.mode === "production" ? "linked" : "both",
		outdir: target
	};

	await startEsbuild(args, buildOptions);
}

async function extensionBuild(args: Args) {
	const context = path.resolve(__dirname);
	const dist = path.resolve(__dirname, "dist");

	const postBuildCopy: CopyStuff[] = [
		{
			from: path.resolve(__dirname, "../shared/agent/dist/**"),
			to: dist
		},
		{
			from: path.resolve(__dirname, "codestream-*.info"),
			// TODO: Use environment variable if exists
			to: dist
		},
		{
			from: path.resolve(__dirname, "../shared/ui/newrelic-browser.js"),
			to: dist
		}
	];

	const extensionCopy = copyPlugin({ onEnd: postBuildCopy });

	const buildOptions: BuildOptions = {
		...commonEsbuildOptions(false, args),
		entryPoints: [path.resolve(context, "./src/extension.ts")],
		external: ["vscode", "keytar"],
		outfile: path.resolve(dist, "extension.js"),
		plugins: [statsPlugin, extensionCopy],
		format: "cjs",
		platform: "node",
		target: "node16"
	};

	await startEsbuild(args, buildOptions);
}

(async function () {
	const args = processArgs();
	removeSymlinks(__dirname);
	console.info("Starting webBuild");
	await webBuild(args);
	console.info("Starting extensionBuild");
	await extensionBuild(args);
})();
