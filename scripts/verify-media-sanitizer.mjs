import assert from "node:assert/strict";
import { sanitizeMediaMaterial } from "../lib/media-material.ts";

const malicious = `
  <p class="keep" data-state="safe" aria-label="正文" onclick="alert(1)" style="color:red">
    正文<a href="javascript:alert(1)">危险链接</a>
  </p>
  <script>document.body.innerHTML = '<video controls></video>'</script>
  <style>body { display: none }</style>
  <iframe src="https://example.com/player"><a href="https://example.com/fallback">后备链接</a></iframe>
  <video controls><source src="movie.mp4"><span>视频后备内容</span></video>
  <audio controls>音频后备内容</audio>
  <object data="movie.swf">对象后备内容</object>
  <embed src="movie.swf">
  <img src="/attachments/cover.png" alt="封面" onerror="alert(2)">
  <a href="https://example.com/watch" target="_blank" rel="noopener noreferrer">安全站外链接</a>
`;

const clean = sanitizeMediaMaterial(malicious);

assert.doesNotMatch(clean, /<(?:script|style|iframe|video|audio|object|embed|source)\b/i);
assert.doesNotMatch(clean, /\son[a-z][\w:-]*\s*=/i);
assert.doesNotMatch(clean, /\sstyle\s*=/i);
assert.doesNotMatch(clean, /javascript:|movie\.mp4|movie\.swf|后备链接|后备内容/i);
assert.doesNotMatch(clean, /document\.body|display:\s*none/i);
assert.match(clean, /<p class="keep" data-state="safe" aria-label="正文">/);
assert.match(clean, /<img src="\/attachments\/cover\.png" alt="封面" \/>/);
assert.match(clean, /<a href="https:\/\/example\.com\/watch" target="_blank" rel="noopener noreferrer">安全站外链接<\/a>/);

console.log("media material sanitizer verification passed");
