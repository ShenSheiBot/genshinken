# cv10307966 编辑证据

- 原始快照与 `.local-archive/bilibili-raw/source-archive/articles/cv10307966.json` 字节一致，SHA-256 `6d1afce2784a7ca1f6535a347da955ca223888075a029c22bf4514013dbf7b5`；快照完整性值 `c16bfaac091f4d8c1bce056df5674c0de91b1f063904743c5744c41b051d761d`。
- 原文作者 kViN 于 2021-02-27 发布在 Sakuga Blog，屋顶现视研获授权翻译转载；Bilibili 发布日期为 2021-03-16，来源 URL <https://blog.sakugabooru.com/2021/02/27/wonder-egg-priority-production-notes-04-07/>。本篇是《奇蛋物语》四至七集制作笔记，直接承接一、二集与第三集制作笔记；未据此建立主题书目。
- 结构化源共有 72 个图片引用：0–9 为封面、作者/平台卡与导航资源；10–36 为 26 张正文动画制作画面，均原字节下载至 `public/attachments/roof-archive/cv10307966/`；37–71 为响应式 AVIF/WebP 或平台重复资源。正文保留 26 张图片并在文末按原资源顺序列出，全部登记至 `editorial-sources/roof-archive/assets-manifest.json`。
- 正文边界从原始首个文章段落“对于动画观众来说”开始，未混入来源授权说明、译校统筹、编辑话、前篇导航及平台追番卡。恢复第 4—7 话标题、分镜/演出/作监/原画名单和作者论述；HTML 实体解码，机械补齐制作名单与图注段落句读。
- 署名：原作者 kViN；译者 lieriheart、Arkgrayhe、生活支线玩家、blur、十文字、頴彧；校对 liebestram、加速器、我大笑三声哈哈哈。分类翻译，栏目 `[动画评论]`。标签 `[奇蛋物语, 动画制作, 演出, 作画分析, 动画产业]`，均指向本篇实际讨论对象和可复用检索入口。
- 交付文件：`source/_posts/wonder-egg-priority-production-notes-episodes-04-07.md`、本证据说明、完整 JSON 快照及 26 项本地图片资产。未修改共享 book manifest。

## 定向核验

- 快照 `cmp -s`：通过。
- `validate:content -- --file`：通过。
- `verify:typography -- --file`、`verify:han-script -- --file`、`verify:citations -- --file`：通过。
- `validate:media-html`、`audit:tags`、`git diff --check`：通过。
