# 测试策略、执行与证据

状态：`implemented`

本文是仓库内测试层级、浏览器矩阵、执行方式和证据边界的现行运行手册。产品行为以 [`frontend-product-spec.md`](frontend-product-spec.md) 为权威，Reader 状态与组件协作以 [`architecture/reader-runtime.md`](architecture/reader-runtime.md) 为权威，内容、构建和部署链路以 [`architecture/content-pipeline.md`](architecture/content-pipeline.md) 为权威。本文说明如何验证这些契约，不重新定义产品行为。

测试资产存在不等于某个分支、`main` 或生产环境最近一次执行成功。真实结果必须回到精确 Git 提交、GitHub Actions run、artifact 和部署证据判断。

## 1. 状态词

覆盖表、charter 与冻结记录只使用以下六种状态：

| 状态 | 含义 |
| --- | --- |
| `implemented` | 仓库中已经有对应命令、配置或自动化断言；不表示最近一次远端执行成功。 |
| `planned` | 已确定任务和验收边界，但尚无完整、可执行的仓库资产。 |
| `gated` | 指定分支或事件会由现行 CI 自动执行该资产；必须同时写明触发范围，不能暗示 branch protection 一定要求该 check。 |
| `baseline-verified` | 已把精确提交、run／attempt、artifact 与适用的部署证据冻结为可追溯基线。 |
| `manual` | 需要真实设备、人工观察或体验判断；Playwright 结果不能替代。 |
| `not-covered` | 当前范围明确不验证，发布或冻结时必须继续披露。 |

不得从 `implemented` 推导 `gated` 或 `baseline-verified`，也不得把 charter 的存在当作执行证据。本分支中的第二阶段资产当前只标为 `implemented`；只有博客 PR 和后续 `main` 的真实 workflow／artifact 可把对应范围提升为 `gated` 或 `baseline-verified`。

## 2. 门禁分层

`package.json` 是命令名称与组合顺序的唯一真源；本文不复制 `check` 内部所有子脚本。

| 层级 | 状态 | 入口 | 能证明什么 | 不能证明什么 |
| --- | --- | --- | --- | --- |
| 静态与纯逻辑 | `implemented` | `npm run check` | 内容、净化、字体、阅读记录纯函数、繁简、引用、路由、类型与 lint 契约。 | Hydration、真实浏览器状态、焦点、WebKit 和视觉终态。 |
| 生产构建 | `implemented` | `npm run build` | Next.js 编译、SSG、路由和静态资源可生成。 | Cloudflare Worker 环境、客户端交互和生产网络。 |
| SSR／HTTP 发布回归 | `implemented` | `npm run verify:release -- <base-url>` | 生成 HTML、metadata、公开路由、重定向、sitemap、RSS 和字体资源。 | 客户端 JavaScript、localStorage、焦点、剪贴板和真实行盒。 |
| Playwright 本地生产构建 | `implemented` | `npm run test:e2e` | 在浏览器引擎中加载本地 `next start`，执行仓库自有交互断言。 | Cloudflare Worker 部署后的浏览器行为、真实设备、全部视觉和无障碍体验。 |
| 体验式审查 | `manual` | 四份 [test charter](testing/charters/) | 真实设备、视觉观感和辅助技术等不能稳定编码的判断。 | 可重复的自动化门禁或持续执行状态。 |
| 部署后浏览器自动化 | `not-covered` | 无 | — | 正式域名或不可变 deployment URL 的客户端回归。 |

Quality 与 Browser workflow 都会独立安装、检查和构建调用方代码。两条工作流不共享可写工作区或构建 artifact；一次成功不能替代另一层的证据。

## 3. 当前浏览器资产

项目矩阵的可执行真源是根目录 [`playwright.config.ts`](../playwright.config.ts)：

| Project | 状态 | 环境 | 当前意图 |
| --- | --- | --- | --- |
| `chromium` | `implemented` | Playwright Desktop Chrome | 基础 Reader smoke、桌面跨标签页状态和通用交互。 |
| `mobile-chromium` | `implemented` | Pixel 7 device 参数，viewport 覆写为 `375 × 812` | 移动下限、目录 sheet、焦点和剪贴板反馈。 |
| `mobile-webkit` | `implemented` | Playwright iPhone 15 device 参数 | 约 390px 的 WebKit 移动重排、hydration 和交互。 |

