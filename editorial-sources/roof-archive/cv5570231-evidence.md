# cv5570231 编辑证据说明

## 来源、日期、署名与文类

- 完整源快照为 `editorial-sources/roof-archive/cv5570231.json`，与 `.local-archive/bilibili-raw/source-archive/articles/cv5570231.json` 经 `cmp` 核验逐字节一致；文件 SHA-256 为 `20acbae3bcc674704707d22ca5f4ba6b38d0b95f3e3b606735014664df2f82a1`，快照内嵌完整性值为 `e1af3df2b333c5efe7e4dcd232d2187116114f8d0e5ecb43c81b07c52b59bdf1`。
- Bilibili 专栏号为 `cv5570231`、opus 为 `377033880176382656`，listing 标题逐字为“SEP：真之紧缩论（The Deflationary Theory of Truth）第1~6节”。listing `publish_time` 为 2020-04-12 00:44:01（UTC+8），页面作者模块显示“2020年04月12日 00:44”，故公开日期写 `2020-04-12`。`ctime` 为前一日 23:21:53，`mtime` 为公开前 58 秒；没有发布后实质修订证据，不写 `updated`。
- 第一个原生来源 blockquote 明示原作者为 Daniel Stoljar、Nic Damnjanovic；翻译分工为“前言：luanzhao；第1、2、5、6、7节：Suetonius；第3节：一般通过ANIMA；第4节：奇怪的阿法南猿”；校对为乌有之人、Suetonius。本篇只收前言和第1～6节，故 `translator` 按本篇实际覆盖列 luanzhao、Suetonius、一般通过ANIMA、奇怪的阿法南猿，`proofreader` 列乌有之人、Suetonius；不把第7节后篇另署的校对 Mefls 扩到本篇。
- 来源块给出 Spring 2018 固定版 URL、1997-08-28 初版和 2010-10-04 实质修订。SEP 官方固定版页面逐项核实了题名、两位作者和版本日期，citation 采用 `bookSection`、2010 年实质修订日期、Spring 2018 版本及 Metaphysics Research Lab, Stanford University。
- 第二个原生“屋顶按”明确说明：本中译由网哲邻人部志愿翻译、首发于其知乎专栏，经讨论委托屋顶现视研在B站长期代发。listing 同时为 `original: 0`。知乎首发页和具体日期尚未核明，故采用当前最早可核验的完整 B站日期，不虚构更早日期；出版链、译校和学习讨论／转载要求进入 citation 与本证据，不在正文反复展示过时的“欢迎关注／私信加入”话术。
- 本文是《斯坦福哲学百科》词条的分段中译，采用 `section: translation`、`categories: [思想与理论]`。B站 collection“SEP 翻译”和平台分类“科技／人文历史”只作来源与系列检索证据，不机械转成本站分类。

## 正文结构、引文与保真

- 完整通读 150 个结构化顶层段落、rendered HTML 与 rendered text：147 个文字节点、1 个图片节点、2 个原生 blockquote。147 个文字节点中 86 个含实质文字，61 个仅是平台空行；两个 blockquote 是来源／署名／发布关系元数据。公开正文按源序完整保留前言、13 条目录、六节正文和一幅分类表，空行及纯平台头部不重复发布。
- 段落 9—21 是完整英文／中文目录：1—7 为一级项目，7.1—7.6 明确从属于第7节，恢复为嵌套 Markdown 列表。本篇正文的六个原生粗体节题位于段落 23、43、63、89、121、137，恢复为二级标题；不把普通公式、例句或目录项误作标题。
- 第1节中 Frege、Ramsey、Ayer、Quine 四组整段引文虽然被平台存为普通文字节点，但内容和末尾作者－年份归属清楚，依 TYPO-P8 恢复为四组 blockquote；Ramsey 两段与 Quine 三段各保持原有段落边界。其余人物、作者－年份括注和公式是正文的一部分，不增造脚注。源页没有脚注调用、脚注定义、文末参考文献表或正文链接。
- 所有模式与例式按原序保留，包括 `(ES)`、`(ES-sent)`、`(ES-prop)`、`（Gen）`、`(F-prop)`、`(F-prop*)` 及编号（1）—（6）。源结构中的 `&lt;p&gt;` 在 Markdown 中继续使用实体，以确保页面显示尖括号而不被误解析为 HTML 标签。
- 只执行可验证的机械整理：归并空行／NBSP；将标题节次 `1~6` 及摘要写作规范化为 `1～6`；按 TYPO-P1 为 Ramsey 引文中以“例如”结尾的承接段补冒号，为 `(F-prop)` 和 `(F-prop*)` 两条无句读公式补句号。其余正文不润色，保留原译的空格、英文标点、专名拼写、大小写、术语选择和疑似病句，包括 `Frege, Ramsey, Ayer, 和Quine`、`Grover 1992)根据`、`“ S是真的”`、`属于上表中的A或B` 与 `具有此观念`。
- 来源头中的“翻译仅供学习讨论”、原作者／译校、知乎首发及受托代发关系移入结构化元数据；“欢迎友善讨论”“欢迎有志者私信加入”“欢迎关注”属于通用旧平台 CTA，删除。“文章配图仅献给翻译校对君s，图文无关”说明顶部相册装饰图的用途；它不是正文论证，保留在本证据，不把无定位封面插入正文。

## 9 条图片引用逐项视觉判定

源 JSON 的 `content.imageReferences` 共 9 项，全部结合 evidence path、URL、画面与响应式关系逐项判断：

