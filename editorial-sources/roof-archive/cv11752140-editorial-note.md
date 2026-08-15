# cv11752140 编辑证据

- 原始快照与 raw JSON 字节一致，SHA-256 `f852d95e8fa99d011f432af1a462c27f0d22279e88a045a583fd1b62efa2b1d0`；完整性值 `ab6834e81b6a13b4ebecc34c6e2643c20c7ecc6bb16275e79f06a0afe0e7da65`。
- Bilibili `cv11752140` 于 2021-06-16 发布；页面明确作者为米岡，标题《从复制品到拟像：文艺消费的现代转向》，并说明为屋顶现视研“拾荒战略 Rags Drum 2021 前夜祭”获奖稿件。
- 结构化源有 28 个图片引用：封面、头像、平台装饰与导航/响应式副本之外，正文保留 8 张论证图，已本地化至 `public/attachments/roof-archive/cv11752140/` 并登记 assets manifest。
- 正文边界从“一、前言”开始，恢复四部分及小节标题、引文和脚注；删除活动元信息、平台统计和导航卡。HTML 实体解码，修复脚注段落句读和汉字邻接连接号。
- 标签仅取正文反复讨论且可复用的 `[消费文化, 拟像, 文化工业, 本雅明, 鲍德里亚, 数字媒介]`，未机械加入泛化主题。
- 未修改共享 book manifest。

## 核验

- 快照 `cmp -s`：通过。
- `validate:content -- --file`、`verify:typography -- --file`、`verify:han-script -- --file`、`verify:citations -- --file`：通过。
- `validate:media-html`、`audit:tags`、`git diff --check`：通过。
