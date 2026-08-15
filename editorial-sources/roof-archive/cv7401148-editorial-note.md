# cv7401148 编辑证据说明

## 来源、版本、时间与署名

- 完整源快照为 `editorial-sources/roof-archive/cv7401148.json`，由 `.local-archive/bilibili-raw/source-archive/articles/cv7401148.json` 原样复制并以 `cmp` 核验；两个文件的 SHA-256 均为 `bb23dcfbd4a04f93f30c1f519b8af8a44a74a13baa06dc3838b1294c10d1eeca`，快照内嵌完整性值为 `3e769e21c785b4d61626f92fed64a23c83d28ba0e627e7613634c9b26172a118`。
- Bilibili 专栏号为 `cv7401148`，opus 为 `428978829562003063`；请求地址为 `https://www.bilibili.com/read/cv7401148/`，解析后的规范地址为 `https://www.bilibili.com/opus/428978829562003063`。发布账号模块明确为屋顶现视研（mid `355943807`）。
- listing `publish_time` 与作者模块 `pub_ts` 均为 Unix `1598717817`，即北京时间 `2020-08-30 00:16:57`；`ctime` 为 `1598717167`（`2020-08-30 00:06:07`），`mtime` 为 `1598753944`（`2020-08-30 10:19:04`），页面作者模块显示“编辑于 2020年08月30日 10:10”。现存快照没有修订前正文、修改说明或可比对的实质差异，不能仅凭同日 mtime 推断内容修订，因此公开稿只写 `date: 2020-08-30`，不写迁移日期或 `updated`。
- 正文 p0–p7 明确列出原题 *THE ROAD TO DECA-DENCE: PROJECT HISTORY & PRODUCTION NOTES 01-05*、原作者 kViN、原文 URL、立川让答疑 URL、Anime News Network 访谈 URL，以及翻译“Phaedurs，艳光，十文字”、校对“加速器”、编辑“十文字”。front matter 分别建模为作者 kViN、译者 Phaedrus／艳光／十文字、校对加速器；编辑角色留在公开来源说明和本证据中，不滥用未定义的 front-matter 字段。
- `Phaedurs` 只在全 376 篇的本页出现；同一批 Sakuga Blog 制作笔记中 `cv6177490`、`cv6927184`、`cv7127720`、`cv7287224`、`cv8100927` 均稳定署作 `Phaedrus`，且仓库已有唯一 contributor `phaedrus`。故公开稿采用规范显示名 `Phaedrus`，本证据保留本页的源拼写，不另造人物。艳光已作为独立 contributor `yan-guang` 登记；没有把她与其他姓名合并。
- 原文页面当前可访问：HTML `<title>` 为 *The Road To DECA-DENCE: Project History & Production Notes 01-05 - Sakuga Blog*，`meta author` 为 kViN，`article:published_time` 为 `2020-08-06T20:03:28+00:00`。Anime News Network 页面题为 *Interview: Deca-dence Director Yuzuru Tachikawa and Producer Takuya Tsunoki*，日期为 2020-07-06；Reddit 页面为 Funimation 主持的 Yuzuru Tachikawa AMA。公开来源说明和 citation 的 `extra` 精确写明三者关系，没有把增译材料伪装成 kViN 原文的一部分。

## 正文结构、图注与保真处理

- 已完整读取 `rawPageState.detail.modules[4].module_content.paragraphs` 的 64 个顶层段落，而非只用 `renderedText`：普通文本 45、图片段 13、水平线 2、结构化 blockquote 4；没有原生标题、列表、表格、链接卡或参考文献区。
- p0–p7 的书目信息与署名进入 front matter、citation 和公开来源说明；p8、p10 的两条水平线保留为来源块／编者按／正文之间的语义分隔。p9“加速器按”解释译文增补范围，是文章特定的版本材料，已保留为公开 blockquote，而非移入不可见档案说明。
- p22、p28、p49、p55 是四个结构化 blockquote，分别为角木卓哉谈 NUT 命名、立川让谈角色与怪物设计、片名词源、世界观揭示次序；四段均恢复为 Markdown 引文，并保留 p49 括注与 p55 原生粗体。正文的其他粗体节点也按结构源保留，没有把视觉粗体擅自升级为章节标题。
- p29、p35、p57 的 `「1」` 至 `「7」` 与其后图片／纯文本图片署名一一对应，不是正文编号列表。公开稿恢复为 GFM 图片脚注：1 为堡垒金属表面，2 为规模感，3 为 artist unknown & Kilocrescent 原画，4 为増田哲弥 Layout，5 为梁博雅原画，6 为 Oleg Kositsyn 原画，7 为 Vercreek 原画。图像与原生署名均进入同一脚注，避免留下脱离图片的裸编号。
- p15、p19、p26、p44、p50、p53 的六张无编号实质图按原段落顺序直接嵌入；p44 在原结构中位于史涓生说明之前，公开稿保持“图片后接说明”的顺序。没有把顶部裁切图、头像、会员标签或响应式重复资源误作正文插图。
- 机械排版统一包括 HTML 实体解码、半角双连字符／三连字符改为中文破折号、多个句点改为省略号、ASCII 感叹号改为全角、汉字与拉丁词／年份间留出可读空格，以及直角图号改为脚注。不会改变论点。
- 另有五处由同段上下文唯一闭环的明显错字修复：p14“摸棱两可”改为“模棱两可”；p16“令让立川”改为“令立川让”；p23 作品名 `DECE-DENCE` 改回全文及原文标题一致的 `DECA-DENCE`；p52“涂篡改成”改为“涂改成”；同段“村上让本人”按本段前文两次“概念艺术家村上泉”及对应原文的 Izumi Murakami 改为“村上泉本人”。p18“作为角木他工作室的实际员工”中多出的代词“他”亦删去。所有改动都保留在完整源快照中可复核，没有把译文整体重写或润色。

