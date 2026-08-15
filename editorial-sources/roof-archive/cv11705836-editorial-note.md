# cv11705836 编辑证据

- 原始快照与 raw JSON 字节一致，SHA-256 `606d3114c7056f8c223fcd5bcd9c1ac87f2b53809a1521a65d5a894637cfcaa5`。来源为 Bilibili `cv11705836`，发布日期 2021-06-13。
- 标题与目录核定为《象征界、崇高之物与齐泽克电影理论》第四章“电影、意识形态与形式”（上）。现有仓库已有第一章上篇、第三章上篇；来源目录直接证明本篇属于同一书系，但本任务不修改共享 book manifest。
- 页首明确署名原作者 Matthew Flisfeder、译者 snoper卓尔、校对肆玖。
- 源有 31 个图片引用，逐项均为封面、平台 UI、系列导航卡及其响应式副本；正文没有论证图，公开稿保留 0 张图。
- 正文从齐泽克引语开始，恢复“意识形态与形式”“原始大谎”“普遍性及其例外（们）”“伦理选择及其并行可能”和注释；删除平台目录卡、统计与通用授权说明。HTML 引号实体解码，机械修正连接号和段落句读。
- 标签 `[齐泽克, 电影理论, 意识形态, 拉康, 精神分析, 崇高]` 均为文章持续讨论对象与已有可复用入口。

## 核验

- `validate:content -- --file`、`verify:typography -- --file`、`verify:han-script -- --file`、`verify:citations -- --file`：通过。
- `validate:media-html`、`audit:tags`、`git diff --check`、快照 `cmp -s`：通过。
