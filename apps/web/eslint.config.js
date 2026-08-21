import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
const config = [
	...nextJsConfig,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		rules: {
			// React event handlers routinely use arrow-shorthand setState calls
			// (e.g. onClick={() => setOpen(true)}). Allow that idiom while still
			// catching accidental void returns in block bodies and ternaries.
			"@typescript-eslint/no-confusing-void-expression": [
				"error",
				{ ignoreArrowShorthand: true },
			],
		},
	},
];

export default config;
