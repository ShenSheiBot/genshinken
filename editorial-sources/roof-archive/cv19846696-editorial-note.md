# cv19846696 编辑证据说明

## 来源、日期与查重

- 来源为 Bilibili 专栏 `cv19846696`；`editorial-sources/roof-archive/cv19846696.json` 是 `.local-archive/bilibili-raw/source-archive/articles/cv19846696.json` 的逐字节快照，公开稿引用原专栏地址 <https://www.bilibili.com/read/cv19846696/>。
- `listingMetadata.publish_time` 与 `source.publishedAtUnix` 均为 `1668690895`，按 `Asia/Shanghai` 换算为 **2022-11-17 19:54:55**，故公开日期取 **2022-11-17**。平台 `mtime` 为同日晚些时候，只证明编辑，不据此设置 `updated`。
- 原页标题为“诗行的危机 —— 斯蒂芬·马拉美”。公开标题去掉平台用于标作者的破折号后缀，作者单列 front matter；正文首行“诗行[1]的危机”中的注号转换为脚注调用。
- 在现有公开稿、书稿、专题和原始文章库中检索完整标题、`Crise de vers` 与 `cv19846696`，未发现另一份同文归档或直接连载节点，因此创建独立 translation post，不改共享 book/topic。

## 作者、译者、版本与选译边界

- 原页依次印“斯蒂芬·马拉美”“译者：羊桑喜欢吃柿子”，没有校对、编辑或第二译者署名；公开稿据此使用 contributor `stephane-mallarme` 与 `yang-sang-xi-huan-chi-shi-zi`。发布账号“屋顶现视研”不覆盖正文责任。
- 原页编者按的版本陈述是：篇章选自 Pierre-Henry Frangne 编选、导论并评注的 *Stéphane Mallarmé: De La Lettre Au Livre*（Le Mot Et Le Reste，2010），原载马拉美 *Divagations*；中文“由法语翻译而来”，同时参考 Barbara Johnson 与 Robert Greer Cohn 的英译。因此法文是底本，两种英译只是参照，不登记为原作或共同译者。出版社目录页 <https://lemotetlereste.com/artsvisuels/delalettreaulivre/> 可独立确认该书 2010 年出版、Frangne 的编选／导论／评注责任，以及其中收入取自 *Divagations* 的诗性散文。
- 1897 年 Fasquelle 初版 *Divagations* 所收《Crise de vers》位于第 235－251 页；可核的初版转录与扫描索引见 <https://fr.wikisource.org/wiki/Divagations_(1897)/Crise_de_vers>。原页中文从初版首句对应处开始，整体顺序一直推进至初版末页，说明它不是随意截取的一小段。
- 但它也不是可声明的全文：初版雨果段之后尚有以 `La variation date de là` 开头、谈魏尔伦的一句，中文在对应位置直接越过；中文末句对应 `retrouve chez le Poëte ... sa virtualité`，而初版其后还有以 `Le vers qui de plusieurs vocables` 开头的完整收束段。原页没有省略号、删节标记或“节选”声明。故公开稿明确标为**原页未注明删节的中文选译／有省略译文**，不从法文或英译自行补译缺文；未逐句校勘翻译质量，也不对除此两处外是否尚有微小省略作绝对保证。
- 版本史资料还指出 1897 年《Crise de vers》本身由马拉美早先分别发表的四篇文字编合而成；这属于法文作品的成书史，不等于中文页面分成四章，也不据此制造系列或 book。

## 正文、注释与结构

- 完整读取原页 80 个结构化段落和 `renderedHtml`。正文恢复源内编者按、从开头到页面末句的全部中文译文、4 张插图及图注、21 条译注；标题、作者、译者三行移入结构化 front matter，空白段和平台装饰不进入公开正文。
- 原文没有真正的章节标题。“（斯蒂芬·马拉美）”“牧神的午后”“瓦格纳”“圣母院奇美拉：尼古拉·塔克霍夫，1902”均紧随图片且居中，判定为图注而不是章节标题；公开稿保留为斜体图注，不虚构 h2 层级。
- `[1]` 至 `[21]` 全部转换为 GFM 脚注，21 个定义各有调用。注释由译者写作，含术语释义、人物介绍和译者判断；它们不冒充马拉美原注。原页没有独立参考文献表、外链卡或可恢复的原刊 URL。
- 只做必要机械修复：中文人名“维埃里-格里芬”按项目规则改为全角连接号“维埃里－格里芬”；末幅图注补句号以满足段落句读门禁。其余可疑措辞与原页错字（如“观注”“听觉从从”）均保留，不在归档中静默润色。

