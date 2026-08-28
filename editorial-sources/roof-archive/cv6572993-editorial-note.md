# cv6572993 编辑证据说明

## 来源、时间、版本与署名

- 完整源快照为 `editorial-sources/roof-archive/cv6572993.json`，与 `.local-archive/bilibili-raw/source-archive/articles/cv6572993.json` 逐字节相同；文件大小 881,446 bytes，SHA-256 为 `0fd5eba7025d5898c9e80754266038fc9531528bf5d08cc04b4086c847411385`，快照内嵌完整性值为 `bb71006d7e2a245e0846c5fe9da8a64be35559091aa228b7e123034109787e2b`。
- Bilibili 专栏号为 `cv6572993`、opus 为 `405912888091478736`；requested URL 为 `https://www.bilibili.com/read/cv6572993/`，resolved/canonical URL 为 `https://www.bilibili.com/opus/405912888091478736`。原题“RE:0制作日志——在似而不同的世界里开启续章”没有修订、重发或篇次标记。
- listing `publish_time`、`source.publishedAtUnix` 与作者模块 `pub_ts` 均为 1593347359，即 2020-06-28 20:29:19（UTC+8），页面显示“2020年06月28日 20:29”，故中文译文公开日期写 `2020-06-28`。listing `ctime` 为 20:21:06、`mtime` 为 20:28:56，mtime 早于公开时间23秒；它是发布前保存时间，不构成实质修订证据，不写 `updated`。
- 正文首个结构化 blockquote 明确印有原文名称、原作者kViN、翻译“晚钟送别此日”、校对“加速器”、编辑“KAFAK”和原地址。`post_author`、`translator`、`proofreader` 分别据此写 kViN、晚钟送别此日、加速器；运行时没有 editor 字段，且编辑署名并非可删除的通用平台信息，因此以正文短行 `编辑：KAFAK。` 保留。没有从发布账号、Bilibili作者模块或正文第一人称推断其他创作者。
- 原页 `https://blog.sakugabooru.com/2020/06/18/rezero-production-journal/` 的 canonical、`article:published_time` 和作者模块共同核实：原题为 *Re:Zero Production Journal – Starting a Sequel in a Similar Yet Different World*，作者kViN，发表于 Sakuga Blog，原文公开时间为 2020-06-18 18:20:08 UTC；页面记录的18:32:13修改时间属于英文原文，不作为中文译文 `updated`。公开稿用一条自然来源说明保留原题、原作者、原刊、日期和可点击原址，citation 则记录中文译文在屋顶现视研的公开页与日期。
- Bilibili listing 的 `reprint: 0`、`original: 0` 是平台字段，不能覆盖正文明确的翻译关系。本文完整转译原文主体，采用 `section: translation`；work kind 记为 translation，format 记为 research，主题分类为 `动画制作`。未见授权许可或开放许可证文字，不补造版权声明。

## 正文结构、强调、链接与保真处理

- 完整通读61个结构化顶层段落、rendered HTML 与 rendered text。顶层类型统计为文本42段（其中37段有实质内容、5段仅为空白）、正文图片17段、分隔线1段、来源／署名 blockquote 1段；没有原生标题、列表、表格、link card、代码块、脚注节点或参考文献表。
- 来源／署名 blockquote 的作者、翻译、校对移入front matter，编辑署名和原文出版史留作可见短行；导语后的唯一分隔线按原位置保留。正文没有作者设置的章节标题，因此没有凭论述转折自行添加标题。37个实质文本段全部按原序进入公开稿；5个空白段只作为源版留白，不制造空Markdown段。
- 结构源中的粗体逐项恢复，包括长月达平、渡边政治、拙者五郎、石立太一、木上益治、小柳达也、坂井久太、Nexus外包集数、渡边的核心地位及新动作监修等强调；没有把每个职员名字机械加粗，也没有以编辑判断改变源强调范围。
- 段落11、14、41、54、57是紧跟对应动态图／图片的居中说明，恢复为五个 `[fig]`，由运行时显示在图版下方；其余12幅图没有来源图题，只写无障碍alt，不把alt冒充可见标题。
- 原始结构页没有脚注调用、定义、书目或正文超链接；唯一明确URL位于来源块。Sakuga Blog英文原页现存多条术语、图片和作画资料链接，但中文公开源没有保留对应锚点或注号，故不把英文链接推测性移植到中文短语，也不补造译者注或参考文献。原文页末Patreon宣传本就未进入中文结构源，不作为译文内容补入。
- 原段落28写“第4-6集”，按 TYPO-P4 将汉字语境中的半角连接号机械规范为 `第4－6集`；没有改变集数。其余字词、译名、自然段、语气和原稿瑕疵均保留，包括“可靠的的盟友”、“沁染”、“原班制作的稳固”、`Re:0`／`Re：0`并存、大田和寛／大田和宽并存以及作品名《災禍真實》。
- 标题在破折号后的自然断点会让下一段以非实词“在”开头；为避免桌面标题白边卡产生不良首字并保持各段长度可用，`title_breaks` 写作 `RE:0制作日志——在似而｜不同的世界里开启续章`。两段拼接严格等于原题，断点落在 `Intl.Segmenter` 识别的词边界，定向内容校验无警告。

