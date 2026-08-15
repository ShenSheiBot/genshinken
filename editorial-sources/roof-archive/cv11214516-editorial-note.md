# cv11214516 编辑证据

- 原始快照 `editorial-sources/roof-archive/cv11214516.json` 与 `.local-archive/bilibili-raw/source-archive/articles/cv11214516.json` 字节一致，SHA-256 `ca5b84b3c9e72581634697c4cecd1a7b85b23285b946ea9324f839e70041de15`；快照内置完整性值 `8ab93ace68ecc9f1d438ea68634e6fe95bd7631babe4ba83750a75c16918dc61`。
- 来源为 Bilibili 专栏 `cv11214516`（opus `522806577743162125`），原始发布日期 2021-05-09，来源 URL <https://www.bilibili.com/opus/522806577743162125>。标题为《Nipponの思想》第六章“作为‘坏的场所’的日本国”，承接第五章下篇 `cv10995449`，本篇为单独第六章，没有与前篇合并。
- 结构化正文共 287 行文本，图片引用 10 项；逐项核验后均为封面、头像、会员装饰、应用图标或第五章下篇导航卡，没有文章语义正文图，因此公开正文保留 0 张图，也未新增附件或资产清单条目。
- 正文恢复章节标题、段落与译者注，删除平台统计、作者卡、联合协作 CTA 和前篇导航噪音。HTML 实体与不间断空格按规范处理；补齐来源中作为独立书名/出处的段落句读，并将汉字相邻半角连字符改为全角连接号。
- 署名边界：原作者佐佐木敦；译者萤泽、顾森；校对宇宙尘埃、柴来人。分类为翻译，栏目 `[思想与理论]`。标签使用已有的日本思想史、佐佐木敦、大塚英志、宫台真司、村上隆、小林善纪、御宅族、后现代、天皇制，覆盖本章反复讨论的九十年代思想、御宅文化、“J 回归”与日本国问题。
- 底本链：佐佐木敦《ニッポンの思想》（讲谈社现代新书，2009，ISBN 9784062880091）；本篇为第六章中译，接续第五章下篇。
- 交付文件：`source/_posts/nippon-thought-chapter-6-bad-place-japan.md`、本证据说明、完整 JSON 快照。未修改共享 book manifest。

## 定向核验

- `cmp -s` 快照与原始 JSON：通过。
- `npm run verify:typography -- --file source/_posts/nippon-thought-chapter-6-bad-place-japan.md`：通过；全语料渲染扫描通过。
- `npm run verify:han-script -- --file source/_posts/nippon-thought-chapter-6-bad-place-japan.md`：通过。
- `npm run verify:citations -- --file source/_posts/nippon-thought-chapter-6-bad-place-japan.md`：通过。
- `npm run validate:media-html`、`npm run audit:tags`、`git diff --check`：通过。
- `npm run validate:content -- --file ...`：本篇修复后无新增错误；若全局仍有其他文章报告，应按文件名区分。