具体设备参数、浏览器修订版和 Playwright 版本由配置及 `package-lock.json` 决定。文档中的名称用于解释职责，升级时必须以实际配置和 lockfile 为准。

当前 specs 与 charter 的映射如下：

| Spec | 状态 | 主要职责 |
| --- | --- | --- |
| `tests/e2e/reader-smoke.spec.ts` | `implemented` | 正式 Reader 根契约、正文完成、原型残留、水平溢出、设置入口和浏览器错误。 |
| `tests/e2e/reader-mobile.spec.ts` | `implemented` | 移动工具、目录 sheet、visual viewport 与正文水平溢出。 |
| `tests/e2e/reader-cross-tab.spec.ts` | `implemented` | Desktop Chromium 中的保存位置恢复、显式 hash 优先和远端关闭记录后的待写取消。 |
| `tests/e2e/reader-dialog-focus.spec.ts` | `implemented` | 设置与移动注释 dialog 的焦点循环、关闭、触发点恢复，以及阅读习惯抽屉开合期间页眉三键的 DOM 与几何稳定性。 |
| `tests/e2e/reader-book-chapter.spec.ts` | `implemented` | 章节案卷编号与普通正文一致、数字动画、本章结束语义、全书目录复合编号的真实行盒，以及共享章题的分篇保持在同一 canonical 页并执行章内／跨章 hash 跳转。 |
| `tests/e2e/reader-chrome-transition.spec.ts` | `implemented` | 连载页进入章节的页眉入场、离开 Reader 的反向动效，以及章节间导航不误触发离场。 |
| `tests/e2e/reader-clipboard.spec.ts` | `implemented` | BibTeX 写入数据、成功 live status、拒绝反馈和重试能力。 |
| `tests/e2e/reader-title-fit.spec.ts` | `implemented` | 枚举 sitemap 中全部文章与章节，在 1024px／1440px 真实标题字体下阻止标题段越出标题栏、页面横向溢出、视觉行以闭标点起头、单字孤行、实词跨行及超过五行的封面标题。 |

测试优先使用角色、中文可访问名称、稳定 URL 与内容语义。只有验证 Reader 内部组件协作时才使用 `reading-edition-*` 等内部协议；更名时生产者、使用者、验证脚本和本文映射必须原子更新。

## 4. 稳定测试素材

浏览器 specs 使用公开内容，不为测试配置或传递账号、额外 token 或私有 fixture：

| 路径 | 用途 |
| --- | --- |
| `/posts/guxiang-de-bianzhengfa` | 普通 Reader、移动布局、设置、阅读记录和本页 BibTeX。 |
| `/posts/lih-lenin-disputed` | 同时具有大量注释、文献与跨引用的长正文。 |
| `tests/fixtures/books/inline-sections.json` | 不进入公开路由的能力夹具：连续分篇、已发布／待发布状态与原书／译本双书目。 |
| `/books/zero-years-imagination/chapters/chapter-02` | 当前公开文库的章节封面、目录返回与前后章导航。 |

若内容修改破坏某项素材能力，应在同一变更中更新 spec 与本表；不能为保持绿色而删除产品断言或猜造内容。

## 5. 本地 WebKit CSP transport bridge

本地 WebKit 项目通过 `tests/e2e/fixtures.ts` 中的自动 fixture 安装一条只用于测试的 loopback transport bridge。博客生产构建由 `next start` 在 `http://127.0.0.1:3100` 提供，同时返回由同一 `next.config.ts` 生成、预期用于生产且包含 `upgrade-insecure-requests` 的 CSP。Playwright 1.62 WebKit 会据此把同源 HTTP CSS、字体和 Next.js JavaScript chunk 改写为 `https://127.0.0.1:3100/...`；本地 Next server 不提供 TLS，这些请求会以 `SSL connect error` 失败，静态 HTML 虽可返回，客户端却不能完整加载样式或 hydration。当前 Chromium 对同一数值 loopback 没有表现出这项改写差异。

