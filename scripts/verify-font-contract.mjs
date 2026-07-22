import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const globalsPath = path.join(root, "app", "globals.css");
const readerPath = path.join(
  root,
  "app",
  "prototype",
  "reading",
  "[slug]",
  "reading-prototype.module.css"
);
const manifestPath = path.join(root, "public", "fonts", "cjk-font-manifest.json");

const expectedFonts = [
  {
    family: "UN Canon STSong",
    file: "un-canon-st-song.woff2",
    source: "STSong.ttf",
    variable: "--f-cjk-serif",
  },
  {
    family: "UN Canon STFangsong",
    file: "un-canon-st-fangsong.woff2",
    source: "STFangsong.ttf",
    variable: "--f-cjk-fangsong",
  },
  {
    family: "UN Canon STKaiti",
    file: "un-canon-st-kaiti.woff2",
    source: "STKaiti.ttf",
    variable: "--f-cjk-kaiti",
  },
];

const textExtensions = new Set([".css", ".json", ".md", ".mjs", ".ts", ".tsx", ".txt"]);
const corpusRoots = ["app", "lib", "source"];
const alwaysInclude = "西方負典华文宋体仿宋楷体衬线无衬线，。；：？！“”‘’（）《》〈〉【】——……·";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readUtf8(file) {
  return fs.readFileSync(file, "utf8");
}

function walkTextFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkTextFiles(absolute));
    else if (entry.isFile() && textExtensions.has(path.extname(entry.name))) files.push(absolute);
  }
  return files;
}

function isCjkTextCodePoint(codePoint) {
  return (
    codePoint === 0x00b7 ||
    codePoint === 0x00d7 ||
    codePoint === 0x00f7 ||
    (codePoint >= 0x2010 && codePoint <= 0x203b) ||
    (codePoint >= 0x2e80 && codePoint <= 0x312f) ||
    (codePoint >= 0x31a0 && codePoint <= 0x31ef) ||
    (codePoint >= 0x3400 && codePoint <= 0x9fff) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe10 && codePoint <= 0xfe4f) ||
    (codePoint >= 0xff00 && codePoint <= 0xffef)
  );
}

function propertyValue(css, property) {
  const match = new RegExp(`${escapeRegExp(property)}\\s*:\\s*([^;]+);`).exec(css);
  assert.ok(match, `missing ${property}`);
  return match[1].trim();
}

const globalsCss = readUtf8(globalsPath);
const readerCss = readUtf8(readerPath);
assert.ok(fs.existsSync(manifestPath), "missing generated CJK font manifest; run scripts/build-cjk-font-subsets.py");
const manifest = JSON.parse(readUtf8(manifestPath));
assert.equal(manifest.version, 2, "unsupported CJK font manifest version");
assert.equal(manifest.strategy, "site-corpus", "CJK font subset strategy changed unexpectedly");
assert.ok(manifest.subsetCodePointCount >= 2_500, "hosted CJK subsets are unexpectedly small");

const faceBlocks = [...globalsCss.matchAll(/@font-face\s*{[\s\S]*?}/g)].map((match) => match[0]);
const hashes = new Set();

for (const expected of expectedFonts) {
  const face = faceBlocks.find((block) =>
    new RegExp(`font-family\\s*:\\s*["']${escapeRegExp(expected.family)}["']\\s*;`).test(block)
  );
  assert.ok(face, `missing self-hosted @font-face for ${expected.family}`);
  assert.match(face, new RegExp(`url\\(["']?/fonts/${escapeRegExp(expected.file)}["']?\\)`));
  assert.match(face, /format\(["']woff2["']\)/);
  assert.match(face, /font-style\s*:\s*normal\s*;/);
  assert.match(face, /font-weight\s*:\s*400\s*;/);
  assert.match(face, /font-display\s*:\s*swap\s*;/);

  const variable = propertyValue(globalsCss, expected.variable);
  assert.match(variable, new RegExp(`^["']${escapeRegExp(expected.family)}["']`), `${expected.variable} must prefer its hosted face`);

  const assetPath = path.join(root, "public", "fonts", expected.file);
  assert.ok(fs.existsSync(assetPath), `missing ${expected.file}`);
  const bytes = fs.readFileSync(assetPath);
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "wOF2", `${expected.file} is not WOFF2`);
  assert.ok(bytes.length >= 100_000, `${expected.file} is implausibly small`);
  assert.ok(bytes.length <= 3_500_000, `${expected.file} exceeds the 3.5 MB mobile budget`);
  const digest = crypto.createHash("sha256").update(bytes).digest("hex");
  assert.ok(!hashes.has(digest), `${expected.file} duplicates another hosted font`);
  hashes.add(digest);

  const record = manifest.fonts?.[expected.family];
  assert.ok(record, `manifest is missing ${expected.family}`);
  assert.equal(record.file, expected.file);
  assert.equal(record.source, expected.source);
  assert.equal(record.bytes, bytes.length);
  assert.equal(record.codePointCount, manifest.subsetCodePointCount);
  assert.equal(record.sha256, digest);
}

const serifRule = /:global\(html\[data-reader-font="serif"\]\) \.root\s*{([\s\S]*?)}/.exec(readerCss)?.[1];
const sansRule = /:global\(html\[data-reader-font="sans"\]\) \.root\s*{([\s\S]*?)}/.exec(readerCss)?.[1];
assert.ok(serifRule, "missing serif reader rule");
assert.ok(sansRule, "missing sans reader rule");
assert.equal(propertyValue(serifRule, "--reader-body-family"), "var(--f-cjk-serif)");
assert.equal(propertyValue(serifRule, "--reader-quote-family"), "var(--f-cjk-fangsong)");
assert.notEqual(propertyValue(serifRule, "--reader-body-family"), propertyValue(sansRule, "--reader-body-family"));
assert.doesNotMatch(sansRule, /UN Canon ST(?:Song|Fangsong|Kaiti)/);
assert.match(readerCss, /\.body :global\(p\)\s*{[\s\S]*?font-family\s*:\s*var\(--reader-body-family\)\s*;/);
assert.match(readerCss, /\.serifSample\s*{\s*font-family\s*:\s*var\(--f-cjk-serif\)\s*;/);

const corpusFiles = corpusRoots.flatMap((directory) => walkTextFiles(path.join(root, directory)));
const publicText = path.join(root, "public", "llms.txt");
if (fs.existsSync(publicText)) corpusFiles.push(publicText);
const siteCodePoints = new Set([...alwaysInclude].map((character) => character.codePointAt(0)));
for (const file of corpusFiles) {
  for (const character of readUtf8(file)) {
    const codePoint = character.codePointAt(0);
    if (isCjkTextCodePoint(codePoint)) siteCodePoints.add(codePoint);
  }
}
const siteCodePointPayload = [...siteCodePoints]
  .sort((left, right) => left - right)
  .map((codePoint) => codePoint.toString(16).toUpperCase())
  .join(",");
const siteCodePointDigest = crypto.createHash("sha256").update(siteCodePointPayload).digest("hex");
assert.equal(manifest.siteCodePointCount, siteCodePoints.size, "hosted CJK subsets are stale; regenerate them");
assert.equal(manifest.siteCodePointSha256, siteCodePointDigest, "hosted CJK subsets are stale; regenerate them");

console.log(
  `hosted CJK font contract passed (${manifest.subsetCodePointCount} code points across ${expectedFonts.length} WOFF2 files)`
);
