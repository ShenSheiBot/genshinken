# cv3810399 编辑证据说明

## 来源、时间与署名

- 完整源快照为 `editorial-sources/roof-archive/cv3810399.json`，已用 `cmp` 确认与 `.local-archive/bilibili-raw/source-archive/articles/cv3810399.json` 逐字节一致；文件 SHA-256 为 `ef6c693ab2baa299a2c04fa883c367d1971d391c699a05273231c04974cbcee4`，快照内嵌完整性值为 `9733a7570b3b7ffdc767709d040d1f54fe2f7499c2a1ff2e7af326a8e6290391`。
- Bilibili 专栏号 `cv3810399`、opus `312630325882108010`；原标题为《红辣椒》，庆典继续前进，原专栏 URL 为 <https://www.bilibili.com/read/cv3810399/>。
- listing `publish_time` 为 2019-10-21 11:25:19，作者模块 `pub_ts` 为 11:25:20，均为 UTC+8；公开日期机械确定为 `2019-10-21`。listing `mtime` 为同日 11:14:07，早于公开时间，不写 `updated`。
- 结构化正文段落 1 的作者卡明确写 `Jack Cade`，并有题句“`Away! Burn all the records of the realm.`”；正文全部电影截图另带“知乎 @Jack Cade”水印，构成一致的辅助证据。段落 2 只有“作者君”通用标签，移入证据而不在公开正文重复。作者卡因含额外题句保留。
- 全部 87 个顶层段落、模块、图片文字及 rendered text 中均没有校对、翻译或其他个人署名；不能因 Jack Cade 的《东京教父》等别篇由伦勃朗校对，就把该角色外推到本篇。因此 front matter 只写 `post_author: Jack Cade`，不写 translator 或 proofreader；现有 contributors 已有 Jack Cade，无共享贡献者需求。

## 作品层级、文类与正文恢复

- 本文从开篇梗概到结语始终直接分析今敏执导的动画电影《红辣椒》：讨论千叶敦子／红辣椒、粉川警官、理事长、DCmini、游行、镜头与平泽进配乐。Sony Pictures Classics 的影片制作人员页明确列今敏为导演、筒井康隆为 original story writer：<https://www.sonyclassics.com/paprika/data/filmmakers.html>。因此层级是“筒井康隆原作故事／小说 → 今敏电影改编 → Jack Cade 对电影的评论”。
- 当前正文没有出现“筒井康隆”、原作小说文本或小说／电影对照，文章也没有转载筒井康隆文字；所以筒井康隆既不是本文作者，也不进入本篇标签。今敏则被正文反复作为影片创作主体和分析对象，保留为标签。
- 文章为一篇原创电影评论，采用 `section: review`、`categories: [评论与批评]`；平台“动画／动漫杂谈”及“ACG杂谈”收藏夹只作来源元数据，不建立书籍或专题。
- 完整读取 87 个顶层段落：52 个文本、33 个图片、2 个原生 blockquote。源文没有结构化标题、列表或参考文献标题，不人为切章；32 张实质结构化图片按原位置恢复。段落 77 的《白虎野の娘》日中对照歌词与段落 80 的越南语／中文对照均保留为带原换行的 Markdown 引文。
- 全文没有脚注调用、脚注定义或文末参考文献，故不制造脚注。歌曲文字由段落 69 明确引入，属于结语中的引用而非匿名参考文献。
- 段落 32 原始文本自带一对 `**`，边界恰好包围“客体的不成熟主体……幻象般”，恢复为 Markdown 加粗；段落 64 只有孤立的一对星号而无闭合边界，按源字面转义为可见 `\*\*`，避免它误吞后文形成伪加粗。两处公式的 `&lt;&gt;` 以 HTML 实体保留，避免被 Markdown 当成空标签。
- 只作机械排版修复：源段落 20“死亡,即”改为“死亡，即”；段落 30“主人能指的,前者”改为“主人能指的，前者”；段落 44 `回答道:“` 改为“回答道：“”；段落 54“无-主体”改为“无－主体”；段落 68 的“过去-现在／静止-移动／青涩-老练”改用全角连接号。没有改写论点、专名或语气。

## 页尾、图片与资产逐项审计

`content.imageReferences` 共 76 项，已逐项目检并完成最终判定：

