# cv10934558 编辑证据

- 原始快照：`editorial-sources/roof-archive/cv10934558.json`，与 `.local-archive/bilibili-raw/source-archive/articles/cv10934558.json` 字节一致；SHA-256 `6188a0500c7a566a80242ab04c22ec6eeb733d628abc2c8a73833f6824059904`。快照内置完整性值为 `f8c7f35db3106ec168428e24c422f41a401ee2da00845c60b8c33cc7dc909288`。
- 来源为 Bilibili 专栏 `cv10934558`（opus `515297729368480699`），原始发布日期 2021-04-19 14:58（Asia/Shanghai），来源 URL 为 <https://www.bilibili.com/opus/515297729368480699>。标题明确标为第五章上篇；序列上篇之后为下篇 `cv10995449`，没有把两篇合并。
- 结构化正文共 105 个顶层段落，原始图片引用 29 项。逐项检查后仅保留 3 张文章论证图，均按原始字节本地化：`figure-1.png`（80 年代节目中的柄谷行人）、`figure-2.png`（现代思想界棒球赛）、`figure-3.png`（中森明夫与柄谷行人照片）。其余 26 项为封面、头像、会员装饰、应用图标、文章导航卡及响应式副本，未进入公开正文。正文图题依原文位置置于图像之前；资产 SHA-256 与 `editorial-sources/roof-archive/assets-manifest.json` 一致。
- 正文由结构化文本恢复，保留章节标题、引文、译者注及三处图题；删除平台统计、投稿 CTA、作者卡与前后篇导航噪音。HTML 实体与不间断空格按项目规范解码；汉字邻接半角连字符改为全角连接号，ASCII 双引号改为弯引号。
- 署名边界：原作者佐佐木敦；译者阿栖、柴来人；校对柴来人。分类为翻译，栏目 `[思想与理论]`。标签采用已有的日本思想史、佐佐木敦、柄谷行人、浅田彰、后现代，并加入本章标题及论述核心人物福田和也、大塚英志、宫台真司；三人均在正文中承担持续讨论对象，且可与既有相关条目检索复用。
- 底本链：佐佐木敦《ニッポンの思想》（讲谈社现代新书，2009，ISBN 9784062880091）；本篇为第五章上篇中译，序章及其他章节另文发布。
- 交付文件：`source/_posts/nippon-thought-chapter-5-1990s-three-people-upper.md`、本证据说明、三项 `public/attachments/roof-archive/cv10934558/` 资产及完整 JSON 快照。未修改共享 book manifest。

## 定向核验

- `cmp -s` 快照与原始 JSON：通过。
- `npm run verify:typography -- --file source/_posts/nippon-thought-chapter-5-1990s-three-people-upper.md`：通过；全语料渲染扫描 186 篇通过。
- `npm run verify:han-script -- --file source/_posts/nippon-thought-chapter-5-1990s-three-people-upper.md`：通过。
- `npm run validate:media-html`：通过。
- `npm run audit:tags`：通过（normalized collisions 0）。
- `git diff --check`：通过。
- `npm run validate:content -- --file ...` 会扫描全局语料并仍报告既有 `nippon-thought-chapter-5-three-men-latter.md` 的格式问题；本篇 `cv10934558` 无新增错误。