bridge 只在 `browserName === "webkit"` 时拦截精确的 `https://127.0.0.1:3100/**`。它通过 Playwright `route.fetch()` 把传输 URL 改回对应的 HTTP loopback，再以 `route.fulfill({ response })` 回填原 WebKit 请求。它不删除或修改页面 CSP、不启用 `bypassCSP`，也不改变博客生产代码；主文档仍由 HTTP loopback 提供并继续携带原 CSP。所有 specs 从共享 fixture 导入，因此 bridge 自动生效；正式域名和不可变 deployment URL 不匹配这条精确路由。

该机制只能说明：保留当前生产配置中的 CSP 指令时，Playwright WebKit 可以加载本地构建并执行 hydration 与 Reader 交互。它不能证明本地服务支持 HTTPS，也不验证 TLS 握手、证书链、HSTS、HTTP→HTTPS 重定向、Cloudflare 边缘传输、真实部署的混合内容行为或 CSP 的完整安全性。现有 `verify:release` 不断言 `Content-Security-Policy` header；若冻结范围需要证明线上 header，必须对 Worker URL 与公开别名另行抓取并记录明确的 header 证据。

bridge 也不等同真实 iOS Safari，不覆盖动态地址栏、非零 safe-area、系统剪贴板权限、缓存、网络性能或证书错误处理。剪贴板 specs 使用显式注入的 `writeText` spy，只验证 UI 与公开 BibTeX 数据契约。

## 6. 本地执行

先使用锁文件安装依赖并生成生产构建：

```text
npm ci
npm run check
npm run build
npx playwright install chromium webkit
```

运行完整矩阵：

```text
npm run test:e2e
```

按 project 或 spec 缩小范围：

```text
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=mobile-chromium --project=mobile-webkit
npm run test:e2e -- tests/e2e/reader-cross-tab.spec.ts --project=chromium
npm run test:e2e -- tests/e2e/reader-dialog-focus.spec.ts
```

PowerShell 下模拟 CI 的单 worker、重试和 `forbidOnly`：

```powershell
$env:CI = "true"
npm run test:e2e
$testExit = $LASTEXITCODE
Remove-Item Env:CI -ErrorAction SilentlyContinue
exit $testExit
```

测试默认启动 `http://127.0.0.1:3100` 的本地生产服务。`PLAYWRIGHT_BASE_URL` 只改变导航基址，当前配置仍会启动本地 webServer，因此它不是独立的 deployment smoke 模式；不得据此把本地报告记成生产浏览器证据。

## 7. UCCTB 平台与博客的责任边界

博客仓库拥有：

- Playwright 与浏览器版本的 lockfile；
- `playwright.config.ts`、项目矩阵、specs 和测试素材；
- 产品断言、选择器、失败修复与 artifact 的内容审查；
- 调用工作流中的完整平台 SHA 和冻结记录。

`UCCTB/web-test-platform` 拥有：

- 固定 Ubuntu runner、Node 配置和浏览器安装／执行顺序；
- 可复用工作流的路径约束、上游 Action SHA 与 artifact 上传契约；
- 平台自身的 workflow contract 校验和安全说明。

平台不拥有博客产品断言，不声明或接收调用方配置的 repository／organization secrets，也不把状态或 artifact 写回 UCCTB 仓库。GitHub 会为 reusable workflow 自动提供 caller 范围的 `GITHUB_TOKEN`；caller 与 called workflow 都把它限制为 `contents: read`，且不得增加 `secrets: inherit`。Playwright HTML、trace、截图、视频和日志属于博客的调用方 Actions run；平台维护者不能把未来提交自动应用到已经固定的 SHA。

### 平台 SHA 更新