## 45条图片引用、17个正文图与本地资产

- `illustration-index.json` 对本篇记录17幅正文图，位置为段落5、8、10、13、17、19、21、25、30、32、34、38、40、45、49、53、56；与raw page state完全一致，没有已知重复URL欠计例外。17幅原件均在原始分辨率下目检；8个GIF另抽取首帧、约四分之一、二分之一与末帧核对动作内容和对应段落，未把动态内容误判成装饰。
- `content.imageReferences` 共45条：引用0是1024×301顶部封面裁切，内容为正文图14的“絶望という病”标题卡；listing `origin_image_urls` 也指向正文图14，故不把重复裁切另插正文。引用1—5为账号头像、年度会员／VIP标签和装扮卡，引用23为Bilibili App分享图标，均属平台UI；引用6—22为17幅正文原图；引用24—44为这些正文图的21个AVIF／WebP响应式派生版本。平台UI与重复派生图不本地化，正文只引用每幅原件一次。
- 17幅正文图的视觉判断与本地文件如下：
  1. 段落5是室内三名角色被不同色彩窗光分隔的构图，承接改编差异讨论，保留为 `01-third-purple-oni.jpg`。
  2. 段落8是四幅夸张透视／倾斜机位画面拼贴，直接例证渡边政治的镜头布局，保留为 `02-watanabe-dynamic-layouts.jpg`。
  3. 段落10是《火影忍者：疾风传》战斗动画，后附渡边政治与锯齿拖影图题，保留为 `03-watanabe-naruto-143-animation.gif`。
  4. 段落13是《Re:0》第一集动作动画，后附山岡峻图题，保留为 `04-yamaoka-rezero-episode-01-animation.gif`。
  5. 段落17是蕾姆表情变化的角色动画，承接角色心理与细微举止讨论，保留为 `05-rem-character-animation.gif`。
  6. 段落19是小柳达也以角色表情变化为核心的分镜页；画面含日文动作／对白栏，但正文只把它作为分镜证据，原图清晰可辨且没有独立缺失正文，不加未经核验OCR，保留为 `06-koyanagi-storyboard.jpg`。
  7. 段落21是花田中的爱蜜莉雅，处在作者评价叙事情感节奏之后，保留为 `07-emilia-field.jpg`。
  8. 段落25是《Re:0》战斗作画，承接稳定制作质量的论述，保留为 `08-production-animation.gif`。
  9. 段落30是Nexus制作的森林战斗动画，对应第10集等动作戏例证，保留为 `09-nexus-episode-10-action.gif`。
  10. 段落32是威尔海姆战斗作画，补充白鲸故事线的制作例证，保留为 `10-nexus-white-whale-action.gif`。
  11. 段落34是威尔海姆持剑站在尸骸上的画面，位于Nexus评价与White Fox主团队讨论之间，保留为 `11-white-fox-highlight.jpg`。
  12. 段落38是菜月昴与蕾姆相遇／告白高潮的上下画面对照，承接第18集演出讨论，保留为 `12-episode-18-climax.jpg`。
  13. 段落40是爱蜜莉雅哭泣的角色动画，后附须川康太非正式职责的实质图题，保留为 `13-sugawa-crying-animation.gif`。
  14. 段落45是写有“絶望という病”的标题卡，与制作团队流失和悲观预示的段落相连，保留为 `14-despair-title-card.png`；顶部封面是它的裁切副本。
  15. 段落49是爱蜜莉雅发饰近景，位于第二季准备周期讨论之后，保留为 `15-emilia-hairpin.jpg`。
  16. 段落53是《不可思议的教室》职员表中的“大田和寛”角色设计／总作画监督画面，后附同义图题，保留为 `16-ota-pani-poni-dash-credit.png`。
  17. 段落56是《拥抱！光之美少女》第15集动作作画，后附大田和宽图题，保留为 `17-ota-hugtto-precure-15-animation.gif`。
