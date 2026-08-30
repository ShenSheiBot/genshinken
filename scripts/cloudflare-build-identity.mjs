import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CONTENT_PREFIXES = [
  "attachments/",
  "editorial-sources/",
  "public/attachments/",
  "public/fonts/",
  "public/images/",
  "public/roof-elements/",
  "public/translations/",
  "source/",
];
const CONTENT_FILES = new Set([
  "app/cjk-fonts.generated.css",
  "app/translation-fonts.generated.css",
  "public/fc35b5fe34ab40b6a84ab4449aeccce9.txt",
  "public/llms.txt",
]);
const CONTRIBUTORS_PATH = "lib/contributors.ts";
const CONTRIBUTORS_START = "export const CONTRIBUTORS = [";
const CONTRIBUTORS_END = "] as const satisfies readonly Contributor[];";

export function isPublicationContentPath(relativePath) {
  return (
    CONTENT_FILES.has(relativePath) ||
    CONTENT_PREFIXES.some((prefix) => relativePath.startsWith(prefix))
  );
}

function contributorRuntimeShape(bytes) {
  const source = bytes.toString("utf8");
  const start = source.indexOf(CONTRIBUTORS_START);
  const end = source.indexOf(CONTRIBUTORS_END, start + CONTRIBUTORS_START.length);
  if (start < 0 || end < 0) {
    throw new Error("lib/contributors.ts no longer has the expected static contributor registry.");
  }
  return Buffer.from(
    `${source.slice(0, start)}${CONTRIBUTORS_START}\n  /* publication data */\n${source.slice(end)}`,
  );
}

function listedFiles(root) {
  const result = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "utf8" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`git ls-files exited with status ${result.status}: ${result.stderr || ""}`);
  }
  return result.stdout.split("\0").filter(Boolean).sort();
}

function hashExternalInput(digest, root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  digest.update(`external:${relativePath}\0`);
  if (fs.existsSync(absolutePath)) {
    digest.update("present\0");
    digest.update(fs.readFileSync(absolutePath));
  } else {
    digest.update("absent\0");
  }
  digest.update("\0");
}

export function cloudflareBuildIdentity(root, target, runtimeEnvironment = process.env) {
  const digest = crypto.createHash("sha256");
  digest.update("roof-cloudflare-compatible-build-v1\0");
  digest.update(`${process.version}\0${process.platform}\0${process.arch}\0`);
  digest.update(target);
  digest.update("\0");
  for (const key of ["LANG", "LC_ALL", "CI"]) {
    digest.update(`${key}\0${runtimeEnvironment[key] ?? ""}\0`);
  }

  for (const relativePath of [
    "node_modules/.package-lock.json",
    ".env",
    ".env.local",
    ".env.production",
    ".env.production.local",
  ]) {
    hashExternalInput(digest, root, relativePath);
  }

  for (const relativePath of listedFiles(root)) {
    if (isPublicationContentPath(relativePath)) continue;
    const absolutePath = path.join(root, relativePath);
    digest.update(relativePath);
    digest.update("\0");
    if (!fs.existsSync(absolutePath)) {
      digest.update("deleted\0");
      continue;
    }
    const stat = fs.lstatSync(absolutePath);
    digest.update(`${stat.isSymbolicLink() ? "symlink" : "file"}:${stat.mode & 0o111}\0`);
    const bytes = stat.isSymbolicLink()
      ? Buffer.from(fs.readlinkSync(absolutePath))
      : fs.readFileSync(absolutePath);
    digest.update(relativePath === CONTRIBUTORS_PATH ? contributorRuntimeShape(bytes) : bytes);
    digest.update("\0");
  }

  return digest.digest("hex").slice(0, 24);
}
