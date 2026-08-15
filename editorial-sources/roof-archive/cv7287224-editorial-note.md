# cv7287224 编辑证据说明

## 来源、时间与署名

- 完整源快照为`editorial-sources/roof-archive/cv7287224.json`，已用`cmp`确认与`.local-archive/bilibili-raw/source-archive/articles/cv7287224.json`逐字节一致；文件SHA-256为`cd76404b0067d968728d13dbb002b9962bcde8fbaf5fcd68d8bd50496c287bbf`，快照内嵌完整性值为`00cc287482699b0e5ac191a3ce48a5da0a17fb3c4ceec0e7ce1625cdada700c1`。
- Bilibili专栏号`cv7287224`、opus`426638132519486430`；原标题`《吹响!上低音号2》第二话制作笔记`，原专栏URL为<https://www.bilibili.com/read/cv7287224/>。
- listing `ctime`为2020-08-23 16:53:25、`publish_time`为16:53:51，页面作者模块`pub_ts`同为16:53:51，均为UTC+8，故公开日期确定为`2020-08-23`。页面可见文字为“编辑于2020年08月23日17:05”，listing `mtime`为17:31:47；两个编辑时间并不一致，且档案没有发布前后正文、修订说明或可比较版本来证明实质修订。按项目时间规则只保留发布日期，不把平台编辑标记机械写成`updated`。
- 段落0－3逐项明确原标题、原作者kViN、原文URL、翻译Phaedrus和校对唯一指定真实August_Rush；这些角色与Sakuga Blog原页的作者元数据互相闭环，分别写入front matter，不以发布账号覆盖署名。
- 原文页当前结构化元数据记录2016-10-13发布、2016-10-16修改；公开来源说明引用原文发布日期。Bilibili正文没有授权、许可或转载协议文字，故不推断未有证据的授权关系。

## 原文覆盖与制作人员核对

- 直接通读Sakuga Blog原文<https://blog.sakugabooru.com/2016/10/13/sound-euphonium-2-episode-2/>：中文从原文提要、`Episode 2`制作表开始，持续译到讨论五名原画及其中四名女性的最后一个主体分析段；原文其后另有一段对第三话Animation Do班底的预告及Patreon支持说明，中文未收录。因此公开来源说明与citation extra准确写“译出正文分析，未收入末段下一话预告与网站支持说明”，不把它冒充全文逐段翻译。
- 原文制作表依次为Storyboard Yasuhiro Takemoto、Episode Direction Taichi Ishidate、Animation Direction Nobuaki Maruki、Assistant Animation Direction Akiko Takase、Instruments Animation Direction Hiroyuki Takahashi及五名Key Animation。中文结构段落8误把高濑亚贵子的`Assistant Animation Direction`写成“制作进行”，但段落42又明确说她“担当丸木的助手”；原文制作表与中文正文形成双重反证。公开稿据此修正为“作画监督辅佐：高濑亚贵子”，并非扩写新角色。
- 其余制作人员恢复为分镜武本康弘、演出石立太一、作画监督丸木宣明、乐器作画监督高桥博行；五名原画为岩崎菜美、铃木沙奈、长滨彩夏、森崎志保、安藤京平。日文旧字体`鈴`、`長濱`式写法按简体正文环境规范为`铃`、`长滨`，不改变人员身份。

## 文类、结构与正文恢复

