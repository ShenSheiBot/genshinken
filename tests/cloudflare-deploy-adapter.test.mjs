import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deployScript = path.join(repositoryRoot, "scripts", "deploy-cloudflare.mjs");

test("a configured Wrangler adapter survives repository-local binary resolution", () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "roof-wrangler-adapter-"));
  const adapter = path.join(temporaryRoot, "wrangler-adapter.mjs");
  const receipt = path.join(temporaryRoot, "receipt.json");
  const localWrangler = path.join(repositoryRoot, "node_modules", ".bin", "wrangler");
  const originalTarget = fs.readlinkSync(localWrangler);
  const versionId = "12345678-1234-1234-1234-123456789abc";

  fs.writeFileSync(
    adapter,
    `#!/usr/bin/env node\nimport fs from "node:fs";\nfs.writeFileSync(${JSON.stringify(receipt)}, JSON.stringify(process.argv.slice(2)));\n`,
  );
  fs.chmodSync(adapter, 0o755);

  try {
    const result = spawnSync(process.execPath, [deployScript, "preview", "promote", versionId, "--dry-run"], {
      cwd: repositoryRoot,
      env: { ...process.env, ROOF_WRANGLER_BIN: adapter },
      encoding: "utf8",
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.deepEqual(JSON.parse(fs.readFileSync(receipt, "utf8")), [
      "versions",
      "deploy",
      `${versionId}@100`,
      "--env",
      "preview",
      "--yes",
      "--dry-run",
    ]);
    assert.equal(fs.readlinkSync(localWrangler), originalTarget);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
