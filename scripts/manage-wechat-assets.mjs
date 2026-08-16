import path from "node:path";

const root = process.cwd();

process.env.ARCHIVE_ASSET_DIR ??= path.join(root, "public", "attachments", "wechat");
process.env.ARCHIVE_ASSET_MANIFEST ??= path.join(
  root,
  "editorial-sources",
  "wechat",
  "assets-manifest.json",
);
process.env.ARCHIVE_ASSET_KEY_ROOT ??= "wechat";
process.env.ARCHIVE_ASSET_REQUIRE_PROMOTION ??= "1";
process.env.ARCHIVE_ASSET_SELECT_PREFIX ??= process.env.WECHAT_ASSET_KEY_PREFIX ?? "";

await import("./manage-roof-assets.mjs");
