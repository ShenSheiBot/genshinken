# cv4039385 编辑证据说明

## 成品与源文件

- 公开稿：`source/_posts/photographic-image-surrealism-bazin-barthes.md`
- 完整源快照：`editorial-sources/roof-archive/cv4039385.json`
- 源页面：`https://www.bilibili.com/read/cv4039385/`（canonical opus：`https://www.bilibili.com/opus/325651635933016626`）
- 源 JSON SHA-256：`b95f0f697a44900958f9a8718721661b1ac9b9a4eac7e2b69dc049a9292b59ab`
- 快照与 `.local-archive/bilibili-raw/source-archive/articles/cv4039385.json` 已用 `cmp` 验证为字节一致。

## 标题、类型与摘要

- 源标题为“摘译||摄影图像的超现实主义：巴赞，巴特”；仅把平台题隔符 `||` 规范为站内题隔符 `｜`，没有扩写原题。
- 这是 Adam Lowenstein 英文论文的中文摘译，首页分区采用 `translation`；内容以摄影本体论和电影理论为中心，分类采用“思想与理论”。
- 摘要只概括本页实际覆盖的巴赞、萨特与摄影超现实主义论证，没有把未译的《意外的春天》与数字媒介部分写成已刊内容。

## 日期

- B站 listing 的 `publish_time` 与 `ctime` 均为 Unix `1574660080`，换算 `Asia/Shanghai` 为 **2019-11-25 13:34:40**；公开日期据此机械记为 `2019-11-25`。
- `mtime=1574673121`，为同日 **2019-11-25 17:12:01**，较发布时间晚约 3 小时 37 分。页面没有版本声明、修订说明或可核的实质差异，因此不把这次平台写入时间推断成 `updated`。
- 微信标题索引中有 2020-02-17 的规范题名对应项，晚于本页，证明跨平台刊载但不改变本站采用的首个可核公开日。

## 署名与原作来源

