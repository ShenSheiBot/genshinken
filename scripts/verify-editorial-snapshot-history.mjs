import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POLICY_FILES = new Set([
  "editorial-sources/README.md",
  "editorial-sources/preservation-manifest.json",
  "editorial-sources/roof-archive/README.md",
  "editorial-sources/roof-archive/assets-manifest.json",
  "editorial-sources/wechat/assets-manifest.json",
  "editorial-sources/wechat/preservation-manifest.json",
  "editorial-sources/tag-aliases.json",
]);

function git(args, allowFailure = false) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    if (allowFailure) return "";
    const stderr = error.stderr?.toString().trim();
    throw new Error(`git ${args.join(" ")} failed${stderr ? `: ${stderr}` : ""}`);
  }
}

function commitExists(reference) {
  if (!reference || /^0+$/.test(reference)) return false;
  return git(["rev-parse", "--verify", `${reference}^{commit}`], true).length > 0;
}

function defaultBaseReference() {
  const configured = process.env.PRESERVATION_BASE_REF?.trim();
  if (commitExists(configured)) return configured;

  const branch = git(["branch", "--show-current"], true);
  if (branch && branch !== "main" && commitExists("origin/main")) {
    const mergeBase = git(["merge-base", "HEAD", "origin/main"], true);
    if (commitExists(mergeBase)) return mergeBase;
  }

  return "HEAD";
}

function protectedSnapshot(pathname) {
  const normalized = pathname.replaceAll("\\", "/");
  const editableEditorialNote = /-editorial-note\.md$/u.test(normalized);
  return normalized.startsWith("editorial-sources/")
    && !POLICY_FILES.has(normalized)
    && !editableEditorialNote;
}

assert.equal(
  protectedSnapshot("editorial-sources/wechat/example-editorial-note.md"),
  false,
  "human editorial notes must remain directly correctable",
);
assert.equal(
  protectedSnapshot("editorial-sources/wechat/example-source.json"),
  true,
  "source snapshots must remain append-only",
);

function changedProtectedSnapshots(baseReference) {
  const output = git([
    "diff",
    "--name-status",
    "--find-renames",
    "--diff-filter=MDTR",
    baseReference,
    "--",
    "editorial-sources",
  ]);
  if (!output) return [];

  const violations = [];
  for (const line of output.split("\n")) {
    const [status, ...paths] = line.split("\t");
    const protectedPaths = paths.filter(protectedSnapshot);
    if (protectedPaths.length > 0) violations.push({ status, paths: protectedPaths });
  }
  return violations;
}

const hasGitRepository = Boolean(git(["rev-parse", "--git-dir"], true));
if (!hasGitRepository) {
  if (process.env.VERCEL === "1") {
    console.log("editorial snapshot history check skipped: Vercel build archive has no .git metadata");
    process.exit(0);
  }
  assert.fail("cannot resolve preservation baseline: no Git repository metadata");
}

const baseReference = defaultBaseReference();
assert.ok(commitExists(baseReference), `cannot resolve preservation baseline ${baseReference}`);
const violations = changedProtectedSnapshots(baseReference);
if (violations.length > 0) {
  const details = violations.map(({ status, paths }) => `  ${status}\t${paths.join(" -> ")}`).join("\n");
  throw new Error(
    `registered editorial snapshots are append-only relative to ${baseReference}.\n` +
      `${details}\n` +
      "Do not modify, delete, or rename an existing source snapshot. Human editorial notes and policy manifests are exempt.",
  );
}
console.log(`editorial snapshot history is append-only relative to ${baseReference}`);
