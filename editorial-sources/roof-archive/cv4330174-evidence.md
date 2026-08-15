# cv4330174 编辑证据说明

## 成品与源文件

- 公开稿：`source/_posts/photographic-image-surrealism-camera-lucida-enlargement.md`
- 完整源快照：`editorial-sources/roof-archive/cv4330174.json`
- 源页面：`https://www.bilibili.com/read/cv4330174/`（canonical opus：`https://www.bilibili.com/opus/343122106899449759`）
- 源 JSON SHA-256：`82f1105f71ec30f926d410f4593dd7dec3cbb8d57e01ae2bebbb83d586c45e06`
- 快照与 `.local-archive/bilibili-raw/source-archive/articles/cv4330174.json` 已用 `cmp` 验证为字节一致；源 JSON 自带的抓取完整性值为 `6d1338be3ad2c523ab2e8d82d034444d98bf0dfd23d11f76aa4c8d2192faf2ab`。

## 标题、类型与摘要

- 源标题为“摘译||摄影图像的超现实主义：正文2~3”。公开题只做站内机械规范：`||` 改为题隔符 `｜`，范围符 `~` 改为 `—`；没有补写原题。
- 本文是 Adam Lowenstein 英文论文的中文摘译续篇，采用 `translation`；正文以巴特《明室》、摄影理论和超现实主义观影为中心，分类沿前篇采用“思想与理论”。
- 摘要只概括本页实际刊出的认知点／刺痛点及“超现实主义者的扩张概念”，没有把下一节《第三意义》或论文后半的《意外的春天》数字媒介分析写成已译内容。

## 日期

- listing 的 `publish_time` 与 `ctime` 均为 Unix `1578727741`，换算 `Asia/Shanghai` 为 **2020-01-11 15:29:01**；页面发布模块同样显示“2020年01月11日 15:29”，故公开日期机械记为 `2020-01-11`。
- `mtime=1578727810`，即 **2020-01-11 15:30:10**，只比发布时间晚 69 秒；页面没有修订说明或可核的实质差异，不写 `updated`。
- `.local-archive/wechat-title-index/bilibili-only.md` 把该条列为 2020-01-10，但该派生索引与页面结构时间、listing 时间戳及页面显示三项直接证据冲突，故不采用它覆盖源页面日期。

## 署名与原作来源