- 结构正文第 0 段明确印有“作者：Adam Lowenstein”，第 1 段明确印有“译者：will”；未见校对署名。二者已由主线分别登记为独立 contributor，本稿不推断别名。
- 原作核为 Adam Lowenstein, “The Surrealism of the Photographic Image: Bazin, Barthes, and the Digital Sweet Hereafter,” *Cinema Journal* 46, no. 3 (Spring 2007), pp. 54–82, DOI [`10.1353/cj.2007.0024`](https://doi.org/10.1353/cj.2007.0024)。公开 citation 按 `journalArticle` 建模，不沿用模糊的“文章”描述。
- 原文全文与页码边界另以可读全文核对：`https://paperzz.com/doc/8411285/the-surrealism-of-the-photographic-image--bazin`。本页从原论文第 54 页序言开始，至第 59 页“Through the Lens of Barthes’s Camera Lucida”小节之前停止，对应序言和 “Bazin, Sartre, and Photographic Surrealism”部分。
- 译者注说“只打算翻译讨论巴赞、萨特和巴特的前半部分”，并明确略去《意外的春天》分析。本站保留该注；citation 的 `extra` 准确说明本页是 pp. 54–59 的第一部分摘译，未把它表述为全译。

## 结构恢复与正文处理

- 完整读取 43 个结构段落，并以结构正文而非摘要重建。正文恢复为：译者注、分隔线、“序言”、正文段落、两处块引、正文图、参考文献和注释。
- 原平台把多个 `&#34;…&#34;` 片段误识别成话题富文本；逐处依上下文恢复为引号，合并 `civilization of the signified`、`Colin MacCabe`、`a continuum of consciousness`、`André Breton` 等平台软换行。
- 第 8 个结构段实际含两个自然段，按原换行拆开；第 14、31 段本来就是结构化 blockquote，恢复为 Markdown 引文。
- 保留原译措辞与可疑字样，如“给画”“或个孩子”“将他以后的存在主义”“记录片”等，不以润色名义改写作者／译者表达。
- 机械排版修复包括 `现实主义=超现实主义` 的等号全角化、`让-保罗` 中连接号的全角化、中文语境内页码范围连接号规范和中英文间异常软换行清理。没有增加原页缺失的章节。标题断点按校验提示改为 8／11 字的两段，拼接仍严格等于原题；萨特书影采用站内允许的 33% 图宽。

## 图片逐项判断

源页共抓到 14 个图片引用：

1. `4f947…jpg`：720×212 列表封面，为正文第 26 段克劳丝引文图的横裁版；不在正文重复刊出。
2. `d5d751…jpg`：账号头像，平台 UI，删除。
3. `label_annual.png`：年度会员标识，平台 UI，删除。
4. `8d4f8…png`：会员标识，平台 UI，删除。
5. `VEW8fCC0hg.png`：活动／界面资源，平台 UI，删除。
6. `cb87d8…png`：装扮资源，平台 UI，删除。
7. `3f2a…jpg`：正文所置萨特《L’Imaginaire》封面，保留为 `01-sartre-imaginary-cover.jpg`。
8. `6641…jpg`：正文所置罗莎琳德·克劳丝引文图，含 `知乎 @will` 水印，是译者制作且参与论述的专篇图，保留为 `02-krauss-surrealism-quote.jpg`。
9. `c423…png`：原论文注 16—25 的英文截图，属于实质参考文献材料；逐字转录成可访问的 Markdown 脚注，同时保留本地证据资产 `03-notes-16-25-source.png`，不在正文重复显示截图。
10. `app_logo.png`：平台应用图标，删除。
11—14. 前述三张正文图的 AVIF/WebP 派生地址，均不另存重复文件。

三张正文／文献源图均已目检。公开正文保留 2 张内容图；注释截图由文本化内容替代但仍作为本地证据资产保存。

## 注释与参考文献

- 正文有 `【6】` 至 `【25】` 的引注。源页仅以文字列出参考文献 1—5，并以图片提供英文注 16—25；源页没有注 6—15 的定义。
- 参考文献 1—5 恢复为连续 Markdown 有序列表。第 1 条结尾孤立的 `2.` 是下一项编号的版式残片，删除后由 Markdown 正确编号。
- 注 16—25 逐项从 `c423…png` 目检转录为 GFM 脚注，并核对调用与定义一一对应。
- 注 6—15 不从原论文外补，以免把本页未刊出的材料伪装成原发布内容；其调用保留为原样 `【6】`—`【15】`，让资料缺口保持可见。原论文只用于确认缺失边界，不用于静默扩写译稿。

## 连载、版本与跨平台关系

- 全 376 篇搜索仅发现 `cv4039385` 与 `cv4330174` 含 Adam Lowenstein／本论文题名。
- `cv4330174` 标题为“摘译||摄影图像的超现实主义：正文2~3”，正文开头明确写“序言＋正文1：”，紧接一个指向 `cv4039385` 的专栏链接卡；作者、译者均同为 Adam Lowenstein／will。其正文从“通过巴特的镜头：《明室》”继续，注号从 26 延续至 43。这些是直接互链、共同署名与连续注号的闭环证据，足以判定两页为同一摘译的连续两部分，而非仅为同主题文章。
- 当前页可作为“序言＋正文1”，`cv4330174` 作为“正文2—3”。第二页最后停在回到《第三意义》的过渡句；两页合计仍不是原论文全译，且译者注已声明不译《意外的春天》分析。建议主线待 `cv4330174` 精洗后建立一个 **paused／不完整摘译** 的两章文库，并在书级说明精确标明覆盖范围；本篇不修改共享 books manifest。
- 微信标题索引的 2020-02-17 同题项与本页是跨平台再刊关系；没有发现比 B站发布时间更早的同文公开证据，也没有发现同文修订版。

## 标签双检验

- 采用：`摄影`、`安德烈·巴赞`、`罗兰·巴特`、`萨特`、`超现实主义`、`电影理论`。
- 代表性：六项都贯穿本页论证或构成明确检索入口；没有把布努埃尔、费里尼、潘勒维等末段举例人物散成标签。
- 连通性：`罗兰·巴特`、`萨特`、`电影理论` 已为仓库现有标签；`摄影`、`安德烈·巴赞`、`超现实主义` 虽首次成为规范标签，但 `rg` 在多篇既有正文中找到实质讨论（包括《缓慢动画的三种维度》及多篇巴特／超现实主义文章），可连接后续归档和现有语料，不是单篇孤立词。

## 页尾与删留

- 源页没有通用投稿 CTA、公众号宣传二维码或作者卡。
- 译者注是范围声明与译者自我限定，保留。
- 参考文献与注释截图是论文装置，保留并语义化；平台头像、会员图标、应用图标和派生图删除。

## 未决项

- 注 6—15 的定义确实不在本页源材料中，当前有意不补；若未来决定按原论文补齐，必须作为明确的后续编辑增补并留下版本证据。
- 两部分的合并文库需等 `cv4330174` 一篇一审后由主线建立；当前稿没有抢先修改共享 manifest。

## 文库整合

- `cv4330174` 完成一篇一审后，已依据前篇直链、页码接缝、共同署名与连续注号建立《摄影图像的超现实主义》文库。本篇作为第一章承载原论文第54—59页，锚点为 `introduction-bazin-sartre`。
- 单一 `book_document` 沿用本篇 slug；第二章全文并入后，独立续篇公开稿隐藏，但两篇完整 JSON、专篇 evidence 与各自资产目录均保留。两章脚注编号16—25与26—43不冲突。
- 文库状态为 `paused`，说明现有摘译仅到第64页；没有把未译的《第三意义》、《意外的春天》与数字媒介部分伪装成 forthcoming 已承诺译稿或宣称全文完结。

## 校验

- `cmp -s .local-archive/bilibili-raw/source-archive/articles/cv4039385.json editorial-sources/roof-archive/cv4039385.json`
- `npm run validate:content`：通过，129 篇文稿，0 项警告。
- `npm run verify:typography`：通过。
- `npm run verify:han-script`：通过。
- `npm run verify:citations`：通过。
- `npm run validate:media-html`：通过。
- `npm run audit:roof-archive`：完成，完整快照覆盖计入本篇。
- `npm run audit:tags`：完成，无 normalized collision。
- `git diff --check -- source/_posts/photographic-image-surrealism-bazin-barthes.md editorial-sources/roof-archive/cv4039385-evidence.md`：通过。
- `npm run verify:preservation` 无法启动：当前共享仓库缺少 `editorial-sources/preservation-manifest.json`；按本批次“不得修改 preservation manifest”的约束未创建该共享文件。本篇专属 JSON 已以 `cmp` 和 SHA-256 独立验证。
- 按批次约束未运行共享 `build`／`dev`。
