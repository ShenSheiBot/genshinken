# cv7047703 编辑证据说明

## 来源、版本、时间与署名

- 完整源快照为 `editorial-sources/roof-archive/cv7047703.json`，由 `.local-archive/bilibili-raw/source-archive/articles/cv7047703.json` 原样复制并以 `cmp` 核验；文件 SHA-256 为 `da0adc18dbae2f464d3d0132853b1674114a468f7f9ab76caf51a1a75c1682cf`，快照内嵌完整性值为 `ca1f54b9c2f3cf3c4399830456989c795b0f9944152b5c967bbd964b26766bd4`。
- Bilibili 专栏号为 `cv7047703`，opus 为 `419960429030718184`；请求地址为 `https://www.bilibili.com/read/cv7047703/`，解析后的规范地址为 `https://www.bilibili.com/opus/419960429030718184`。发布账号模块明确为屋顶现视研（mid `355943807`）。
- listing `publish_time`、作者模块 `pub_ts` 均为 Unix `1596618057`，即北京时间 `2020-08-05 17:00:57`；页面显示 `2020年08月05日 17:00`。`ctime` 为 `1596617685`，`mtime` 为 `1596618005`，均早于公开时间，未发现发布后的实质修订证据，因此只写 `date: 2020-08-05`，不写 `updated`。
- 正文来源块逐字给出原题“弗里德里希·谢林（Friedrich Schelling）”、SEP URL、版本信息“First published Mon Oct 22, 2001; substantive revision Mon May 18, 2020”、原作者 Andrew Bowie、译者 `@何啸风` 与校对“若干网哲邻人部部员”。Andrew Bowie 与何啸风已在 `lib/contributors.ts` 登记；校对来源没有给出可公开登记的个人姓名，front matter 省略 `proofreader`，公开来源说明与本证据保留其匿名集体角色，不将“若干部员”擅自扩展为网哲邻人部整体或任何个人。
- 固定来源版本核对为 [SEP Summer 2020 Schelling entry](https://plato.stanford.edu/archives/sum2020/entries/schelling/)：页面标题为 *Friedrich Wilhelm Joseph von Schelling*，明确列出初版 2001-10-22、实质修订 2020-05-18，以及第 1 至第 5 节；其后依次进入 Bibliography、Academic Tools、Other Internet Resources 与 Related Entries。本稿 citation 使用 `bookSection`、Summer 2020 版与该固定 URL，不把当前网页或抓取日期当作原文版本。
- 原发布页文集模块为“SEP 翻译”（id `305897`，共 22 篇）。这是平台层的宽集合，包含不同 SEP 词条，不能单独证明谢林词条的书级章节边界；本稿只据正文目录、固定 SEP 页面和篇末边界描述收录导言及第 1～5 节。

## 正文结构与保真处理

- 结构化正文共 93 个顶层段落：普通文本 77、图片段 1、结构化 blockquote 15。已完整读取 `rawPageState.detail.modules[4].module_content.paragraphs`，没有使用 `renderedText` 代替结构源。逐段去空白、标点后核验，除来源块、平台元数据和空段外，公开稿覆盖 p4 至 p92 的全部实质段落；p1 图片、p2 灰色居中图注与 p5 目录均保留。
- p0 来源块没有作为正文论述重复出现：原作者、译者、匿名校对、SEP 版本与授权关系进入页面前置来源说明和 citation；“欢迎私信加入”等通用招募 CTA 不在官方文章正文重复。原文“网哲邻人部授权屋顶转载翻译，供学人阅览”保留为授权关系说明。
- p5 的纯文本目录有五个明确条目，恢复为 `## 目录` 下的 CommonMark 无序列表；它不是抓取生成的站点导航，而是原译文的文章结构。目录写作“同一性哲学”，正文第 3 节原生粗体标题写作“3.同一哲学”，两者差异按来源分别保留，没有凭 SEP 英文目录擅自改写正文标题。
- p7、p10、p38、p59、p75 的 24px 粗体段落分别恢复为 `## 1. 生平`、`## 2. 先验哲学和自然哲学`、`## 3. 同一哲学`、`## 4. 世界时代`、`## 5. 肯定哲学和否定哲学，对黑格尔的批判`。标题只补必要空格和全角标点，不改变章节措辞。
- 15 个结构 blockquote 中，p0 为来源块、p5 为目录；其余 13 个为康德、费希特、谢林等的整段引文，逐段恢复为 Markdown blockquote，并保留 SW、WA、Kant、Fichte 等原出处标记。原文没有脚注节点、参考文献列表、链接卡或表格；没有凭 SEP 原网页书目另造参考文献。原词条 Bibliography 等附录不在中文稿覆盖范围内，citation extra 已明确注明。
- 确定的机械排版修复均不改动译文论点：中文语境年份区间的半角 `-` 改为全角 `－`；汉字相邻的 `再-现` 改为 `再－现`；引文出处处补齐成对括号、去除一处多余的 `（(`，并把两处明确的半角冒号／引号闭合改为中文全角形式；由后接整段 blockquote 证明的段末补 `：`。这些修复对应 TYPO-P1/P3/P4/P5，逐项以源段句法与引文边界可验证。
- p1 的正文图片不是作者卡、平台头像或装饰：它是谢林、康德、黑格尔三人肖像拼图，p2 紧随其后的灰色居中文字“谢林，康德，黑格尔”是原生图注。公开稿以本地化图片和图注保留这一文章特定材料。

## 图片引用逐项判定与资产

`content.imageReferences` 共 10 项；`illustration-index.json` 将本篇正文插图计为 1 项，唯一 placement 为 `module_content.paragraphs[1].pic.pics[0]`，865×377。所有可下载引用均已逐项解码目检；平台 UI 引用保留在源快照和本说明，不复制到正文资产。

1. `module_top.display.album.pics[0]`，865×254，是正文三人肖像图的顶部横向裁切，仅属 Bilibili 顶部相册／封面字段；不作为独立正文图片。
2. `module_author.avatar`，300×300，屋顶现视研账号头像，属于平台作者模块，不入文章。
3. `module_author.vip.label.path`，160×64，简体“年度大会员”标签，属于平台会员 UI，不入文章。
4. `module_author.vip.label.img_label_uri_hans_static`，207×60，简体年度会员静态标签，属于平台会员 UI，不入文章。
5. `module_author.vip.label.img_label_uri_hant_static`，207×60，繁体年度会员静态标签，属于平台会员 UI，不入文章。
6. `module_author.decoration_card.card_url`，438×132，账号“冰糖IO 蜕变·闪耀粉丝”装扮卡，属于平台作者模块，不入文章。
7. `module_content.paragraphs[1].pic.pics[0]`，865×377，谢林、康德、黑格尔肖像拼图；这是唯一实质正文插图，已复制为 `public/attachments/roof-archive/cv7047703/01-schelling-kant-hegel.png`，SHA-256 为 `2dd111bb22642da2d2ac57ec721d5a4a40c5a690a56339a9c87849ac8e63ff88`。
8. `module_bottom.share_info.pic`，`https://static.hdslb.com/mobile/img/app_logo.png`，Bilibili 分享模块 App 图标；当前抓取端返回 502，未复制，路径字段已足以确认其平台分享 UI 身份。
9. `$renderedContent.img` 的 `@1192w.avif`，实际响应尺寸 865×377，画面与 p1 原图一致，是同一正文图的响应式规格副本，不另存。
10. `$renderedContent.img` 的 `@1192w.webp`，实际响应尺寸 865×377，画面与 p1 原图一致，是同一正文图的另一响应式规格副本，不另存。

源快照仍完整保存所有 10 条引用、顶部相册字段、listing `banner_url` 与 `origin_image_urls`；正文只保留第 7 项这张实质图片，符合“保留文章特定材料、剔除平台 UI”的规则。

## 系列、重复、版本与来源关系

- 对 `.local-archive/bilibili-raw/source-archive/articles` 全 376 篇以标题、SEP `schelling` URL、固定 Summer 2020 URL、原作者 Andrew Bowie 和正文独有句子交叉检索，唯一命中为 `cv7047703`。未发现旧稿、同文重发、另一中文译本或发布后实质修订页。
- 本文没有结构化 link card、篇号、前后篇链接、续作声明或“第 n 节”标题；“SEP 翻译”22 篇文集是平台聚合，不足以把本篇与其他 SEP 译文伪造为同一谢林连载。建议作为独立 `bookSection` 译文保留，不修改共享 books manifest。
- 与固定 SEP Summer 2020 页面逐节对照，本稿从导言开始，连续覆盖 `1. Career`、`2. Transcendental Philosophy and Naturphilosophie`、`3. Identity Philosophy`、`4. The ‘Ages of the World’`、`5. Positive and Negative Philosophy, and the Critique of Hegel`，末段之后即是原网页 Bibliography；因此可确认叙述正文五节完整，但不能宣称翻译了原网页的书目、学术工具、网络资源或相关词条附录。

## 分类与标签

- 文类为译文，栏目 `思想与理论`、section `translation`。文章不是屋顶活动公告，也不是平台“人文历史”分类的机械搬运。
- 标签通过 `rg` 回读现有 front matter 与正文后保留四项：`谢林`（全文主角、标题对象，稳定思想家检索入口）；`德国观念论`（导言和第 2～5 节的总问题框架，且与现有黑格尔／SEP 理论文形成思想史检索路径）；`自然哲学`（导言明确列为谢林重要贡献，第 2 节的核心论证与后文生态问题均围绕它展开）；`黑格尔`（第 1、3、5 节反复实质讨论，且为现有稳定标签）。没有把康德、费希特、斯宾诺莎、尼采等仅因引文或比较出现的人物逐一建为标签，也没有把“世界时代”“肯定哲学”等章节局部术语拆成独立导航标签。

## 定向门禁

- `npm run validate:content`：通过，0 项非阻塞警告。
- `npm run verify:typography`：通过。
- `npm run verify:citations`：通过。
- `npm run verify:han-script`：通过。
- 结构覆盖脚本逐段核验通过；源快照与归档副本 `cmp` 通过；正文唯一资产路径存在且字节／SHA-256 已记录。
- 未运行共享 build/dev，未修改 `lib/contributors.ts`、books、topics、tag aliases、preservation manifest、runtime 或 docs。