- 采用`section: translation`、`categories: [动画制作]`。全文分析第二话如何利用前季铺垫、三维空间、相对机位、倒影、音游画面、后期色调、作画监督与原画配置完成叙事和人物表现。
- 完整通读46个顶层结构段：31个文本段、13个正文图片段、2条分隔线。段落0－3恢复为来源署名块；段落4、10恢复为Markdown分隔线；段落5恢复为题前提要；段落6恢复为二级标题`Episode 2`；段落8、9从多行挤压文本恢复成制作人员列表；段落12－44按原顺序恢复正文与13张图片；空白段只保留段落边界。
- 本篇没有源脚注、脚注定义或参考文献列表，故不人为制造脚注。英文制作术语`staff`、`layout`、`perfect`、`miss`及作品内英文画面`Continue?`属于译文可见用语，按源保留。
- 仅作机械排版修复：题名半角叹号改为全角；制作人员冒号、逗号与换行恢复为Markdown列表；正文误用的`--`、`---`和单个`—`统一为成对破折号；“问及问什么要留”按句法闭环修为“问及为什么要留”；“体现-越”与“忙起来了---但”恢复为破折号连接。以上不改论点。

## 图片逐项判定

- `content.imageReferences`共37项，全部逐项下载或核对固定路径并视觉判断。引用6－18是13张结构化正文原图；引用20－36逐张视觉确认是其响应式WebP／AVIF副本，其中引用30、35仍为相应GIF的完整动画派生版。两张原GIF分别检查首、中、末帧：引用12表现回忆镜头中人物牵手奔跑，引用17表现并坐人物的细微腿部动作及转场，均是论述不可替代的动态证据，保留原GIF。

| 引用 | 视觉／结构证据 | 判定 |
| --- | --- | --- |
| 0 | 樱花路角色横幅裁切，1023×301，listing头图 | 页面头图，删除 |
| 1 | 屋顶现视研账号头像 | 平台作者UI，删除 |
| 2－4 | 三种年度大会员标签 | 平台会员UI，删除 |
| 5 | 账号装扮卡人物图 | 平台装扮UI，删除 |
| 6 | 两幅第一季画面与英文字幕对照，442×554，段落13 | 续作角色铺垫证据，保留为`01-season-one-character-foreshadowing.png` |
| 7 | 樱花路角色镜头，554×311，段落15 | 正文图，保留为`02-sakura-path-shot.png` |
| 8 | 泳池入口空间构图，554×311，段落17 | 正文图，保留为`03-pool-entrance-composition.png` |
| 9 | 夜间室内空间镜头，554×311，段落19 | 正文图，保留为`04-night-interior-space.png` |
| 10 | 四幅空间layout对照，554×311，段落21 | 正文图，保留为`05-space-layout-comparison.png` |
| 11 | 两幅玻璃倒影镜头，554×623，段落23 | 正文图，保留为`06-character-reflections.png` |
| 12 | 牵手奔跑的33帧GIF，565×320，段落25 | 动态正文证据，保留为`07-frozen-memory-cut.gif` |
| 13 | 乐器表面角色倒影，554×311，段落27 | 正文图，保留为`08-instrument-reflection.png` |
| 14 | 音游`Continue?`画面，554×311，段落31 | 正文图，保留为`09-rhythm-game-continue.png` |
| 15 | 四幅闪回色调处理对照，554×311，段落33 | 正文图，保留为`10-flashback-color-treatment.png` |
| 16 | 四幅手、服装、发丝作画对照，554×311，段落36 | 正文图，保留为`11-character-detail-comparison.png` |
| 17 | 细微人物动作与转场的108帧GIF，530×300，段落40 | 动态正文证据，保留为`12-subtle-character-motion.gif` |
| 18 | 高濑亚贵子插画，482×678，段落43 | 直接支撑相邻人才论述，保留为`13-akiko-takase-illustration.png` |
| 19 | `static.hdslb.com/mobile/img/app_logo.png` | 底部App分享UI，删除 |
| 20－21 | 引用6的WebP响应式副本 | 重复，删除 |
| 22－23 | 引用7的WebP响应式副本 | 重复，删除 |
| 24－25 | 引用8的WebP响应式副本 | 重复，删除 |
| 26－27 | 引用9的WebP响应式副本 | 重复，删除 |
| 28－29 | 引用10、11各自的WebP响应式副本 | 重复，删除 |
| 30－36 | 引用12－18各自的WebP响应式副本，30与35为动画 | 重复，删除 |

