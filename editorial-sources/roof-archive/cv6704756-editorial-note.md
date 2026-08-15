# cv6704756 编辑证据说明

## 来源、时间、版本与署名

- 完整源快照为 `editorial-sources/roof-archive/cv6704756.json`，与 `.local-archive/bilibili-raw/source-archive/articles/cv6704756.json` 逐字节相同；文件大小 253,442 bytes，SHA-256 为 `6e3514f6fd06e495b09b90b28de58c6782adb71245bf7be350d3173a610ed716`。快照内嵌完整性字段为 SHA-256 `c11bb0aea5bf4f4c983c49e70fa50991d8c0b4c05bb52d617e3c9e8875fbeba8`。
- Bilibili 专栏号为 `cv6704756`、opus 为 `409900533290876695`；requested URL 为 <https://www.bilibili.com/read/cv6704756/>，resolved/canonical URL 为 <https://www.bilibili.com/opus/409900533290876695>。原题“后启示录游戏、英雄主义与大衰退”没有更正稿、重发或篇次标记。
- listing `publish_time` 与 `source.publishedAtUnix` 均为 1594275804，即 2020-07-09 14:23:24（Asia/Shanghai）；作者模块 `pub_ts` 为 1594275805，页面显示“2020年07月09日 14:23”，故中文译文公开日期写 `2020-07-09`。listing `ctime` 为 14:22:48，`mtime` 为 14:30:30；后者只比公开时间晚7分06秒，页面没有修订说明、版本差异或其他实质修订证据，不能把平台保存时间写作 `updated`。
- 结构化正文开头两行加粗明示“作者：Óliver Pérez-Latorre”“译者：哲哥，Mefls”；原刊页面的英文题名与作者栏也明确写 *Post-apocalyptic Games, Heroism and the Great Recession*、Óliver Pérez-Latorre。因此 `post_author` 为 Óliver Pérez-Latorre，`translator` 为哲哥、Mefls；没有校对、编辑或图片处理署名，不从发布账号补造角色。
- 原文现存于 *Game Studies* 第19卷第3期（2019年12月），原刊页 <https://gamestudies.org/1903/articles/perezlatorre> 明示作者、题名、期次、月份及 ISSN 1604-7982，未列 DOI 与页码。公开 citation 据此建为 `journalArticle`，不把 Bilibili 页面冒充原文书目。
- 中文译文覆盖原论文第1—5节的主体论述，但结构源没有原刊摘要、致谢、六条尾注和参考文献表，也删去了原文各处括号引文中的多数年份／页码。公开稿忠实恢复现存中文译文，不把未经翻译的英文尾注、书目或锚点推测性移植进正文；完整原刊入口与缺失边界留在 citation 和本说明中。

## 正文结构、引文与保真处理

- 完整通读70个结构化顶层段落、`renderedHtml` 与 `renderedText`：62段有实质文字，8段仅为空白；有实质文字者中，前2段为作者／译者署名，10段为全行粗体标题，48段为正文。没有结构化图片段、列表、链接卡、分隔线、表格、代码、脚注调用或脚注定义。
- 10个全行粗体标题按语义层级恢复：第1—5节为二级标题，4.1／4.2为三级标题，a／b／c三个分论点为四级标题。原题号后的缺失空格只作为 Markdown 标题语法补回，不改变题名。48个正文段全部按原序进入公开稿，8个纯空白段不制造空 Markdown 节点。
- 段落43与56是整段他人引文，恢复为 Markdown blockquote；移除只承担引号外框的首尾弯引号，不删引文文字。原页没有图题、脚注、参考文献表或正文链接可恢复。
- 段落62的 `*********` 破坏了完整句义；同段后文已经明写“饥饿游戏”，原刊对应句又明确为 Aloy “a leader with a rebellious component, with certain similarities to the popular Katniss from The Hunger Games”。据两端证据将缺口恢复为“领袖，与《饥饿游戏》”，形成“她也是一位具有叛逆精神的领袖，与《饥饿游戏》中的凯特尼斯……有某些相似之处”；这不是凭主题润色。
- 确定性排印／错符修复逐项记录如下：`2008-2017`、`2009-2017`、`里根-撒切尔`、`政治-经济`、`巴内-威塞尔`、`15-M` 的半角连接号改为全角 `－`；`电子游戏 (根据`、`敌托邦(即`、`乔尔(Joel)`、`雅顿(Yaughton)`、`亚罗伊(Aloy)`及《好莱坞、单车信使与新经济》英文题名前后的半角括号改为中文语境括号；`爱国主义·、拓荒神话` 去掉重复中点；`基本论述，：（1）` 改为 `基本论述：（1）` 并移除（2）／（3）前多余空格；`（b） 工人` 移除多余空格；段落67的段末逗号按 TYPO-P2 改为句号。其余原稿译名、措辞、重复与语法瑕疵均保留。
- 标题拆为“后启示录游戏、｜英雄主义与大衰退”；两段拼接严格等于原题，后一段不以虚词起行。摘要只概括论文语料、问题和三类核心形象，没有加入原稿未作出的评价。