1. 引用 0 是 `module_top.display.album` 的顶部相册封面，960×282，画面为动画人物微笑并拿着白色物件；来源头明确说配图献给译校且图文无关，正文也没有其结构化位置，故不另插入正文。
2. 引用 1 是屋顶现视研账号头像；引用 2 是旧版“年度大会员”标签；引用 3、4 是简体／繁体 VIP 标签；引用 5 是账号装扮卡。它们均为账号或平台 UI，不进入正文。
3. 引用 6 是结构段落 86 的二维分类表，720×112。逐图目检可辨识列“句子的／命题的”、行“分析的／本质的／必然的”及 A—F 六个单元，紧接正文对六种紧缩论版本的说明，是不可省略的实质图表；按原位本地化并使用 100% 图版宽度。
4. 引用 7 是 Bilibili App 分享图标，属于平台 UI，不公开；引用 8 是段落 86 分类表的 WebP 响应式副本，按 URL 基名和画面回链原始 PNG，不重复下载或发布。

最终正文仅保留一个本地实质资产：

| 结构段落 | 本地文件 | 尺寸 | SHA-256 |
|---:|---|---:|---|
| 86 | `01-six-versions-of-deflationism.png` | 720×112 | `e34db912f8032e8caa7b622c1ebef93bf936f18a7932d79698e0c628fbab0fcb` |

原图没有作者提供图题；公开稿只写无障碍 alt，不把编辑识图文字伪装成原图题。表格文字清楚，无需另加未经授权的 OCR 正文。

## 两篇关系、覆盖边界与跨平台记录

- 在全 376 篇 B站源档检索完整总题、Spring 2018 固定版 URL 和前言特征句，仅 `cv5570231` 与 `cv5722691` 属于同一译文。当前篇题名明示“第1~6节”，正文目录列出完整第1—7节，正文止于第6节并预告“真值间隙”的后续批评；`cv5722691` 题名明示“第7节”，顶部 link card 直接回链 `cv5570231`，正文依次覆盖 7.1—7.6，并从本篇最后一句所预告的真值间隙问题继续。
- 两篇使用相同原题、固定版 URL、版本、原作者和协作来源；译者 Suetonius 也与首篇分工中“第7节”一致。差异必须章级保留：本篇前言及第1—6节有四位译者、两位校对；第7节署译者 Suetonius、校对 Mefls。建议文库顺序 `cv5570231 → cv5722691`，总题“SEP：真之紧缩论（The Deflationary Theory of Truth）”。本轮不修改共享 books manifest。
- 两篇合计覆盖原词条前言及所有编号正文第1—7节；现存中译没有附原词条 Bibliography、Academic Tools、Other Internet Resources 或 Related Entries。待第7节精洗后，文库可按“编号正文已完、书目及附加资源未收录”标示准确覆盖，不能无说明地宣称原 SEP 页面全部翻译完毕，也不能擅补官方英文书目。
- 全档没有同文重发、旧稿、更正稿或替换稿。微信标题账本记录 2020-04-23、2020-04-24 两条本篇完全同题的后续发布，晚于 B站且当前没有完整正文可比对，故只记录跨平台关系，不据此写 `updated` 或断言逐字相同。

## 标签双检验

- 采用 `真之紧缩论`、`逻辑学`，均先以 `rg` 回查现有 front matter、正文和已确认的续篇。
- 代表性：真之紧缩论是原词条总题、六节共同对象和两篇系列的精确入口；逻辑学贯穿等值模式、句子主义／命题主义、分析／实质／必然等值、量化、合取与真值问题，并非一次性举例。
- 跨文连接与 reader-recall：`真之紧缩论` 将直接连接已经确认的第7节续篇；`逻辑学` 复用站内既有规范标签并连接其他逻辑／语义研究。点击两项的读者都会合理期待本篇出现。
- 不使用来源品牌 `SEP`、大类“哲学”或正文中每位历史人物；不把只在一节中出现的 `真值间隙`、`代语句论`、`表达论`、`极小主义`、`塔尔斯基`、`Paul Horwich` 提升为全文标签，也不为数量凑标签。

## 交付与定向校验

- 公开稿为 `source/_posts/sep-deflationary-theory-truth-sections-1-6.md`；完整 JSON、专篇证据与一个本地正文资产均落在各自专篇路径。
- `cmp` 与 SHA-256 核验通过；定向脚本确认三段标题断行严格拼回原题、86 个实质文字块按源序命中、译校数组与来源分工一致、正文只有一个本地图片引用且资产目录恰有一个文件。front matter 与 citation 必需字段解析通过，公开稿没有远程图片 URL、段尾空白或差异空白。
- `npm run verify:typography`、`verify:citations`、`verify:han-script`、`validate:media-html`、`verify:snapshot-history` 均通过；`audit:roof-archive` 已计入本篇快照、证据和公开引用，`audit:tags` 没有规范化碰撞。`validate:content` 成功解析本篇且未报本篇问题，全仓只被另一 lane 在制的 `yesterday-wo-utatte-anime-manga-adaptation.md` 第240行 TYPO-P1 问题阻断；另有 `sep-foreknowledge-and-free-will.md` 的既存 title-break 警告，与本篇无关。
- `npm run verify:preservation` 未运行：共享工作树没有 `editorial-sources/preservation-manifest.json`，本任务禁止创建或修改共享 manifest；以字节一致 `cmp`、独立 SHA-256、86 个正文块顺序比对和本地资产计数完成本篇保全验证。
- 本轮只修改 `cv5570231` 专属公开稿、快照、证据与资产；未修改 contributors、books、topics、tag aliases、preservation manifest、runtime 或 docs。依任务要求不运行 build/dev。