1. 引用 0 是 720×212 顶栏相册横幅，为正文游行画面的窄幅裁切，不在结构化正文中；正文已有完整画面，故不重复公开。
2. 引用 1 是发布账号头像；引用 2－5 是年度会员、简繁会员标签与账号装扮卡，均为平台 UI，不公开。
3. 引用 6－37 依次对应结构化段落 1、9、11、15、17、21、23、25、27、33、35、37、39、41、43、45、47、49、51、53、57、59、61、63、65、67、70、72、74、76、78、82。引用 6 是含署名与题句的作者卡；引用 7－37 是与相邻论述一一对应的《红辣椒》电影画面，逐张均为实质正文图，全部保留。
4. 引用 38 对应结构化段落 85，是 1320×1771 的通用社群宣传图，内容为投稿、讨论群和邮箱，并非本文结论或文章特定材料；连同段落 84 的装饰分隔线删除。
5. 引用 39 是 Bilibili App 分享图标，不公开。
6. 引用 40－75 是引用 6－38 中正文图／页尾图的 AVIF 或 WebP 响应式派生文件；逐一按 URL 基名回链原图，不重复下载或公开。由此 76 项全部有判定，公开正文最终保留 32 张结构化原图，本地目录恰有 32 个文件。

32 张保留图的段落位置、文件名及哈希如下：

| 段落 | 本地文件 | SHA-256 |
|---:|---|---|
| 1 | `01-jack-cade-author-card.png` | `cf21fa2bf0b07bf104569a0602f73836d5260d58e2db90d2fcc148459b98e721` |
| 9 | `02-paprika-film-still-01.jpg` | `1d7197e0497e350a154c89d51ebe08d261d56f6bef8f6269f7b76718550f1acc` |
| 11 | `03-paprika-film-still-02.jpg` | `05b0ef4b230b59ebb2c0147dd1fc54dbefd28e286bd9a53ad3d4e329afa78241` |
| 15 | `04-paprika-film-still-03.jpg` | `d6d119cbaf8ecaf814f70ec4db5c3ca0b451837590482777af4ae320d4c704a4` |
| 17 | `05-paprika-film-still-04.jpg` | `f5b09efadf19914f96ba4a9c68bd2218f353683e7b4923e17c1659ec496ec974` |
| 21 | `06-paprika-film-still-05.jpg` | `77cef6f96b950211ecf14963e867f62c7a80a29fea272d4bd2ae4ad29acb080c` |
| 23 | `07-paprika-film-still-06.jpg` | `fa242dae0d6c5a00c122fc9acedc75ff2b94be17361b6c33772fcaf4ad6477e8` |
| 25 | `08-paprika-film-still-07.jpg` | `4efb5fbfba10d4ba57741b93d31c8a9c52edd75cd7517daad286f8fe6b57e823` |
| 27 | `09-paprika-film-still-08.jpg` | `d74c296a188a7d14f395544b2bdfed5c0e9c992f32313e865980b358a2eecf4d` |
| 33 | `10-paprika-film-still-09.jpg` | `e3294b4ebba7dc13bdaacef1db36c109db41d131450603db2096fa54ff55fc61` |
| 35 | `11-paprika-film-still-10.jpg` | `cbb70934cb849b198947b225130fdd11397b4dd52b5d762fd63069b6cf1610c3` |
| 37 | `12-paprika-film-still-11.jpg` | `6a674456c71ac895fa142dfeffbfbdfbcfb42303b15381c81759ba3107325ad6` |
| 39 | `13-paprika-film-still-12.jpg` | `9d9367c5b07da289c10d9e118335135c0586d51854bd1820be562fc375401f03` |
| 41 | `14-paprika-film-still-13.jpg` | `42dd4a1f99b7296cdbb9654dcaabaedee9a7e200f080e9bf3a5068caa28c0c8f` |
| 43 | `15-paprika-film-still-14.jpg` | `4ddcd5181fd7aed11c8620b780ef16f2180a9d95056d6accd397c4ba25bbbf5f` |
| 45 | `16-paprika-film-still-15.jpg` | `45dd53767ae9eb2030ed87078cf092f4d6a73a0ec324b01e9f95e66511cda27a` |
| 47 | `17-paprika-film-still-16.jpg` | `8bfec4baf58b45f129d08a98adc72f73c1e2f6cf8e82959e1e0219607fc506e8` |
| 49 | `18-paprika-film-still-17.jpg` | `21725d4b711d6a4ed84fc33b5e9df2247af4d3915f7714b749a9290e477d7f9c` |
| 51 | `19-paprika-film-still-18.jpg` | `af75436ab7f78d74fb166ec21854b2ead1535f27f21febb7b5236ac2f467b961` |
| 53 | `20-paprika-film-still-19.jpg` | `349d65edf8c22fc9dcc42ab56b150fcaa3f6fe935321d06d7ff1ef8825c546c4` |
| 57 | `21-paprika-film-still-20.jpg` | `e597783de6283491680a9f67dd294cb7a063f3f9ba5cfb2ea57448e2b4928f77` |
| 59 | `22-paprika-film-still-21.jpg` | `6f4e50fc1b2d5feb4e86ff02f493867ef24462d233b625cd5870778a7a401f4a` |
| 61 | `23-paprika-film-still-22.jpg` | `22a7cb7c82ec94b106c405dd6688ce603809deb43dcff06941b6726996bf4818` |
| 63 | `24-paprika-film-still-23.jpg` | `ad5196256cf26449eb703f7a41b6b5529fe45f42baeeff4cf3f978334c5cb613` |
| 65 | `25-paprika-film-still-24.jpg` | `0cb13df511ab5564f469b719f5158d903a6f7103678a96b7e9fa4155d2b912d3` |
| 67 | `26-paprika-film-still-25.jpg` | `683a2665364c3ca88b60fe1489868487b75c25adac3988607bbbaf5362293abf` |
| 70 | `27-paprika-film-still-26.jpg` | `719a5ba084323070a0d9cbfeebfed7c1b117a3ca726f4c089aaf20fb87fd73e3` |
| 72 | `28-paprika-film-still-27.jpg` | `92eb60fdd585ad58e0582ebe0353b3aba8e432bdcc1f0e94d4763e2ad3acb785` |
| 74 | `29-paprika-film-still-28.jpg` | `d209b2910524b932e3bc48769590bd0b8f9595fc0ac27180c11080373e0628da` |
| 76 | `30-paprika-film-still-29.jpg` | `fc9a925fda9216323c1a45577226e74b814aa5677f6b44afffb5ee16b86f3fa8` |
| 78 | `31-paprika-film-still-30.jpg` | `8cec7e602c521fd310afc300315ee2a480b8f4d9e896271103f2640cf04efe69` |
| 82 | `32-paprika-film-still-31.jpg` | `e4fe818bffa0a38b57cbadeef94025c0d80ca2d55fc0b93c3dd51b640151710e` |

