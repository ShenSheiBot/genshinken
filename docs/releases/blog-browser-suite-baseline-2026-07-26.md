# 博客浏览器套件基线归档 · 2026-07-26

状态：**`gated`（`pull_request` 与 `main` push）；最终 `baseline-verified` 以注释标签确认的主分支与生产证据为准**

生产地址：<https://un-canon.blog>

版本锚点：`blog-browser-suite-baseline-2026-07-26`

浏览器套件实现合并：`3b484d5047740c7cda3dda489c98f3565f81505a`

来源变更：[`un-canon/un-canon-blog#4`](https://github.com/un-canon/un-canon-blog/pull/4)

测试平台变更：[`UCCTB/web-test-platform#1`](https://github.com/UCCTB/web-test-platform/pull/1)

调用方固定的平台提交：`fd4527bfed95e44d5ae48ad4707295d199cd5418`

平台主分支合并：`65fd4a4dd8e49572e1a39fb0d0748b1b69402ddb`

本文归档原型清理后第二阶段的浏览器测试基线。它冻结博客仓库中的产品断言、Playwright 配置与测试说明，以及 UCCTB 平台在固定提交上的执行和 artifact 契约；它不冻结持续更新的文章内容，不把模拟设备等同于真实移动设备，也不把本地生产服务上的 Playwright 结果表述为部署后浏览器测试。

## 冻结范围

- Desktop Chromium Reader smoke：正式 Reader 根契约、正文完成标记、原型残留、文档级水平溢出、阅读习惯入口和浏览器错误。
- mobile Chromium：窄视口 Reader 布局、文章目录 sheet、背景滚动锁定、visual viewport 与关键操作可达性。
- mobile WebKit：iPhone 设备描述符下的窄视口布局、hydration 与已实现的 Reader 交互。
- Desktop Chromium 跨标签页状态：阅读记录保存与恢复、显式 hash 优先，以及远端关闭记录后来源页不再回写待写记录。
- 键盘与焦点：通过键盘入口打开设置 dialog、初始焦点、焦点循环与关闭后焦点恢复。
- BibTeX 剪贴板反馈：注入 `writeText` spy 后的成功写入、拒绝反馈与重试能力；不证明 API 缺失 fallback 或原生系统剪贴板。
- 测试治理：`docs/testing.md`、四份测试 charter、artifact 命名与保留、retry／flake 审查和冻结规则。

对应的权威测试资产为 `playwright.config.ts`、`tests/e2e/`、`.github/workflows/browser-smoke.yml`、[`docs/testing.md`](../testing.md) 与 [`docs/testing/charters/`](../testing/charters/)。后续修改这些资产或平台调用 SHA 时，必须建立新的证据链；不得移动或重打本基线标签。

## 权威资产与职责边界

博客仓库拥有 Playwright 与浏览器版本 lockfile、项目矩阵、fixtures、specs、产品断言、选择器、失败修复、调用方 workflow pin 和 artifact 内容审查。冻结时以 `.github/workflows/browser-smoke.yml` 中 `uses:` 的完整 40 位 SHA 为实际平台执行锚点，因此平台 PR 的 merge commit 不替代调用方固定的 `fd4527bfed95e44d5ae48ad4707295d199cd5418`。

`UCCTB/web-test-platform` 只拥有固定 runner、Node 配置、浏览器安装与执行顺序、路径约束、上游 Action SHA、权限和 artifact 上传契约。平台不拥有博客产品断言，不接收调用方额外 secrets，也不把测试状态或 artifact 写回平台仓库。

Playwright HTML report、trace、截图、视频和日志均属于博客调用方的 Actions run。平台 main 的 Quality 结果证明平台提交本身通过契约检查，但不能替代博客调用方对具体产品提交的 Browser suite 与 artifact 证据。

## 验收闭环

最终生产冻结必须同时满足：

1. 本归档文件已通过独立 PR 进入 `main`，并取得该 merge commit 的完整 SHA；
2. 该提交的 `main` Quality 与 Browser suite 均成功，Browser suite 的 run attempt 可唯一定位；
3. 调用方 Playwright artifact 已下载并核验名称、ID、字节大小、SHA-256、到期时间及内嵌报告；
4. 报告没有 unexpected、flaky 或多结果测试，且没有依赖 retry 才通过；
5. 该提交对应的 Vercel Production deployment 为 `READY`，GitHub Deployment 与 Vercel Deployment 均关联同一提交和不可变 URL；
6. 不可变 deployment URL 与 `https://un-canon.blog` 指向同一 Vercel Deployment ID，并分别通过 `npm run verify:release -- <base-url>`；
7. 注释标签 `blog-browser-suite-baseline-2026-07-26` 指向本归档的 merge commit，标签说明完整记录最终证据。

Browser suite 当前是人工硬门禁，即使仓库规则尚未把它设为 required context，也不得在冻结时跳过或用 Quality 结果代替。

## 不可变证据契约

本归档文件会触发新的 GitHub Actions run 和生产构建，因此不能在同一个提交中自指并写入该次构建才产生的 run、artifact 或 Deployment ID。注释标签 `blog-browser-suite-baseline-2026-07-26` 是最终、不可漂移的证据载体，其标签说明必须至少记录：

- 标签目标完整 SHA、浏览器套件实现 merge SHA、调用方固定的平台 SHA 与平台 main merge SHA；
- 平台 Quality run、博客 `main` Quality run，以及 Browser suite run ID、run attempt 和 job；
- artifact 名称、ID、大小、下载内容 SHA-256 和到期时间；
- Playwright 报告的 total、expected、skipped、unexpected、flaky、多结果测试与 retry 使用情况；
- Vercel Deployment ID、GitHub Deployment ID、Production `READY` 时间和不可变 deployment URL；
- 正式域名与不可变 URL 指向同一 deployment 的核对，以及两次 `verify:release` 结果；
- 本文冻结范围和已知未覆盖范围。

artifact 过期后，标签中的摘要只能证明当时完成过核验，不能还原原始 HTML report、trace、截图、视频或日志。涉及失败或 retry 时还必须保留初始失败、最终结果与处置说明，不能只记录绿色结论。

## 已知未覆盖范围

- 真实 iOS Safari、Android Chrome、实体设备、动态地址栏、非零 safe-area 与真实触摸行为；这些仍需人工或设备实验室验证。
- Firefox 桌面或移动自动化。
- 完整 WCAG 审计、屏幕阅读器和其他真实辅助技术组合。
- 对 Vercel 不可变 URL 或正式域名直接执行 Playwright；现有 Playwright 配置仍启动本地 `next start`。
- WebKit 对原生系统剪贴板的真实写入；现有自动化只验证调用与页面反馈。
- `navigator.clipboard` 缺失时的 fallback，以及 Chromium 原生 clipboard permission 与写入／读回。
- 主题与繁简偏好的真实跨标签页传播，以及 WebKit／mobile 跨标签页竞态。
- 成功态完整视觉构图、字体观感、真实行盒和全部动效终态。
- 跨设备、跨浏览器 profile、隐私窗口或服务器端阅读记录同步。
- TLS 握手、证书链、HSTS、边缘传输、混合内容及生产 CSP header 的全面安全验证；`verify:release` 不覆盖这些项目。

## 回滚

出现回归时保留失败提交、run、artifact 和 Deployment ID，优先前向修复。必须回退时，对引入回归的提交执行 `git revert`，让变更重新经过正常 GitHub Actions 与 Vercel Production；随后重新运行受影响的浏览器场景、核验新 artifact，并对新的不可变 deployment URL 与正式域名分别执行 `verify:release`。不得改写共享历史、移动既有基线标签，或把回滚后的新提交冒充本基线原提交。