## 图片与资产

- `content.imageReferences` 共 16 项，其中独立正文原图 4 项、4 项响应式 AVIF/WebP 副本、1 项头图候选，以及账号头像、会员装饰和分享图标等平台资源。实际正文只使用四张原图；响应式副本不重复归档，平台装饰和未进入正文的头图不作为内容图发布。
- `mallarme-portrait.png`：595×657，马拉美黑白肖像；110675 字节，SHA-256 `4ede8d524fd7ddecc60ec4065971a684fee679c3054e334e6cdfc493f39fcaff`。
- `faun-afternoon.png`：618×486，原页图注“牧神的午后”的绘画；855220 字节，SHA-256 `b8d6894e8280fb5f7046c3b549408371d02cd2bdccd559445c3fd9e23532d5fc`。
- `wagner.png`：647×485，瓦格纳肖像；807695 字节，SHA-256 `f12c3fbe3dc23db4622e2af5c4ed7e8188f3c106d38af10045f99e89ef82211a`。
- `notre-dame-chimera.png`：370×521，俯瞰巴黎的圣母院奇美拉图；590835 字节，SHA-256 `b0eee2d043228ef2f618f6a8d4dc9658029cd6e41272bec13e4cfab72b2b8180`。
- 四项均按原字节落在 `public/attachments/roof-archive/cv19846696/`，并由本任务在 2321 项 union 基线上定向追加到共享 manifest，形成 2325 项基线；未运行或重建默认 manifest，已通知并行资产任务从 2325 接续。

## 分类、标签与版权边界

- 本文是法国象征主义诗人对格律危机、自由诗、语言、音乐与纯粹作品的理论论述，故 `section: translation`、分类 `思想与理论`。标签使用 `文学理论`、`诗歌`、`象征主义`、`自由诗`：均是全文中心概念并可与后续文学理论／诗学稿连接；不把插图人物、注释所列每位诗人或单幅作品名拆成标签。
- 法文原作发表于 1897 年，已进入公共领域；但本页中文译文及编者按的权利状态与授权条款没有在页面中说明。平台元数据 `original: 0`、空的 `copyrightEvidence` 和“社科哲学翻译”文集归属都不能证明转载许可或开放许可。归档只保存并呈现可核的历史页面，不把中文译文或图片重新声明为自由许可，也不补造版权来源。
- 本篇交付边界为独立 post、逐字节 JSON 快照、本证据说明、4 项本地资产和 4 项定向 manifest 增量；没有修改共享 books/topics。

## 验收

- 本篇自身的内容校验问题已归零：四图均能从 2339 项 manifest 解析，`P4` 与 `P1` 机械项修复后不再出现，21 个脚注定义均有调用。全库 `validate-content` 仍被并行在制稿 `cv20028261` 的 9 项未登记图片与 2 项句读阻塞；输出没有 `crisis-of-verse.md` 项，本篇不把他稿在制状态误报为自身失败。
- 公开正文的选译边界改为直接陈述“本篇未收录”的读者口吻；版本对照和“不补译”的审校过程仍由本证据说明记录，未改变实际覆盖范围。
- `verify:typography`、`verify:han-script`、`verify:citations`、`validate:media-html`、`audit:tags`、`audit:roof-archive`、`verify:snapshot-history` 与 `git diff --check` 均通过。JSON 快照与 raw archive 逐字节一致；四项本地资产的字节数、SHA-256 与 manifest 登记逐项一致。
- `npm run build` 通过，651 个静态页面完成；成品路由 `/posts/crisis-of-verse` 与 `cite.bib` 进入静态生成结果。成品页显示作者斯蒂芬·马拉美、译者羊桑喜欢吃柿子、4 张本地图、选译边界说明及 21 条可回跳脚注；BibTeX 同时保留作者、译者、日期与原专栏 URL。
