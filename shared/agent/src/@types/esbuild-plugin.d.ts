/// <reference types="esbuild"/>

declare module "esbuild-plugin-ignore" {
	declare const ignores: (
		options: { resourceRegExp: RegExp; contextRegExp?: contextRegExp }[]
	) => Plugin;
	export default ignores;
}