## 图片引用逐项判定与本地资产

`content.imageReferences` 共 35 项；`illustration-index.json` 将本篇正文插图计为 13 项，对应 p15、p19、p26、p30、p33、p36、p39、p42、p44、p50、p53、p58、p61。已逐项查看两张 JPG 原图与十一张 GIF 的首帧、中间帧、末帧，并检查顶部封面及平台 UI 图片；GIF 均保留动画原文件，不以检查帧替换正文资产。

1. ref 0，`module_top.display.album.pics[0]`，1037×305，是两人眺望雪山日出的顶部横幅，属于 Bilibili 顶部相册／封面字段，不在正文重复。
2. ref 1，`module_author.avatar`，300×300，是屋顶现视研账号头像，属于平台作者模块，不入文章。
3. ref 2，`module_author.vip.label.path`，160×64，是“年度大会员”标签，属于会员 UI，不入文章。
4. ref 3，`module_author.vip.label.img_label_uri_hans_static`，207×60，是简体年度会员静态标签，属于会员 UI，不入文章。
5. ref 4，`module_author.vip.label.img_label_uri_hant_static`，207×60，是繁体年度会员静态标签，属于会员 UI，不入文章。
6. ref 5，`module_author.decoration_card.card_url`，438×132，是“冰糖IO 蜕变·闪耀粉丝”账号装扮卡，属于作者模块，不入文章。
7. ref 6，p15，1920×1080，《死亡游行》中工作人员面对监视画面的场景；实质正文图，保存为 `01-death-parade-production-lineage.jpg`，237679 bytes，SHA-256 `0883c376c1d25792dd21bc92b55b4ccbfec7ebd1a28b9d79791e19ac0d33a502`。
8. ref 7，p19，1174×734，《没落要塞》相关角色插画；实质正文图，保存为 `02-deca-dence-staff-illustration.jpg`，94864 bytes，SHA-256 `74f55b7d586a144518a4e0fc713b31329c1261038e5655260a83990bf52e467e`。
9. ref 8，p26，600×338，火海中的《幼女战记》角色镜头；实质 GIF，保存为 `03-nut-production-lineage.gif`，5086131 bytes，SHA-256 `c3587669949d6b2e2f5280629f3283d4d1bf88a2e5b0517a4a85c33a287d7257`。
10. ref 9，p30，600×338，枣在堡垒金属表面攀爬，对应图号 1；保存为 `04-fortress-metal-surface-detail.gif`，7028315 bytes，SHA-256 `fc22d9a3e7f360027295a645909a62fd9905867c21587c0b8e58c8cf886b7569`。
11. ref 10，p33，600×338，移动堡垒与加多鲁的规模／动作镜头，对应图号 2；保存为 `05-fortress-scale-and-action.gif`，5903758 bytes，SHA-256 `5152d66d0cb63dcce00cd0caa93f116da07472447235fb9f9113009c29777c35`。
12. ref 11，p36，600×338，角色借装备在反重力环境作战，对应图号 3；保存为 `06-limited-combat-movement.gif`，7243473 bytes，SHA-256 `d1896094fba667167dbe77c1c2d04c7cce875cf15f7360b17855ce86d3a84428`。
13. ref 12，p39，600×338，光影与人物动作的 Layout，对应图号 4；保存为 `07-masuda-layout-physical-motion.gif`，8339919 bytes，SHA-256 `9e53fb7b53c39bcd843b2916bd0197ce642cfd6faf34f859c0b8017831374795`。
14. ref 13，p42，源结构尺寸误记为 0×0，实际解码为 600×338，爆炸与混战镜头，对应图号 5；保存为 `08-liang-boya-animation.gif`，7179896 bytes，SHA-256 `927b4b8b0e3fd05a2da8cf930062353e400183eb688b3a7382751c6dadfc3e12`。
15. ref 14，p44，600×338，史涓生参与的第一集飞行动作镜头；保存为 `09-uzumaki-first-episode-animation.gif`，5524427 bytes，SHA-256 `83649505e9da0d49a5dec15f57a158f6e860ccc46d78fdaf7d2c2eeb81f17f2d`。
16. ref 15，p50，600×338，镝木、枣与电子人世界的片段；保存为 `10-character-story-and-world-reveal.gif`，6139057 bytes，SHA-256 `5124dfa11160b30c103b59ce116716189108e7d59326214b5024538a2dc8ac2a`。
17. ref 16，p53，600×338，圆润的电子人视觉设计；保存为 `11-cyborg-visual-design.gif`，3434298 bytes，SHA-256 `1f2703a1bd07e2ec288eeccf59292c36c701223ccd75a0a23f07e33b644046c7`。
18. ref 17，p58，600×338，Oleg Kositsyn 的第五集战斗镜头，对应图号 6；保存为 `12-oleg-kositsyn-animation.gif`，4385186 bytes，SHA-256 `6808b21528886e7f1e687de5ff949be3d573ae9692d27c4cf51edb16630ff825`。
19. ref 18，p61，600×338，Vercreek 的第五集失重追击镜头，对应图号 7；保存为 `13-vercreek-animation.gif`，7249173 bytes，SHA-256 `54d2f1df6acc020a000a3961acbb0ffc553a648a245a3e46873834a4eab85421`。
20. ref 19，`module_bottom.share_info.pic`，100×100，是 Bilibili App 分享图标，属于底部分享 UI，不入文章。
21. refs 20–21 是 ref 6 的 `@1192w.avif`／`@1192w.webp` 响应式副本，不另存。
22. refs 22–23 是 ref 7 的 `@1192w.avif`／`@1192w.webp` 响应式副本，不另存。
23. refs 24–34 依次是 refs 8–18 十一张 GIF 的 `@1192w.webp`（ref 29 为 `@.webp`）响应式静态／转码副本；逐项与对应正文 placement URL 闭环，不另存，也不以它们替换原始动画文件。

