import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { registerWechatAssets } from "../scripts/register-wechat-assets.mjs";

function fixture() {
  const sourceDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "wechat-assets-"));
  fs.writeFileSync(path.join(sourceDirectory, "images.json"), JSON.stringify({
    schemaVersion: 2,
    cover: {
      file: "assets/cover.jpg",
      downloaded: true,
      bytes: 12,
      sha256: "a".repeat(64),
    },
    body: [{
      file: "assets/body-001.png",
      downloaded: true,
      bytes: 34,
      sha256: "b".repeat(64),
    }],
  }));
  return sourceDirectory;
}

test("registers only images retained by the final Markdown", () => {
  const sourceDirectory = fixture();
  const sourceId = path.basename(sourceDirectory);
  const result = registerWechatAssets({
    manifest: { version: 1, public: true, assets: [] },
    sourceDirectory,
    markdown: `![正文](attachments/wechat/${sourceId}/body-001.png)`,
  });
  assert.deepEqual(result.additions, [{
    key: `wechat/${sourceId}/body-001.png`,
    bytes: 34,
    sha256: "b".repeat(64),
    contentType: "image/png",
  }]);
  assert.equal(result.manifest.assets.length, 1);
});

test("rejects references that are not present in the source image inventory", () => {
  const sourceDirectory = fixture();
  const sourceId = path.basename(sourceDirectory);
  assert.throws(() => registerWechatAssets({
    manifest: { version: 1, public: true, assets: [] },
    sourceDirectory,
    markdown: `![未知](attachments/wechat/${sourceId}/missing.png)`,
  }), /absent from the downloaded source inventory/u);
});

test("is idempotent when the selected image is already registered", () => {
  const sourceDirectory = fixture();
  const sourceId = path.basename(sourceDirectory);
  const asset = {
    key: `wechat/${sourceId}/cover.jpg`,
    bytes: 12,
    sha256: "a".repeat(64),
    contentType: "image/jpeg",
  };
  const result = registerWechatAssets({
    manifest: { version: 1, public: true, assets: [asset] },
    sourceDirectory,
    markdown: `![封面](attachments/wechat/${sourceId}/cover.jpg)`,
  });
  assert.deepEqual(result.additions, []);
  assert.deepEqual(result.manifest.assets, [asset]);
});
