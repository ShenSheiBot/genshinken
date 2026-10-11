import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireSuccessfulQuality, previewVersionCommit } from "../scripts/preview-quality.mjs";

const commit = "a".repeat(40);
const passed = { databaseId: 1, headSha: commit, status: "completed", conclusion: "success" };
test("preview requires the latest Quality result for the exact commit", () => {
  assert.equal(requireSuccessfulQuality([passed], commit), passed);
  for (const runs of [[], [{ ...passed, headSha: "b".repeat(40) }],
    [passed, { ...passed, databaseId: 2, conclusion: "failure" }],
    [{ ...passed, status: "in_progress", conclusion: null }]]) {
    assert.throws(() => requireSuccessfulQuality(runs, commit), /requires successful Quality/u);
  }
});
test("promotion reads commit identity from the uploaded Worker version", () => {
  assert.equal(previewVersionCommit({ annotations: { "workers/tag": `git-${commit}` } }), commit);
  assert.throws(() => previewVersionCommit({}), /no full Git commit/u);
});

test("deployment entrypoint blocks upload and promotion before external writes", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "roof-quality-gate-"));
  const bin = path.join(root, "node_modules", ".bin");
  const calls = path.join(root, "calls.jsonl");
  const script = fileURLToPath(new URL("../scripts/deploy-cloudflare.mjs", import.meta.url));
  const versionId = "12345678-1234-1234-1234-123456789abc";
  fs.mkdirSync(bin, { recursive: true });
  function executable(name, body) {
    fs.writeFileSync(path.join(bin, name), `#!${process.execPath}\n${body}\n`, { mode: 0o755 });
  }
  executable("git", `if (process.argv[2] === "rev-parse") console.log(${JSON.stringify(commit)});`);
  executable("wrangler", `const fs = require("node:fs");
    fs.appendFileSync(${JSON.stringify(calls)}, JSON.stringify(process.argv.slice(2)) + "\\n");
    if (process.argv[3] === "view") console.log(JSON.stringify({annotations: {"workers/tag": "git-${commit}"}}));`);
  try {
    for (const runs of [[], [{ ...passed, conclusion: "failure" }],
      [{ ...passed, status: "in_progress", conclusion: null }],
      [{ ...passed, headSha: "b".repeat(40) }], [passed]]) {
      executable("gh", `console.log(${JSON.stringify(JSON.stringify(runs))});`);
      const succeeds = runs[0] === passed;
      for (const action of succeeds ? ["promote"] : ["upload", "promote"]) {
        fs.writeFileSync(calls, "");
        const result = spawnSync(process.execPath, [script, "preview", action, versionId], {
          cwd: root,
          env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, ROOF_WRANGLER_BIN: "" },
          encoding: "utf8",
        });
        assert.equal(result.status, succeeds ? 0 : 1, result.stderr);
        const writes = fs.readFileSync(calls, "utf8").trim().split("\n").filter(Boolean)
          .map((line) => JSON.parse(line)).filter((args) => args[1] === "deploy");
        assert.equal(writes.length, succeeds ? 1 : 0);
        if (!succeeds) assert.match(result.stderr, /requires successful Quality/);
      }
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