## 7条图片引用、顶部封面与附件结论

- `illustration-index.json` 对本篇记录 `illustrationCount: 0`、`placements: []`，与70个结构化段落中没有任何 `pic` 节点一致。`content.imageReferences` 共7条，全部按 evidence path、结构位置与可取原图逐项判定；listing 的顶部原图也另行下载目检。
- 引用0来自 `module_top.display.album`，1918×564，SHA-256 `4fc349126c0a34368ff1f8be9fabc37116a45f486ca7b4bfbb0e557e9769311c`，是《最后生还者》乔尔、艾莉站在废墟城市中的横幅。listing `origin_image_urls/banner_url` 指向同画面的1920×1080原图，SHA-256 `f2ec47446adbbe3b791442bc7fceb23a21c608d3635991ccf5883771569a5c1d`。两者只承担平台顶部封面，没有正文段落锚点，故不把封面擅自插入正文。
- 引用1是屋顶现视研账号头像，300×300，SHA-256 `0cc20d431132bb2b954ec1bc0416656136fff484cec9eed9ba8a47be40560074`；引用2是160×64“年度大会员”标签，SHA-256 `2cbb44fc6e5149b78ba03d051c671beb488daaed0196033dccbfb3b61828e351`；引用3、4分别是207×60简体／繁体年度会员标签，SHA-256 `fa8fe17042bac09192f7465217b5c04bbaefa66f7178255b3fb084e02a51f739`、`c15512c4346ac84b9e691dc99d62a814fbcadbc3fbf7f80bebf63ee9233be187`；引用5是438×132账号装扮卡，SHA-256 `3e85d988af408f8a9547b36adfc3c6451b3f27a791c435871c249c3a14dfa6cc`。五项均已原尺寸目检，明确属于账号／会员界面而非文章材料。
- 引用6唯一位于 `module_bottom.share_info.pic`，URL 文件名为 `mobile/img/app_logo.png`。HTTPS、HTTP及带查询参数三次请求均返回 HTTP 502／HTML错误页，无法伪称视觉解码成功；但模块路径、文件名和全站同构资源已把它闭环为 Bilibili App 分享图标，不是正文资产。
- 最终正文保留0张图片，没有二维码、扫描文字、活动海报、作者卡或文章特定页尾，也无需创建空的 `public/attachments/roof-archive/cv6704756/`。顶部封面、六项平台资源及其错误响应均不本地化。

## 重复、来源、连载与专题关系

- 在完整376篇源档案中检索中英文全题、Óliver Pérez-Latorre、导语“大衰退（2008-2017）开始之后”、结尾“敌托邦世界中乌托邦净土的表述……”以及当前 cv ID，只命中 `cv6704756`。没有同文重发、旧稿、更正版、拆篇或后续修订页。
- 论文原刊与中文稿构成直接翻译来源关系。Bilibili `reprint: 0`／`original: 0`、publisher account 与空的 `module_reprint_source` 都不能推翻正文署名和可核原刊，也不能单独证明版权许可；本篇只陈述已证实的翻译及公开事实。
- 平台 collectionEvidence 只有宽泛文集“游戏评论”（13篇）。正文没有总题、篇次、前后篇链接、共同章节结构、待续或完结声明；与其他末日／灾难文章的主题相近也不构成连载或专题。本轮不改 books／topics manifest。

## 分类、标签与交付门禁

- 本文是对一篇完整主体学术论文的中文翻译，故用 `section: translation`；work kind 记为 translation（现存中文稿省略原刊摘要、尾注与书目），format 记为 research，主题分类用“游戏”。
- 标签先以 `rg` 检索现有 front matter、正文与完整档案，再分别做代表性和连接性判断。`游戏研究` 复用现有规范标签，连接站内对游戏本体、虚构与模拟的理论研究；`后启示录` 是全文语料和问题的稳定类型入口，不能与作为特定视频合集名称的 `灾难启示录` 合并；`新自由主义` 贯穿大衰退叙事、孤胆英雄、企业家模型与结论，并能连接站内多篇文化生产／消费社会论述。单个案例作品、角色、学者名字及“大衰退”精确标题词留给全文检索，不为数量拆成标签。
- 公开稿为 `source/_posts/post-apocalyptic-games-heroism-great-recession.md`；完整JSON与本说明已落盘，无实质正文图所以没有附件目录。没有修改共享contributors、books、topics、runtime、docs、tag aliases或preservation manifest，也未运行build/dev。
- 逐段覆盖检查确认48个正文段、10个标题与2段署名均按原序处理；唯一非逐字缺口是已由原刊和同段后文闭环的九星遮蔽。源快照 `cmp` 与独立 SHA-256 通过，公开稿不含远程图片或不存在的本地资产。
