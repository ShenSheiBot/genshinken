import assert from "node:assert/strict";
import { sanitizeMediaMaterial, sanitizePublicContentHtml } from "../lib/media-material.ts";
import { renderMarkdown } from "../lib/markdown.ts";
import { mediaDurationSeconds, readMinutes } from "../lib/reading-time.mjs";

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

const blankTarget = sanitizePublicContentHtml(
  '<a href="https://example.com/read" target="_blank">新窗口链接</a>'
);
assert.match(
  blankTarget,
  /<a href="https:\/\/example\.com\/read" target="_blank" rel="noopener noreferrer">新窗口链接<\/a>/
);

const topicClean = sanitizePublicContentHtml(
  '<p>专题导语</p><script>globalThis.topicXss = 1</script><a href="javascript:alert(1)">危险链接</a>'
);
assert.doesNotMatch(topicClean, /<(?:script|style|iframe|video|audio|object|embed)\b/i);
assert.doesNotMatch(topicClean, /javascript:|topicXss/i);
assert.match(topicClean, /<p>专题导语<\/p>/);

const pageCommentClean = sanitizePublicContentHtml(
  "<p>前文<!-- p.006 -->后文<!-- arbitrary comment --></p>"
);
assert.equal(
  pageCommentClean,
  "<p>前文<!-- p.006 -->后文</p>",
  "numeric source-page comments must survive in place while arbitrary comments are removed"
);

const archiveImage = await renderMarkdown(
  "![归档插图](attachments/roof-archive/cv1530117/01-shanghai-skyline.jpg)"
);
assert.match(
  archiveImage,
  /src="https:\/\/assets\.labonroof\.top\/roof-archive\/cv1530117\/01-shanghai-skyline\.jpg"/u,
  "roof archive images must render from the R2 custom domain"
);

const wechatImage = await renderMarkdown(
  "![微信正文插图](attachments/wechat/example/body-001.jpg)"
);
assert.match(
  wechatImage,
  /src="https:\/\/assets\.labonroof\.top\/wechat\/example\/body-001\.jpg"/u,
  "committed WeChat body images must render from the published R2 collection"
);

const wechatAudio = await renderMarkdown(`
[audio] 地底人×屋顶播客｜参与：钻石、夜深人静、天坑

[收听原音](attachments/wechat-audio/Mzg5MjAwMDM0Nl8yMjQ3NDg5MDU3/original.mp3 "85:41")

![节目封面](attachments/wechat-audio/Mzg5MjAwMDM0Nl8yMjQ3NDg5MDU3/cover-1280x545.jpg "=1280x545")
`);
assert.match(wechatAudio, /<figure class="article-audio">/u);
assert.match(
  wechatAudio,
  /<audio class="article-audio-native" data-roof-audio="r2" data-roof-audio-duration="5141" src="https:\/\/assets\.labonroof\.top\/wechat-audio\/Mzg5MjAwMDM0Nl8yMjQ3NDg5MDU3\/original\.mp3" controls preload="metadata" aria-label="地底人×屋顶播客｜参与：钻石、夜深人静、天坑"><\/audio>/u,
  "an explicit WeChat audio marker must become a native fallback backed only by the R2 audio collection"
);
assert.match(wechatAudio, /class="article-audio-cover"/u);
assert.doesNotMatch(wechatAudio, /\[audio\]|>收听原音</u);

const coverlessWechatAudio = await renderMarkdown(`
[audio] 高橋洋子《残酷天使的行动纲领》｜4分05秒

[收听原音](attachments/wechat-audio/Mzg5MjAwMDM0Nl8yMjQ3NDg5MjY2/original-64kbps.mp3 "04:05")
`);
assert.match(
  coverlessWechatAudio,
  /<figure class="article-audio article-audio-compact">/u,
  "a source-native audio card without published artwork must remain playable without an invented cover"
);
assert.match(coverlessWechatAudio, /<audio class="article-audio-native"/u);
assert.doesNotMatch(coverlessWechatAudio, /article-audio-artwork/u);
assert.doesNotMatch(coverlessWechatAudio, /ROOF PODCAST/u);

const externalAudio = await renderMarkdown(`
[audio] 不受信任的音频

[收听原音](https://example.com/episode.mp3 "85:41")

![节目封面](attachments/wechat-audio/example/cover-1280x545.jpg "=1280x545")
`);
assert.doesNotMatch(externalAudio, /<audio\b/iu, "external MP3 links must never become embedded players");

const neteaseMusic = await renderMarkdown(`
[music] 高橋洋子《魂のルフラン（Tabris Mix）》｜5分29秒

[在网易云音乐收听](https://music.163.com/#/song?id=22806607 "netease:22806607")
`);
assert.match(neteaseMusic, /<figure class="article-music" data-roof-music="netease" data-roof-music-id="22806607"/u);
assert.match(neteaseMusic, /class="article-music-fallback"/u);
assert.doesNotMatch(neteaseMusic, /<iframe\b/iu, "the external player must be added by the strict client adapter, never cross the HTML sanitizer");

