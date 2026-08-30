import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { cloudflareBuildIdentity } from "../scripts/cloudflare-build-identity.mjs";

function write(root, relativePath, contents) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

function contributorFile(entry, logic = "export const contributorLogic = 1;\n") {
  return `export const CONTRIBUTORS = [\n  ${entry}\n] as const satisfies readonly Contributor[];\n${logic}`;
}

test("content-only edits retain a build identity while runtime edits change it", (t) => {
  const root = fs.mkdtempSync(path.join(process.cwd(), ".cloudflare-build-identity-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "-q"], { cwd: root });
  write(root, ".gitignore", ".env*\nnode_modules/\n");
  write(root, "app/page.tsx", "export default function Page() { return null; }\n");
  write(root, "source/_posts/a.md", "first article\n");
  write(root, "public/images/cover.png", "first image\n");
  write(root, "public/_headers", "/assets/*\n  Cache-Control: max-age=60\n");
  write(root, "public/sw.js", "self.addEventListener('fetch', () => {});\n");
  write(root, "lib/contributors.ts", contributorFile('{ id: "a" },'));
  execFileSync("git", ["add", "."], { cwd: root });

  const initial = cloudflareBuildIdentity(root, "production");
  write(root, "source/_posts/a.md", "revised article\n");
  write(root, "public/images/cover.png", "revised image\n");
  write(root, "lib/contributors.ts", contributorFile('{ id: "b" },'));
  assert.equal(cloudflareBuildIdentity(root, "production"), initial);

  write(root, ".env.production.local", "PRIVATE_BUILD_INPUT=changed\n");
  assert.notEqual(cloudflareBuildIdentity(root, "production"), initial);
  write(root, ".env.production.local", "absent");
  assert.notEqual(cloudflareBuildIdentity(root, "production"), initial);
  fs.unlinkSync(path.join(root, ".env.production.local"));
  write(root, "node_modules/.package-lock.json", '{"lockfileVersion":3}\n');
  assert.notEqual(cloudflareBuildIdentity(root, "production"), initial);
  fs.rmSync(path.join(root, "node_modules"), { recursive: true, force: true });

  write(root, "lib/contributors.ts", contributorFile('{ id: "b" },', "export const contributorLogic = 2;\n"));
  assert.notEqual(cloudflareBuildIdentity(root, "production"), initial);
  write(root, "lib/contributors.ts", contributorFile('{ id: "b" },'));
  write(root, "public/_headers", "/assets/*\n  Cache-Control: max-age=3600\n");
  assert.notEqual(cloudflareBuildIdentity(root, "production"), initial);
  write(root, "public/_headers", "/assets/*\n  Cache-Control: max-age=60\n");
  write(root, "public/sw.js", "self.addEventListener('install', () => {});\n");
  assert.notEqual(cloudflareBuildIdentity(root, "production"), initial);
  write(root, "public/sw.js", "self.addEventListener('fetch', () => {});\n");
  write(root, "app/new-runtime.ts", "export const runtimeChange = true;\n");
  assert.notEqual(cloudflareBuildIdentity(root, "production"), initial);
  assert.notEqual(
    cloudflareBuildIdentity(root, "production", { LANG: "ja_JP.UTF-8" }),
    cloudflareBuildIdentity(root, "production", { LANG: "C" }),
  );
  assert.notEqual(
    cloudflareBuildIdentity(root, "preview"),
    cloudflareBuildIdentity(root, "production"),
  );
});