- 结构正文第 0 段明确写“作者：Adam Lowenstein”，第 1 段明确写“译者：will”；未见校对署名。二者与前篇 `cv4039385` 完全一致，且已由主线分别登记为独立 contributor；没有推断别名。
- 原作核为 Adam Lowenstein, “The Surrealism of the Photographic Image: Bazin, Barthes, and the Digital Sweet Hereafter,” *Cinema Journal* 46, no. 3 (Spring 2007), pp. 54–82, DOI [`10.1353/cj.2007.0024`](https://doi.org/10.1353/cj.2007.0024)。citation 按整篇论文的 `journalArticle` 建模，`pages` 保留论文完整页码 54—82。
- 以原论文可读全文 `https://paperzz.com/doc/8411285/the-surrealism-of-the-photographic-image--bazin` 对读：本页从第 59 页标题 “Through the Lens of Barthes’s Camera Lucida” 开始，完整覆盖该节及第 61 页开始的 “Surrealist Enlargement”，到第 64 页转入 “Barthes, Bataille, and ‘The Third Meaning’” 前结束。因此 citation `extra` 明确写为 **pp. 59—64 的两节摘译**，不把本页宣称为完整论文译文。

## 结构恢复与正文保真

- 完整读取 28 个结构段落：署名 2 段、前篇说明 1 段、链接卡 1 段、二级标题 2 段、正文图 4 段、正文及空段 17 段、注释块 1 段。公开稿恢复为前篇内链、两个二级标题、自然段、四幅正文图及 GFM 脚注。
- 第 3 个结构段是指向 `cv4039385` 的文章链接卡。卡片图片属于导航封面，不重复进入正文；其语义恢复为“前一部分”站内链接。
- 平台把多处 `&#34;…&#34;` 片段错误识别成话题富文本，并在英文术语中插入软换行。逐节点拼接 `word.words` 与 `rich.text` 后恢复引号，合并 `an image without code`、`message without a code`、`André Kertész`、`off-screen space` 等软换行；没有把平台富文本缺片当作译文删节。
- 第 5、9、14、19、23、25 个结构段内部本来含有两个或三个以空行分隔的自然段，按原换行拆回，不把长段机械合并。第 4、13 段的字号／粗体标题恢复为 Markdown 二级标题。
- 保留原译中的可疑表达和重复字，如“令人激动的的许诺”“锁在在”“我我们”“既不属于导演，也只属于观众”“电影拍摄经验”“探究……的影像”等；这些不是排版错误，不以编辑润色名义改写。
- 仅做机械排版：中文语境的分号、斜线、范围连接号与引号规范，清理异常空格及换行；书名／片名和原文题名按 Markdown 语义化。标题断点拼接严格等于标题，并避免以虚词起行。

## 图片逐项判断

源页共抓到 18 个图片引用，逐项目检和判定如下：

1. `734925…jpg`：474×718，正文第 8 段所置女子抱着儿童的黑白照片，紧随“冬季花园”论述，保留为 `01-winter-garden-photograph.jpg`；不在无进一步证据时把画中人物身份写死。
2. `65144…jpg`：511×341，正文第 16 段《金刚》（1933）剧照，保留为 `03-king-kong.jpg`。
3. `135270…jpg`：477×655，正文第 21 段《上海风光》海报，保留为 `04-shanghai-gesture-poster.jpg`。
4. `d5d751…jpg`：账号头像，平台 UI，删除。
5—7. `label_annual.png`、`8d4f8…png`、`VEW8fCC0hg.png`：会员／活动界面资源，删除。
8. `cb87d8…png`：账号装扮资源，删除。
9. `4f947…jpg`：第 3 段前篇链接卡的横幅封面；卡片导航语义已转为文字内链，图片不重复保存。
10. `cf680…jpg`：474×594，正文第 11 段 *Kertész on Kertész* 封面，保留为 `02-kertesz-on-kertesz.jpg`。
11. `app_logo.png`：平台应用图标，删除。
12—18. 前篇卡片封面及四幅正文图的 AVIF／WebP 派生地址，与原图重复，不另存。

四幅实质正文图均已逐张以原分辨率目检，顺序严格按结构段落落回正文。源图右下角均有“知乎 @will”水印，证明至少经过译者页面处理；不裁切、不去水印、不用派生图覆盖原图。

## 注号 26—43 与缺口恢复

- 末段结构化 blockquote 逐条载有英文注 26—43，不是网页截图。公开稿完整转为 18 条 GFM 脚注，保留英文书目、页码和原顺序。
- B站正文可见调用为 26、27、29、31—33、37、39—43；注释块却同时给出 28、30、34—36、38，形成 6 个“有定义而调用在正文丢失”的结构缺口。
- 对读原论文 pp. 59—63 后，可精确闭环六处调用位置：28 在“萨特的想象贫困”句后，30 在 studium／punctum 区分句后，34 在超现实主义电影扩张传统句后，35 在第二代群体采用实验研究句后，36 在第一代研究方法段末，38 在“降雪从下到上”答案后。公开稿只恢复这六个已由本页注释块和原论文共同证明的注号锚点，没有补入任何本页未载的注释内容。
- 所有 26—43 调用与定义一一对应；注 37—39 在源注释块同处一行，按数字边界拆为三条独立脚注，没有误并。

## 连续摘译、版本与文库建议

- 全 376 篇以 `Adam Lowenstein`、中文题名和英文论文题名人工检索，只发现 `cv4039385` 与 `cv4330174` 两页。
- 本页标题直接标为“正文2~3”，正文开头写“序言＋正文1：”并紧接指向 `cv4039385` 的链接卡；两页作者、译者相同，第一篇止于原论文第 59 页本节标题之前，本页即从该标题开始，注号从前篇的 25 连续到 26—43。这是直接互链、内容接缝、共同署名与连续注号的四重证据，足以判定为同一摘译的连续两部分。
- 本页末尾明确只过渡到 “Barthes, Bataille, and ‘The Third Meaning’”，原论文随后还有该节、《意外的春天》与数字媒介分析；全档也没有第三篇续译。因此建议主线把两页建立为 **paused／incomplete** 的两章文库：第一章“序言＋正文1”，第二章“正文2—3”；书级说明应写明现有中文摘译仅覆盖 pp. 54—64。本文不修改共享 books manifest，也不创造缺失章节。
- 未发现本页的重发、修订稿或其他平台同文闭环证据；微信标题匹配表对本题的若干 fuzzy 候选均是内容无关的误匹配，不据此建立跨平台关系。

## 标签双检验

- 采用：`摄影`、`安德烈·巴赞`、`罗兰·巴特`、`萨特`、`超现实主义`、`电影理论`，与直接前篇保持同一组检索入口。
- 代表性：巴特与《明室》、巴赞的摄影现实主义、萨特的《想象》、摄影和电影之间的媒介分界，以及超现实主义电影扩张共同构成本页全篇论证；没有把让·费里、柯特兹、《金刚》《上海风光》等局部案例散成标签。
- 连通性：六项均已是前篇规范标签；`rg` 还在仓库其他正文中找到巴特、萨特、摄影、巴赞、超现实主义与电影理论的实质讨论。候选 `明室`、`刺痛点`／`punctum` 目前只连接这两篇，且分别是书名与局部术语，不另造标签。

## 页尾与删留

- 源页无作者卡、公众号宣传图、投稿 CTA 或二维码。
- 前篇链接卡是本篇连续关系的直接证据，保留为文字内链；其封面图不重复。
- 末尾注 26—43 是论文装置，完整保留并语义化，不当作页尾噪声删除。

## 文库整合

- 本篇完成单篇审校后，已与 `cv4039385` 合并为《摄影图像的超现实主义》单一 `book_document`。本篇是第二章，锚点为 `camera-lucida-enlargement`；原有前篇导航由文库章节界面承担，不在合并正文重复。
- 独立公开稿已隐藏，完整 JSON、专篇 evidence 与四张资产全部保留。第二章注26—43接续第一章注16—25，合并后无脚注命名冲突。
- 文库明确标为暂停且不完整：两章只覆盖原论文第54—64页，后续第64—82页尚无中文归档；没有把摘译两页误称为整篇论文全译。

## 校验

- `cmp -s .local-archive/bilibili-raw/source-archive/articles/cv4330174.json editorial-sources/roof-archive/cv4330174.json`
- `shasum -a 256`：源文件和快照均为 `82f1105f71ec30f926d410f4593dd7dec3cbb8d57e01ae2bebbb83d586c45e06`。
- `npm run verify:typography`：通过，141 篇文稿。
- `npm run verify:han-script`：通过。
- `npm run verify:citations`：通过，7 种 Zotero 类型、7 本连载。
- `npm run validate:media-html`：通过。
- `npm run audit:roof-archive`：完成，本篇完整快照、证据与公开页均计入覆盖。
- `npm run audit:tags`：完成，无 normalized collision。
- `git diff --check -- source/_posts/photographic-image-surrealism-camera-lucida-enlargement.md editorial-sources/roof-archive/cv4330174-evidence.md`：通过。
- `npm run validate:content` 扫描到本文在内的 141 篇时，本文没有报错；命令整体被另一 lane 尚在编辑的 `doors-and-perception-fiction-vs-simulation-in-games.md` 四项 `TYPO-P1` 阻断。没有越权修改该无关稿。
- 按批次约束不运行共享 `build`／`dev`，不修改共享 contributors、books、topics、tag aliases、runtime、docs 或 manifests。
