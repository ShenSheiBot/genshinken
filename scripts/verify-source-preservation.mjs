import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_RELATIVE_PATH = "editorial-sources/preservation-manifest.json";
const MANIFEST_PATH = path.join(ROOT, MANIFEST_RELATIVE_PATH);
const ALLOWED_TRANSFORMS = new Set(["smart-double-quotes"]);
const ALLOWED_CHANGE_KINDS = new Set(["ocr-correction", "user-specified-wording"]);

function normalizeSlashes(value) {
  return value.replaceAll("\\", "/");
}

function resolveRepoPath(relativePath, label, requiredPrefix) {
  assert.equal(typeof relativePath, "string", `${label} must be a string`);
  assert.ok(relativePath.length > 0, `${label} must not be empty`);
  assert.ok(!path.isAbsolute(relativePath), `${label} must be repository-relative`);
  const absolutePath = path.resolve(ROOT, relativePath);
  const repositoryRelative = normalizeSlashes(path.relative(ROOT, absolutePath));
  assert.ok(
    repositoryRelative !== ".." && !repositoryRelative.startsWith("../") && !path.isAbsolute(repositoryRelative),
    `${label} escapes the repository: ${relativePath}`,
  );
  if (requiredPrefix) {
    assert.ok(
      repositoryRelative.startsWith(requiredPrefix),
      `${label} must stay under ${requiredPrefix}: ${relativePath}`,
    );
  }
  return absolutePath;
}

function readRepoUtf8(relativePath, label = relativePath, requiredPrefix) {
  return fs.readFileSync(resolveRepoPath(relativePath, label, requiredPrefix), "utf8");
}

function readInputUtf8(inputPath) {
  const absolutePath = path.isAbsolute(inputPath) ? inputPath : path.resolve(ROOT, inputPath);
  return fs.readFileSync(absolutePath, "utf8");
}

function normalizeText(text) {
  return text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").replace(/\n+$/g, "");
}

function sha256File(relativePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(resolveRepoPath(relativePath, relativePath, "editorial-sources/")))
    .digest("hex");
}

function smartDoubleQuotes(text) {
  return text
    .split("\n")
    .map((line, lineIndex) => {
      let opening = true;
      const converted = [...line]
        .map((character) => {
          if (character !== '"') return character;
          const replacement = opening ? "\u201c" : "\u201d";
          opening = !opening;
          return replacement;
        })
        .join("");
      assert.ok(opening, `smart-double-quotes refuses an unmatched quote on line ${lineIndex + 1}`);
      return converted;
    })
    .join("\n");
}

function applyTransforms(text, transforms) {
  let result = normalizeText(text);
  for (const transform of transforms) {
    assert.ok(ALLOWED_TRANSFORMS.has(transform), `unknown preservation transform: ${transform}`);
    if (transform === "smart-double-quotes") result = smartDoubleQuotes(result);
  }
  return result;
}

function countOccurrences(text, search) {
  let count = 0;
  let offset = 0;
  while (true) {
    const found = text.indexOf(search, offset);
    if (found === -1) return count;
    count += 1;
    offset = found + search.length;
  }
}

function validateAuthorizedChange(change, label) {
  assert.ok(change && typeof change === "object" && !Array.isArray(change), `${label} must be an object`);
  assert.match(change.id ?? "", /^[a-z0-9][a-z0-9-]*$/, `${label}.id must be a stable ASCII identifier`);
  assert.ok(ALLOWED_CHANGE_KINDS.has(change.kind), `${label}.kind is not allowed: ${change.kind}`);
  for (const field of ["find", "replacement", "reason", "evidence", "authorizedBy", "authorizedAt"]) {
    assert.equal(typeof change[field], "string", `${label}.${field} must be a string`);
  }
  for (const field of ["find", "reason", "evidence", "authorizedBy", "authorizedAt"]) {
    assert.ok(change[field].length > 0, `${label}.${field} must not be empty`);
  }
  assert.ok(!change.find.includes("\n"), `${label}.find must not cross a line boundary`);
  assert.ok(!change.replacement.includes("\n"), `${label}.replacement must not cross a line boundary`);
  assert.match(change.authorizedAt, /^\d{4}-\d{2}-\d{2}$/, `${label}.authorizedAt must use YYYY-MM-DD`);
}

function applyAuthorizedChanges(text, changes, documentLabel) {
  let result = text;
  const ids = new Set();
  for (const [index, change] of changes.entries()) {
    const label = `${documentLabel}.authorizedChanges[${index}]`;
    validateAuthorizedChange(change, label);
    assert.ok(!ids.has(change.id), `${documentLabel} repeats authorized change id ${change.id}`);
    ids.add(change.id);
    const occurrences = countOccurrences(result, change.find);
    assert.equal(
      occurrences,
      1,
      `${label}.find must match exactly once after earlier declared changes; matched ${occurrences} times`,
    );
    result = result.replace(change.find, change.replacement);
  }
  return result;
}

