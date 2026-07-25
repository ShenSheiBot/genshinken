import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const minimatch = require("minimatch");

assert.equal(
  typeof minimatch,
  "function",
  "legacy ESLint consumers require minimatch's CommonJS export to remain callable"
);
assert.equal(
  minimatch("article.tsx", "{article,book}.tsx"),
  true,
  "minimatch brace expansion must remain compatible with its installed dependency"
);
assert.equal(
  minimatch("media.tsx", "{article,book}.tsx"),
  false,
  "the dependency smoke test must reject non-matching brace alternatives"
);

console.log("dependency compatibility contract passed");