- 13个公开资产SHA-256依次为`59a472c609b44aaa0ba11ac65e66cbb667296a9873e4eec18fae5e6c7cf89485`、`a81013cf8bbca1b2f47c6447367c44215b853d6caf1807912eca63f603317d1a`、`5fdac83dde249220203b501a17fb6e44f82abcb6d66fa5a2afe9b03d6bbc85a1`、`1ca47a00440cc07cfa27733e0047a2baf452391cd78d263e9d7f9380df7ad991`、`d3adb5cc80752ba1f45441b33150ad82ac3b70850dd9d6e048083c3f91cdabbf`、`323c5d4ad22cae2814c1fa5dd98f7f9798e13dd6827f3b42022044552a0d6d3f`、`e65ea6b7b4a0801a3477c8e39c5b24eec73f80a4de76a16471de43842ee492b9`、`6faeb82626f9f1aad39bc82e441053317e86bedf309a4fbc3c900893ba1ef997`、`cb81dc160db0006f7e89d51c5e25f2f801ca35c1d7656491cb0bd00d10124c62`、`be0c5b40bb8880c20339c85155ffb593e1d1fafff53985854bacef8e8a4dd1a5`、`844dfbb3c8333e4cf27bb63585f1e57451640ed7dec414e30a669235dc547d81`、`03aa60c759ab50ca3a559eef26e0b289cbc4cc4197e5e41fcdb549f68c2c3a86`、`6066eca261193935201d7cba64eac8fad6c57184129121f0b6f659d3e7684560`，均与引用6－18原始资产一致。

## 重复、连载与专题边界

- 以Sakuga Blog原文URL、英文题名、中文首段与独特长句检索全档，只命中`cv7287224`，未发现同文重发或另一份可比较修订稿。
- `cv7127720`题为《吹响！上低音号2》第一话制作笔记，同为kViN原文、Phaedrus翻译、唯一指定真实August_Rush校对；本篇正文还明确回指“在第一篇Note里我提到……模拟三维空间”。相邻集数、相同署名与正文回引共同证明两篇构成明确的相邻制作笔记序列，不是仅凭同作品聚类。
- 全376篇只发现第一话和第二话两篇对应翻译；本篇原文末段预告第三话，但中文没有第三话文章，不能据预告假定后续已刊或系列完结。本任务只提交关系证据，不修改共享books或topics。

## 标签双检验

- 先用`rg`检索既有front matter与正文，再做代表性和跨文连接性检验。`吹响！上低音号`是全文作品中心并复用仓内规范标签；`京都动画`贯穿制作组织与人才讨论并连接既有京都动画文章；`武本康弘`是分镜与空间演出的核心分析对象，也连接既有《冰菓》制作研究；`分镜`是本文反复使用的方法入口并已有跨文复用。
- 石立太一、丸木宣明和高濑亚贵子各有专段，但文章的组织中心仍是第二话整体制作，仓内跨文连接也弱于上述四项；霙、久美子、丽奈和个别镜头只是案例，不升格。`动画制作`已经作为category，初稿中重复出现的同名tag已机械删除，避免分类与标签双重占位；不为数量配额补标签。

## 交付与校验范围

- 公开稿为`source/_posts/sound-euphonium-2-episode-2-production-notes.md`，完整源快照为`editorial-sources/roof-archive/cv7287224.json`，证据说明为本文件，本地资产目录为`public/attachments/roof-archive/cv7287224/`。
- 本任务未修改contributors、books、topics、tag-aliases、preservation manifest、runtime或docs，也未运行共享build/dev。
- 最终定向检查包括快照字节一致性、13图引用／13资产／13源引用闭环、两个GIF逐段帧检查、36个非空正文／图片／分隔结构单元顺序覆盖、无远程正文图、无缺失或闲置资产、slug唯一和全套静态门禁；结果在交付时记录。