- 所有正文图 `warning: null`、`aigc: 0`；没有二维码、作者卡、账号宣传、活动海报、平台警告或不可辨扫描材料。六个UI引用只存在于页面壳，不是作者嵌入的正文内容。
- 本地资产均与 `assets-manifest.json` 对应源逐字节相同；依正文顺序的SHA-256为：`7c75de3cc81635cd2ef2c59f9dd4a07d0d11e3481315376aff051ac853b68a4e`、`e71022a12043729a9e394fbc59eaa46d4272295781f989761a94061529bf010c`、`602f0080c0003c121e9f746e650c518b5ee59881dd1c7c4ef38e7915cea4d65a`、`140bb833a061736993e546e0b7319c88a92929678683c51a15594c59b8c20f80`、`54669789f305056f912c732008a30234f928e4d9f558f62eb95c23bc2740a062`、`95265943d6e10a5aedec80a50d898dc4fcd7868c97ba9d068cce8533c7702753`、`d8c82fbc42b78cd99c755359aeff44b09d4197d93abb72ef0276f7ff799a0073`、`dad9d30dafab214baf5bbae34b0ab8545dbcac9650af45cdc6b57a2ed7d2e1dd`、`f835624db0d4b2d7501deb7a195b13d7fc981dd19af590da51d8b507f3c6ba46`、`08645531d1a920f16f6218905c98a25b5f8f2c0fbb0f58dca12fc2635ed45cea`、`990d2a4b8e47e3471505998e74f2f207e33f3eb69238e90983c7360d097be21b`、`31b7d8b7eba6d21e572cd2e4130a059464677d90a3564f93fbe9edf98642f265`、`1f5ee030df7dd54556f09447377cc8bb5adac80f6352d924560f9a30a424259f`、`eb50e6a328ec5d66be653972ecd31b87da7c947792ff66acb1b785768dc8e473`、`38d5f9fc9bf3903382922dabdb8193e51686b4c78b7516e22b14577a5e36c29b`、`8db2511ee2e634daf3940c9fc89f007ff364bc680518e57446a0c910aee69674`、`29e0ba0f13bdde12f613836467ee106e3f83b06a03d3c99458f3dc0fd1cddb47`。

## 重复、修订、连载与专题关系

- 在完整376篇中检索中文／英文全题、原地址、译者署名、导语独有句、结尾独有句、渡边政治、White Fox与Nexus组合，只发现 `cv6572993`；未发现同文重发、旧稿、更正版、拆篇或后续修订页。公开网络以中文全题与“晚钟送别此日＋RE:0”检索也未发现早于当前页的中文公开版本，因此不虚构公众号或其他平台首发。
- 本页平台 collectionEvidence 为“动画制作相关”（29篇），同一文集还包含《辉夜大小姐》《吹响！上低音号2》《奇蛋物语》等彼此独立的制作笔记。当前正文没有总题、篇次、前后篇链接、待续／完结声明或共同章节结构；“制作日志”是单篇标题，Bilibili文集只是provenance，不足以建立book、连载或专题。本轮不修改books或topics。
- 文中提到团队的“传统”和第二季续篇，指Sakuga Blog的写作惯例与动画作品续作，不是屋顶现视研文章连载声明。全文结尾作出第二季制作预测并自然收束，没有缺页或“下篇继续”。

## 标签与交付门禁

- 标签先以 `rg` 搜索当前front matter、全文、tag aliases和完整376篇，再分别做代表性与跨文连接性检验。`Re:从零开始的异世界生活` 是全文唯一中心作品，采用作品级而非第一季／第二季分裂标签；尽管当前站内为单篇，它是稳定作品入口。`渡边政治` 是前半篇与结论共同确认的核心监督和不可替代人物，属于可长期复用的创作者入口。`动画改编` 贯穿“第一季何以成功／第二季能否续接”的主问题，并复用现有标签；`演出` 覆盖监督方针、分镜、镜头布局与单集导演分析，也复用现有检索入口。
- White Fox与Nexus虽占据中段，但主要作为当前作品的生产组织与外包条件出现，在现有语料中没有独立共享标签；京都动画只用于说明渡边的训练背景；长月达平、蕾姆、爱蜜莉雅等是辅助人物／角色。它们留给全文检索，不把原文页的每个人名标签机械复制，也不以`动画制作`重复categories。
- 公开稿为 `source/_posts/rezero-production-journal-sequel.md`；完整JSON、专篇说明与17幅本地资产均已落盘。没有修改共享contributors、books、topics、runtime、docs、tag aliases或preservation manifest，未运行build/dev。
- 逐段覆盖检查通过：37个实质文本段（来源／署名块另按角色与出版史结构化）全部可在公开稿按原序定位；17条Markdown图片引用与17个结构化图片段一一对应且文件均存在。源JSON `cmp` 与SHA-256通过，17幅本地资产逐一与 `assets-manifest.json` 对应源作bytes/hash双重比较，结果全同。
- 定向门禁通过：`npm run validate:content`（178篇文稿、140位贡献者、9本书、3个专题、0项警告）、`npm run verify:typography`、`npm run verify:citations`；公开稿与本说明的 `git diff --no-index --check` 无空白错误。依批次约束未运行build/dev和共享构建。
