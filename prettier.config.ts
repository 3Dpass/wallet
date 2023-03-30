import type { Options } from "prettier";

export default {
  trailingComma: "es5",
  tabWidth: 2,
  semi: true,
  singleQuote: false,
  quoteProps: "consistent",
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: "always",
} satisfies Options;
