import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ConverterBuilder } from "opencc-js/core";
import * as cn2t from "opencc-js/preset/cn2t";
import * as t2cn from "opencc-js/preset/t2cn";
import {
  DEFAULT_HAN_SCRIPT,
  browserHanScript,
  hanScriptLanguageTag,
  preferredHanScript,
} from "../lib/han-script.ts";

assert.equal(preferredHanScript("hant", ["zh-CN"]), "hant", "saved choice must win");
assert.equal(preferredHanScript("hans", ["zh-TW"]), "hans", "saved choice must win");
assert.equal(browserHanScript(["en-US", "zh-Hant-HK"]), "hant");
assert.equal(browserHanScript(["en-US", "zh-TW"]), "hant");
assert.equal(browserHanScript(["zh-HK"]), "hant");
assert.equal(browserHanScript(["zh-MO"]), "hant");
assert.equal(browserHanScript(["zh-Hans-CN"]), "hans");
assert.equal(browserHanScript(["zh-CN"]), "hans");
assert.equal(browserHanScript(["zh-SG"]), "hans");
assert.equal(browserHanScript(["en-US", "zh"]), DEFAULT_HAN_SCRIPT);
assert.equal(hanScriptLanguageTag("hans"), "zh-Hans");
assert.equal(hanScriptLanguageTag("hant"), "zh-Hant");

const s2t = ConverterBuilder(cn2t)({ from: "cn", to: "t" });
const t2s = ConverterBuilder(t2cn)({ from: "t", to: "cn" });
assert.equal(s2t("软件与头发"), "軟件與頭髮");
assert.equal(s2t("皇后在后台干活"), "皇后在後臺幹活");
assert.equal(t2s("軟件與頭髮"), "软件与头发");
assert.equal(t2s("皇后在後臺幹活"), "皇后在后台干活");
assert.equal(s2t("软件"), "軟件", "zh-Hant mode must not apply Taiwan phrase localization");

const postsDirectory = path.join(process.cwd(), "source", "_posts");
const missingScript = fs.readdirSync(postsDirectory)
  .filter((file) => file.endsWith(".md"))
  .filter((file) => {
    const source = fs.readFileSync(path.join(postsDirectory, file), "utf8");
    return !/^script:\s*(?:hans|hant)\s*$/mu.test(source);
  });
assert.deepEqual(missingScript, [], "every post must declare its source writing system");

const readerChromeSource = fs.readFileSync(
  path.join(process.cwd(), "app", "components", "reading-edition", "ReadingEditionChrome.tsx"),
  "utf8"
);
for (const attribute of ["alt", "title", "aria-label"]) {
  assert.match(
    readerChromeSource,
    new RegExp(`hanSourceAttribute\\(item, "${attribute}"\\)`),
    `reading media fingerprints must use the immutable ${attribute} source`
  );
}

const sourceMedia = ["img", "/figure.png", "", "", "", "", "配图", "后台说明", "打开配图"];
const convertedMedia = sourceMedia.map((value) => s2t(value));
assert.notDeepEqual(
  convertedMedia,
  sourceMedia,
  "the regression fixture must contain attributes changed by Han conversion"
);
const mediaFingerprintInput = (rendered) => [
  ...rendered.slice(0, 6),
  ...sourceMedia.slice(6),
].join(":");
assert.equal(
  mediaFingerprintInput(sourceMedia),
  mediaFingerprintInput(convertedMedia),
  "media fingerprint input must remain stable before and after Han conversion"
);

console.log("繁简偏好、OpenCC 转换方向、文章源文字系统与媒体指纹契约验证通过。");