## 重复、版本、连载与专题关系

- 全 376 篇按精确标题“《红辣椒》，庆典继续前进”、完整首句和多个长核心句检索，只命中 `cv3810399`；没有重复发布、修订版或转载副本。当前页面 `mtime` 早于发布，也没有版本差异证据。
- 全档题名中另有 `cv3165978`《千年女优——今敏的宁芙》和 `cv3411592`《东京教父——喜剧的神话》。后二者与本篇共享导演对象，其中《东京教父》还共享 Jack Cade 作者卡；但本篇没有篇号、统一系列题头、前后篇导航、目录、续篇预告或对两文的回链。共同作者／导演不构成明确系列，三篇均保持独立。
- `cv2187227`《元动画评论 II》及《都市·空间》公告等页面只在论述或举例中提到《红辣椒》，没有把本篇纳入其书籍／专题。本篇动态原生标签 `#红辣椒# #今敏# #动画电影#` 也不是系列声明。

## 标签双检验

- 先用 `rg` 检查已有 front matter、tag aliases 和完整正文，再作代表性／关联性检验。`红辣椒` 是唯一中心作品和最精确作品入口；`今敏` 是反复讨论的导演，并复用《东京教父》《千年女优》现有规范标签；`拉康` 与 `精神分析` 是全文主要理论框架，并与站内多篇理论评论形成入口；`梦境` 是电影叙事及全文“梦／现实”论证的核心，同时复用《企鹅公路》等文章的规范标签。
- 不采用 `筒井康隆`，因为正文没有分析或提及原作小说；不采用动态中的 `动画电影`，因为它是分类级泛词；不把只在结语出现的平泽进、单次提及的康德／德勒兹、人物名或 DCmini 标签化。最终五个标签由正文权重和检索价值决定，不按固定数量凑数。

## 约束与校验范围

- 公开稿为 `source/_posts/paprika-festival-moves-forward.md`，本地资产目录为 `public/attachments/roof-archive/cv3810399/`。未修改 contributors、books、topics、tag-aliases、preservation manifest、runtime 或 docs；不运行共享 build/dev。
- 定向校验包括内容 schema、中文排版、引用、源差异、图片引用／文件计数、快照字节一致性和未本地化远程图片扫描。