const mismatchedMusic = await renderMarkdown(`
[music] 编号不一致的外链

[在网易云音乐收听](https://music.163.com/#/song?id=22806607 "netease:29802889")
`);
assert.doesNotMatch(mismatchedMusic, /<figure class="article-music"/u, "a provider marker may not substitute a different song id");
assert.match(mismatchedMusic, /\[music\]/u, "invalid external music markup must remain visible for editorial review");

const untrustedMusic = await renderMarkdown(`
[music] 不受信任的播放器

[收听](https://example.com/song?id=22806607 "netease:22806607")
`);
assert.doesNotMatch(untrustedMusic, /<figure class="article-music"/u, "only the exact official NetEase song URL may enter the music adapter");

const wechatVideo = await renderMarkdown(`
[video] 枫叶落在水面上的片段

[播放视频](attachments/wechat-video/wxv_1831489258654580737/original-600x338.mp4 "=600x338 00:18")
`);
assert.match(wechatVideo, /<figure class="article-video">/u);
assert.match(
  wechatVideo,
  /<video class="article-video-player" data-roof-video="r2" data-roof-video-duration="18" src="https:\/\/assets\.labonroof\.top\/wechat-video\/wxv_1831489258654580737\/original-600x338\.mp4" poster="https:\/\/assets\.labonroof\.top\/wechat-video\/wxv_1831489258654580737\/poster-600x338\.jpg" controls preload="metadata" playsinline width="600" height="338" aria-label="枫叶落在水面上的片段"><\/video>/u,
  "an explicit WeChat video marker must become a native player backed only by the R2 video collection"
);
assert.match(wechatVideo, /<figcaption class="article-video-caption">枫叶落在水面上的片段<\/figcaption>/u);
assert.doesNotMatch(wechatVideo, /\[video\]|>播放视频</u);

const multiQualityVideo = await renderMarkdown(`
[video] 同名视频论文

[播放视频：1080P](attachments/wechat-video/wxv_example/original-1920x1080.mp4 "=1920x1080 01:30")

[播放视频：480P](attachments/wechat-video/wxv_example/quality-480-854x480.mp4 "=854x480 01:30")
`);
assert.match(multiQualityVideo, /data-roof-video-sources=/u);
assert.match(multiQualityVideo, /data-roof-video-duration="90"/u);
assert.match(multiQualityVideo, /1080P/u);
assert.match(multiQualityVideo, /480P/u);
assert.equal((multiQualityVideo.match(/<video\b/gu) ?? []).length, 1);
assert.doesNotMatch(multiQualityVideo, />播放视频[：:]?/u);
assert.equal(mediaDurationSeconds(multiQualityVideo), 90, "quality alternatives must count one programme only");
assert.equal(readMinutes(multiQualityVideo), 2, "video duration must contribute to the public reading estimate");
assert.equal(readMinutes(wechatAudio), 86, "audio duration must contribute to the public reading estimate");

const inconsistentVideoDuration = await renderMarkdown(`
[video] 时长声明冲突

[播放视频：1080P](attachments/wechat-video/wxv_example/original-1920x1080.mp4 "=1920x1080 01:30")

[播放视频：480P](attachments/wechat-video/wxv_example/quality-480-854x480.mp4 "=854x480 01:31")
`);
assert.doesNotMatch(inconsistentVideoDuration, /<video\b/iu, "quality alternatives must declare one shared duration");
assert.match(inconsistentVideoDuration, /\[video\]/u, "invalid duration metadata must remain visible for the corpus gate");

const unsafeQualitySet = sanitizePublicContentHtml(`
<video
  class="article-video-player"
  data-roof-video="r2"
  data-roof-video-duration="90"
  data-roof-video-sources='[{"label":"1080P","width":1920,"height":1080,"src":"https://example.com/movie.mp4"}]'
  src="https://assets.labonroof.top/wechat-video/example/original-1920x1080.mp4"
  poster="https://assets.labonroof.top/wechat-video/example/poster-1920x1080.jpg"
  controls
></video>
`);
assert.doesNotMatch(unsafeQualitySet, /<video\b/u, "a quality set may not smuggle an external media host past the sanitizer");

const externalVideo = await renderMarkdown(`
[video] 不受信任的视频

[播放视频](https://example.com/movie.mp4 "=600x338 00:18")
`);
assert.doesNotMatch(externalVideo, /<video\b/iu, "external MP4 links must never become embedded players");

const dimensionlessVideo = await renderMarkdown(`
[video] 缺少源尺寸

[播放视频](attachments/wechat-video/example/original.mp4)
`);
assert.doesNotMatch(dimensionlessVideo, /<video\b/iu, "a video without a declared source size must not enter the player path");
assert.match(dimensionlessVideo, /\[video\]/u, "invalid video markup must stay visible so the corpus typography gate can reject it");

console.log("media material sanitizer verification passed");
