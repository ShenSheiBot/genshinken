import assert from "node:assert/strict";
import test from "node:test";
import { extractWorkerVersionId } from "../scripts/cloudflare-preview-version.mjs";

test("extracts the Worker Version ID from Wrangler upload output", () => {
  assert.equal(
    extractWorkerVersionId("Worker Version ID: c64ee037-47a4-48c3-a8d9-7b93d9000314"),
    "c64ee037-47a4-48c3-a8d9-7b93d9000314",
  );
});

test("fails closed when an upload has no version id", () => {
  assert.throws(
    () => extractWorkerVersionId("Uploaded roof-genshinken-a8f3d7c2"),
    /without a readable Worker Version ID/u,
  );
});