function postBody(markdown, postPath) {
  const normalized = markdown.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  assert.ok(normalized.startsWith("---\n"), `${postPath} is missing opening front matter`);
  const closing = normalized.indexOf("\n---\n", 4);
  assert.notEqual(closing, -1, `${postPath} is missing closing front matter`);
  return normalizeText(normalized.slice(closing + 5));
}

function expectedBody(document) {
  const sourceTexts = document.sources.map((source) =>
    normalizeText(readRepoUtf8(source.path, source.path, "editorial-sources/")),
  );
  let result;
  if (document.mode === "verbatim") {
    assert.equal(sourceTexts.length, 1, `${document.post}: verbatim mode requires one source`);
    result = sourceTexts[0];
  } else if (document.mode === "section-merge") {
    result = document.sources
      .map((source, index) => `## ${source.heading}\n\n${sourceTexts[index]}`)
      .join("\n\n");
  } else {
    throw new Error(`${document.post}: unknown preservation mode ${document.mode}`);
  }
  const mechanicallyNormalized = applyTransforms(result, document.transforms);
  return applyAuthorizedChanges(mechanicallyNormalized, document.authorizedChanges, document.post);
}

function firstDifference(expected, actual) {
  const limit = Math.min(expected.length, actual.length);
  let offset = 0;
  while (offset < limit && expected[offset] === actual[offset]) offset += 1;
  const before = expected.slice(0, offset);
  const line = before.split("\n").length;
  const column = offset - before.lastIndexOf("\n");
  return {
    line,
    column,
    expected: JSON.stringify(expected.slice(offset, offset + 100)),
    actual: JSON.stringify(actual.slice(offset, offset + 100)),
  };
}

function paragraphCount(text) {
  return text.length === 0 ? 0 : text.split(/\n{2,}/).length;
}

function assertPreserved(label, expected, actual) {
  if (expected === actual) return;
  const difference = firstDifference(expected, actual);
  throw new Error(
    `${label} violates the zero-difference source-preservation contract at line ${difference.line}, column ${difference.column}.\n` +
      `expected ${expected.length} chars / ${paragraphCount(expected)} paragraphs; ` +
      `received ${actual.length} chars / ${paragraphCount(actual)} paragraphs.\n` +
      `expected next: ${difference.expected}\nactual next:   ${difference.actual}`,
  );
}

function validateManifestHeader(manifest) {
  assert.equal(manifest.version, 2, "unsupported preservation manifest version");
  assert.equal(manifest.hashAlgorithm, "sha256", "unsupported preservation hash algorithm");
  assert.equal(manifest.policy, "source-preserving-v2", "unsupported preservation policy");
  assert.deepEqual(
    manifest.retentionContract,
    {
      normalizedTextRetention: "100%",
      unauthorizedChangesAllowed: 0,
      paragraphOrder: "exact",
    },
    "retentionContract must require 100% normalized text retention and zero unauthorized changes",
  );
  assert.ok(Array.isArray(manifest.documents) && manifest.documents.length > 0, "preservation manifest is empty");
}

function validateDocument(document, documentIndex, seenPosts) {
  const label = `documents[${documentIndex}]`;
  assert.ok(document && typeof document === "object" && !Array.isArray(document), `${label} must be an object`);
  const postPath = resolveRepoPath(document.post, `${label}.post`, "source/_posts/");
  assert.equal(path.extname(postPath), ".md", `${label}.post must be a Markdown file`);
  assert.ok(!seenPosts.has(document.post), `duplicate protected post: ${document.post}`);
  seenPosts.add(document.post);
  assert.ok(["verbatim", "section-merge"].includes(document.mode), `${document.post}: unsupported mode`);
  assert.ok(Array.isArray(document.transforms), `${document.post}: transforms must be an array`);
  assert.equal(new Set(document.transforms).size, document.transforms.length, `${document.post}: duplicate transforms`);
  for (const transform of document.transforms) {
    assert.ok(ALLOWED_TRANSFORMS.has(transform), `${document.post}: unknown transform ${transform}`);
  }
  assert.ok(Array.isArray(document.authorizedChanges), `${document.post}: authorizedChanges must be an array`);
  assert.ok(Array.isArray(document.sources) && document.sources.length > 0, `${document.post}: sources are required`);
  if (document.mode === "verbatim") {
    assert.equal(document.sources.length, 1, `${document.post}: verbatim mode requires one source`);
  }
  for (const [sourceIndex, source] of document.sources.entries()) {
    const sourceLabel = `${label}.sources[${sourceIndex}]`;
    resolveRepoPath(source.path, `${sourceLabel}.path`, "editorial-sources/");
    assert.match(source.sha256 ?? "", /^[a-f0-9]{64}$/, `${sourceLabel}.sha256 must be lowercase SHA-256`);
    assert.equal(typeof source.origin, "string", `${sourceLabel}.origin must be a URL`);
    assert.doesNotThrow(() => new URL(source.origin), `${sourceLabel}.origin must be a valid URL`);
    if (document.mode === "section-merge") {
      assert.equal(typeof source.heading, "string", `${sourceLabel}.heading is required`);
      assert.ok(source.heading.length > 0 && !source.heading.includes("\n"), `${sourceLabel}.heading is invalid`);
    }
  }
  for (const [changeIndex, change] of document.authorizedChanges.entries()) {
    validateAuthorizedChange(change, `${label}.authorizedChanges[${changeIndex}]`);
  }
  return postPath;
}

function loadManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8").replace(/^\uFEFF/, ""));
}

function prepareManifest(manifest, verifyPosts) {
  validateManifestHeader(manifest);
  const seenPosts = new Set();
  const prepared = [];
  for (const [documentIndex, document] of manifest.documents.entries()) {
    const target = validateDocument(document, documentIndex, seenPosts);
    for (const source of document.sources) {
      assert.equal(
        sha256File(source.path),
        source.sha256,
        `${source.path} changed. Source snapshots are immutable; add a new revision instead of editing one in place.`,
      );
    }
    const current = fs.readFileSync(target, "utf8");
    const expected = expectedBody(document);
    postBody(current, document.post);
    if (verifyPosts) assertPreserved(document.post, expected, postBody(current, document.post));
    prepared.push({ document, target, current, expected });
  }
  return prepared;
}

function replacePostBody(markdown, body, postPath) {
  const normalized = markdown.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  assert.ok(normalized.startsWith("---\n"), `${postPath} is missing opening front matter`);
  const closing = normalized.indexOf("\n---\n", 4);
  assert.notEqual(closing, -1, `${postPath} is missing closing front matter`);
  return `${normalized.slice(0, closing + 5)}${body}\n`;
}

function writeManifestDocuments(manifest) {
  const prepared = prepareManifest(manifest, false);
  for (const item of prepared) {
    fs.writeFileSync(item.target, replacePostBody(item.current, item.expected, item.document.post), "utf8");
    console.log(`synchronized ${item.document.post}: ${item.expected.length} chars`);
  }
  prepareManifest(manifest, true);
}

function verifyManifest(manifest) {
  const prepared = prepareManifest(manifest, true);
  for (const item of prepared) {
    console.log(`preserved ${item.document.post}: ${item.expected.length} chars`);
  }
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function runSelfTests() {
  assertPreserved("exact fixture", "a\n\nb", "a\n\nb");
  assertPreserved("smart quote fixture", smartDoubleQuotes('say "yes"'), "say \u201cyes\u201d");
  for (const [name, candidate] of [
    ["deletion", "a"],
    ["reorder", "b\n\na"],
    ["paraphrase", "a\n\nc"],
    ["addition", "a\n\nb\n\nsummary"],
    ["whitespace rewrite", "a \n\nb"],
  ]) {
    assert.throws(() => assertPreserved(name, "a\n\nb", candidate), /zero-difference source-preservation contract/);
  }
  const authorized = {
    id: "ocr-001",
    kind: "ocr-correction",
    find: "teh",
    replacement: "the",
    reason: "Correct OCR transposition",
    evidence: "scan page 1",
    authorizedBy: "editor",
    authorizedAt: "2026-08-03",
  };
  assert.equal(applyAuthorizedChanges("teh text", [authorized], "fixture"), "the text");
  assert.throws(
    () => applyAuthorizedChanges("teh and teh", [authorized], "fixture"),
    /must match exactly once/,
  );
  assert.throws(
    () => applyAuthorizedChanges("teh text", [{ ...authorized, replacement: "the\nword" }], "fixture"),
    /must not cross a line boundary/,
  );
}

runSelfTests();
const before = argument("--before");
const after = argument("--after");
const write = process.argv.includes("--write");
assert.ok(!(write && (before || after)), "--write cannot be combined with --before/--after");
if (write) {
  const manifest = loadManifest();
  writeManifestDocuments(manifest);
  console.log("preserved posts synchronized and verified");
} else if (before || after) {
  assert.ok(before && after, "--before and --after must be provided together");
  const transforms = process.argv.includes("--smart-double-quotes") ? ["smart-double-quotes"] : [];
  const expected = applyTransforms(readInputUtf8(before), transforms);
  const actual = normalizeText(readInputUtf8(after));
  assertPreserved(`${before} -> ${after}`, expected, actual);
  console.log(`preservation comparison passed: ${before} -> ${after}`);
} else {
  verifyManifest(loadManifest());
  console.log("source-preservation verification passed");
}