1. 在平台仓库的独立 PR 中同时审查 reusable workflow、契约验证器、README 与 SECURITY；若浏览器或命令变化，四处必须一致。
2. 运行平台的 `npm ci`、`npm run check` 和 `git diff --check`，确认权限、无 `workflow_call.secrets`／`secrets: inherit`、路径约束、artifact 规则和上游 Action 完整 SHA 未被意外放宽。
3. 平台目标提交经过审查且其 Quality 结果可核验后，取得完整 40 位 SHA。公开仓库中仍由平台 PR 分支保留、可被 GitHub Actions 解析的 head commit 也可先用于博客 PR 联调，不要求两个 PR 在审查阶段串行合并；在博客变更进入长期基线前，该平台提交必须保持可达。分支名、短 SHA 和可移动 tag 不能作为 caller 锚点。
4. 在博客独立 PR 中把 `.github/workflows/browser-smoke.yml` 的 `uses:` 更新为已审查 SHA，并与项目矩阵、specs 和文档一同验证；不传调用方配置的额外 secrets，并核对 job/check 名称变化是否影响仓库规则。
5. 核对博客 PR 与后续目标提交的最终 Actions run 和 artifact。仅有平台提交或本地通过都不能替代调用方证据。

当前采用的精确 SHA 以 `.github/workflows/browser-smoke.yml` 为唯一现行真源，本文不复制一份可能漂移的值。每次冻结则必须把当时采用的完整平台 SHA 写入 release 归档和注释标签。

## 8. Artifact、retry 与 flake

配置在 CI 中使用一个 worker、一次 retry、禁止 `test.only`；本地默认不 retry。HTML report 写入 `playwright-report/`，运行证据写入 `test-results/`，两者均被 Git 忽略。

平台在路径验证成功后即使普通步骤失败也尝试上传两处目录，artifact 名为 `playwright-<run_id>-<run_attempt>`，并归属于博客 caller run。若 `playwright-report/` 与 `test-results/` 两个 evidence 目录都没有可上传文件，上传步骤应失败。artifact 可能含公开正文、BibTeX、错误日志和失败截图，但仍按潜在敏感数据处理；测试不得写入凭据、个人数据或生产 session。

一次 retry 后成功的测试仍是 flake。冻结候选必须检查 HTML report 中的 retry／flaky 标记，记录失败的初始 attempt、最终 run attempt 和处置结果，不能只记录绿色总结。当前 `trace: retain-on-failure` 与 `screenshot: only-on-failure` 不会为成功态自动生成视觉证据；需要视觉签核时由 charter 明确留存截图或人工记录。

artifact 有保留期限。冻结记录至少保存调用方仓库、博客提交、平台提交、run ID/attempt、artifact 名称/ID、大小、到期日和已知未覆盖范围；过期后的摘要不能还原原始报告。

## 9. 冻结与回滚证据

冻结一次发布时，记录目标提交、GitHub run／attempt、artifact、Cloudflare Worker 版本 ID、Worker URL、公开别名回归结果和已知未覆盖范围。时点记录一经停止维护即是历史快照，不得冒充当前部署说明。

出现回归时保留失败提交、run、artifact 和 Worker 版本 ID，优先前向修复；必须回退时使用 `git revert` 形成新提交，再通过 Cloudflare production 部署入口发布，并重新执行受影响的浏览器场景及 Worker URL／公开别名 `verify:release`。不得改写共享历史。

## 10. Charters 与已知边界

- [移动 Chromium／WebKit Reader](testing/charters/reader-mobile-engines.md)
- [跨标签页状态与恢复](testing/charters/reader-cross-tab-state.md)
- [键盘与 dialog 焦点](testing/charters/reader-keyboard-focus.md)
- [BibTeX 剪贴板与反馈](testing/charters/citation-clipboard-feedback.md)

当前仍明确保留以下边界：

- Firefox 移动断行自动化：`not-covered`；产品规格要求的 Firefox 检查仍需单独执行。
- 真实 iOS Safari、Android Chrome、动态地址栏、非零 safe-area 和实体触摸：`manual`。
- 屏幕阅读器与完整 WCAG 审计：`manual`。
- 成功态视觉构图、字体观感和动效终态：`manual`。
- 正式域名及不可变 deployment URL 的 Playwright 自动回归：`not-covered`。
- 跨设备、跨浏览器 profile 或服务器端阅读记录同步：`not-covered`，产品本身也不承诺这些能力。
- 原生 WebKit／iOS 系统剪贴板、TLS 与证书行为：`not-covered`。
