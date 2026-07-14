# 西方負典前端改版归档 · 2026-07-14

状态：**正式收口**

生产地址：<https://un-canon.blog>

版本锚点：`frontend-redesign-2026-07-14`

本文归档 2026 年前端改版的现行方案、交付范围与验收依据。西方負典仍是持续更新的博客，因此本次归档只冻结这轮前端项目的版本锚点，不冻结 GitHub 仓库，也不影响后续通过 `main` 发布内容。

## 交付范围

- 首页采用四栏目编辑展示，视觉权重为「论 > 评 > 译介 > 多媒体」，主展示区密铺并保留最新更新区。
- 正式动效采用校样落版节奏；Hero「西方負典」的裁切揭示连续覆盖完整字形，刷新时不暴露深色网格底板。
- 正文采用案卷阅读方案，具备视觉行进度、行号跳转、可折叠目录、字体主题和响应式注释／文献交互。
- 文章索引支持栏目、主题分类与标签的组合筛选；移动端默认收起三个筛选面板。
- 多媒体使用独立站内详情页，只提供站外平台入口、资料和关联站内文稿，不嵌入播放器。
- 全站品牌、中文单语界面、页脚标识、署名标记与编辑邮箱按现行产品规格统一。

## 验收依据

- 产品与交互：[`docs/frontend-product-spec.md`](../frontend-product-spec.md)
- 内容与发布：[`docs/delivery-standards.md`](../delivery-standards.md)
- 自动发布回归：`scripts/verify-editorial-release.mjs`

归档版本在发布前通过以下门禁：

```text
npm run check
npm audit --audit-level=high
npm run build
npm run verify:editorial -- http://127.0.0.1:<port>
```

生产验收使用：

```text
npm run verify:editorial -- https://un-canon.blog
```

注释标签 `frontend-redesign-2026-07-14` 指向本轮正式生产提交；标签说明记录精确的提交 SHA、Vercel Deployment ID、生产域名及线上验收结果，是本轮改版不可漂移的最终归档凭据。