源快照完整保留 35 条引用、listing 的 `banner_url`／`origin_image_urls` 和所有响应式 URL；公开稿仅本地化 13 张实质正文图。

## 重复、版本、连载与来源关系

- 对 `.local-archive/bilibili-raw/source-archive/articles` 全 376 篇以中文题名、`DECA-DENCE`、`没落要塞`、Sakuga Blog 原文 URL、英文原题和正文独有句子交叉检索，唯一同作品／同原文命中为 `cv7401148`。另有 `cv6177490`、`cv6542868` 因 NUT／制作语境命中，不含《没落要塞》原文、同文或互链。
- 文章标题中的 `01-05` 指本篇讨论第 1 至第 5 集的覆盖范围；正文没有“第一篇／待续／下一篇”、总目录、前后篇链接或另一 cv 号。全档亦无 `06-12` 等续篇，因此不能仅凭覆盖集数把它登记为连载，也不修改 books manifest。
- 原文为 2020-08-06 的 Sakuga Blog 完整文章；p9 明确说明中文稿增译 2020-08-19 的 Reddit AMA 网友提问和放送前 ANN 访谈。二者是本译文的扩充来源，不是旧版／新版两个公开页，也不构成同文重发。
- Bilibili 文集“动画制作相关”（id `305894`，29 篇）是跨作品的宽集合，只支持栏目语境，不足以证明专题或系列关系。本篇作为独立译文发布。

## 分类与标签

- 文章有明确原作者、原文和三位译者，故 section 为 `translation`；中心是项目沿革、制作团队、设计与作画，主分类为 `动画制作`。未机械照搬 Bilibili 的宽泛发布分类。
- 标签先以 `rg` 检索现有 front matter 与全文，再做代表性／连接性双检验：`没落要塞` 是唯一中心作品及稳定作品入口；`立川让` 从项目发端、监督理念到镜头实施贯穿全文，是稳定创作者入口；`NUT` 的成立、人才谱系与制作组织占文章近半，是稳定工作室入口；`作画分析` 已是仓库现有规范标签，本稿对七个具体镜头的设计、Layout、原画与国际动画师协作有实质分析。四者都不是标题碎片或一段中的普通人名。
- 没有把 MADHOUSE、Gainax、角木卓哉、枣、镝木、资本主义、反乌托邦等重要但从属／局部对象全部拆成标签；`动画制作` 已作为主分类，不重复进入标签。

## 定向门禁

- `npm run validate:content`：通过，0 项非阻塞警告。
- `npm run verify:typography`：通过。
- `npm run verify:citations`：通过。
- `npm run verify:han-script`：通过。
- 完整源快照与原始 JSON `cmp` 通过；13 个正文资产路径全部存在，文件类型、尺寸、字节数与 SHA-256 已逐项记录。
- 未运行共享 build/dev，未修改 contributors、books、topics、tag aliases、preservation manifest、runtime 或 docs。
