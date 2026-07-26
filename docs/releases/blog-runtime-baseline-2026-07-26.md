# 博客运行时基线归档 · 2026-07-26

状态：**以注释标签确认的生产证据为准**

生产地址：<https://un-canon.blog>

版本锚点：`blog-runtime-baseline-2026-07-26`

运行时代码合并：`549558b036069777c492ad87b6220b75a9bae89d`

来源变更：[`un-canon/un-canon-blog#1`](https://github.com/un-canon/un-canon-blog/pull/1)

本文归档原型清理后的博客运行时基线。它冻结的是 Reader 组件边界、公开路由、内容构建与发布契约，不冻结持续更新的文章内容，也不把尚未接入的浏览器测试平台写成现有能力。

## 冻结范围

- 正式 Reader Chrome、状态逻辑与样式位于 `app/components/reading-edition/`，公开正文继续使用 `/posts/<slug>` 与 `/books/<slug>/chapters/<chapter>`。
- 旧 `/prototype/*` 路由、Folio 预览、edition/preview variant、variant switcher 及其孤立样式已经删除。
- 正文 DOM 协议统一使用 `reading-edition-*`；旧 `reading-prototype-*` 与 `data-reading-variant` 不再属于兼容面。
- 阅读进度、主题、繁简偏好、注释／文献联动、连续阅读和响应式布局以现行运行时文档与产品规格为准。
- 删除原型语料后，CJK 字体闭包、manifest 和 CSS 缓存键已经按固定工具链重建。
- 内容解析、构建、IndexNow、Vercel 部署和发布回归的职责边界已经写入仓库文档。

## 权威文档

- Reader 组件、状态与回滚：[`docs/architecture/reader-runtime.md`](../architecture/reader-runtime.md)
- 内容、字体与部署管线：[`docs/architecture/content-pipeline.md`](../architecture/content-pipeline.md)
- 产品和响应式验收：[`docs/frontend-product-spec.md`](../frontend-product-spec.md)
- 内容与交付门禁：[`docs/delivery-standards.md`](../delivery-standards.md)
- 字体重建：[`public/fonts/README.md`](../../public/fonts/README.md)

## 验收闭环

原型清理分支和运行时代码合并依次通过：

```text
npm ci
npm run check
npm audit --omit=dev --json
npm run build
npm run verify:release -- http://127.0.0.1:3100
```

本地固定时间构建生成 72 个静态页面且不再包含 `/prototype/*` 路由。浏览器回归覆盖普通正文、移动正文、长注释／文献正文、连续阅读、繁简往返、阅读设置和阅读记录；GitHub 必需质量门禁与 Vercel Preview 同样通过。

最终生产冻结必须同时满足：

1. 本归档文件已经进入 `main`；
2. 对应 Production deployment 为 `READY`；
3. 不可变 deployment URL 与 `https://un-canon.blog` 均通过 `verify:release`；
4. 正式域名完成代表性浏览器冒烟；
5. 注释标签 `blog-runtime-baseline-2026-07-26` 已推送。

## 不可变证据

本归档文件本身会触发最后一次生产构建，因此不能在同一个 Git 提交中自指并写入该次构建才产生的 Deployment ID。注释标签 `blog-runtime-baseline-2026-07-26` 是最终、不可漂移的证据载体，其标签说明必须记录：

- 标签指向的完整提交 SHA 与运行时代码合并 SHA；
- Vercel Production Deployment ID、不可变 deployment URL、创建／就绪时间和生产别名；
- GitHub `main` 质量门禁及 Vercel `READY` 结果；
- 不可变 URL 与正式域名的 `verify:release` 结果；
- 代表性生产浏览器冒烟结果和仍未覆盖的范围。

## 已知未覆盖范围

此基线尚未包含仓库化 Playwright specs、WebKit mobile、跨标签页真实浏览器竞态、焦点循环和剪贴板反馈自动化。这些属于下一阶段独立测试平台的首个质量基线，不回填为本次运行时冻结已经具备的能力。

## 回滚

运行时回滚以注释标签为定位入口。常规路径是对引入回归的提交执行 `git revert`，再经过正常 GitHub CI 与 Vercel Production 部署；若生产事故要求即时平台回退，可先在 Vercel Promote 标签说明记录的已验证 deployment，随后仍须补充 Git 回滚提交，使 `main` 与生产状态重新收敛。回滚前后都必须重新执行正式域名 `verify:release`；若问题来自后续内容提交，应优先回退相应内容，而不是无条件覆盖整套运行时基线。
