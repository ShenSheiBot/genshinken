# cv18100135 编辑证据说明

## 来源、日期与署名

- 来源为 Bilibili 专栏 `cv18100135`。`editorial-sources/roof-archive/cv18100135.json` 是 `.local-archive/bilibili-raw/source-archive/articles/cv18100135.json` 的逐字节快照；公开稿引用原专栏地址 <https://www.bilibili.com/read/cv18100135/>。
- 原始 `publish_time` 换算后的公开日期为 **2022-08-14**。
- 发布账号、正文叙述主体和活动主办方均为屋顶现视研，原页没有个人执笔署名，因此 `post_author` 使用既有组织 contributor `屋顶现视研`。『初鹿野凪』仅被鸣谢为活动海报与 CM 视频制作者，不据此反推本文作者；名单中的入选作者、匿名评委口径也不构成本页作者署名。本文无 contributor 缺口。

## 结构、名单与规则

- 完整恢复陆兴华题词、活动简介、两条参赛路径的七篇入选名单、前夜祭稿酬、评委口径、制作鸣谢、后夜祭两项时间节点、主办方说明、联系方式和传播／投稿邀请。原页明确将五篇列为连续参加“前夜祭＋后夜祭”，另两篇列为只参加前夜祭；公开稿不把视频卡片标题误计为另一篇稿件。
- 河豚酱酱酱的条目保留原视频卡片目标 <https://www.bilibili.com/video/BV16a411D7PA>、题名与 19:02 时长；非木的条目保留原文紧随的知乎链接 <https://zhuanlan.zhihu.com/p/385829684>。平台展示的播放量、弹幕数是易变卡片数据，不属于名单或规则，未写入公开稿。
- 原页没有评委姓名，只写“一群与观众在智识与审美上平等的爱好者！”；公开稿如实保留，不从其他届次补造评委。
- 仅作可逆机械排版：移除标题前误识别字符 `l`，将 `RagsDrum` 统一为该届正式写法 `Rags Drum`，半角 `+`／`~` 统一为全角 `＋`／`～`，数量与日期补中文混排空格，恢复题词 blockquote、名单和时间表的 Markdown 层级，并给完整陈述补句末标点。名单中的日文题名与作者显示名「　」按源保留。

## 图片与资产

- `content.imageReferences` 共 15 项。逐项检查后，本页有三项独立正文内容资产：方形活动海报、河豚酱酱酱投稿的视频卡片封面、横版活动海报；均按原字节本地化并登记共享资产 manifest。
- `e1f39598e034667a2fd70f75cc3abc7417691463.jpg` 为 720×720 方形活动海报；`807184dc48e985f18978e101364120ee2e192a82.jpg` 为 1146×716 视频卡片封面；`9724f297a750d0bbe2e5fa9a5607254e7270a970.jpg` 为 720×306 横版活动海报。其余引用是发布账号头像、会员／平台装饰，以及上述正文图的 AVIF／WebP 响应式副本，不重复进入正文。

## 2022 专题关系与标签

- `cv16481533` 是“拾荒战略Rags Drum 2022”征文公告，完整规定两条赛道、前后夜祭日程、评选和奖励；本页标题与正文明确公布该届前夜祭结果；`cv19384728` 则是同届年度征文最终评选结果。因此三者构成有直接标题、届次和流程证据的同一 2022 活动链。本篇只记录该关系，不创建或修改共享 topic。
- 使用既有标签 `拾荒战略`、`征文`、`社群活动`：它们分别连接活动总名、公告／评选用途和屋顶组织活动。不给“前夜祭”“稿酬”“评委团”、入选者名或单篇参赛作品另造低连接标签。

## 交付边界

- 本篇交付包括独立公开稿、逐字节 JSON 快照、三项本地资产、资产 manifest 登记和本证据说明；未修改共享 contributors、books、topics 或 tag aliases。
- Scoped `validate:content` 通过：1 篇文稿、255 位贡献者、0 项警告；共享 manifest 恢复 union 后，全库 `validate:content` 亦通过：244 篇文稿、20 本书、4 个专题、0 项警告。`verify:typography`、`verify:han-script`、`validate:media-html`、`verify:citations`、`audit:tags` 与 `audit:roof-archive` 均通过。
- 三项本地资产逐项核对 manifest 的 `bytes`、SHA-256 与 `image/jpeg` 类型，全部一致；JSON 快照与 raw archive 逐字节一致。`git diff --check` 通过。
- `npm run build` 通过，626 个静态页面完成；成品 `rags-drum-2022-pre-festival-results.html` 已生成，题词、七篇名单、两项外链、评委口径与三张本地化图片均进入渲染结果。
- `verify:snapshot-history` 的本篇新增快照符合 append-only 边界；全库命令被另一并行任务已修改的既有文件 `editorial-sources/roof-archive/cv17732899-evidence.md` 阻断，未发现本篇快照错误。
