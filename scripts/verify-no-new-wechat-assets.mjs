import { execFileSync } from "node:child_process";

const forbiddenPrefix = "public/attachments/wechat/";
const rasterExtension = /\.(?:avif|gif|jpe?g|png|webp)$/iu;

function stagedAdditions() {
  const output = execFileSync(
    "git",
    ["diff", "--cached", "--name-only", "--diff-filter=ACR", "-z", "--"],
    { encoding: "utf8" }
  );
  return output.split("\0").filter(Boolean);
}

const forbidden = stagedAdditions().filter(
  (file) => file.startsWith(forbiddenPrefix) && rasterExtension.test(file)
);

if (forbidden.length > 0) {
  console.error("Refusing to commit newly added WeChat crawl images:");
  for (const file of forbidden) console.error(`  ${file}`);
  console.error(
    "Keep crawl output under .local-archive/. Existing published WeChat assets may be modified, but new raster files must not enter Git."
  );
  process.exitCode = 1;
} else {
  console.log("No newly added WeChat crawl images are staged.");
}
