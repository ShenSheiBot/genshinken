# Charter：移动 Chromium／WebKit Reader

状态：`implemented`

## 任务与风险

在移动 Chromium 和 Playwright WebKit 中检查正式 Reader 的重排、hydration、工具入口、目录 sheet 与 visual viewport 边界，优先发现只在移动引擎、字体加载后布局或 WebKit 本地传输中出现的回归。

本 charter 不重新定义移动设计。产品判定以 [`frontend-product-spec.md` 4.1、4.5–4.7](../../frontend-product-spec.md#41-通用布局) 为准，运行时职责以 [`reader-runtime.md` 3、7、8](../../architecture/reader-runtime.md#3-响应式职责) 为准，执行与证据政策以 [`testing.md`](../../testing.md) 为准。

## 环境与素材

| 项目 | 状态 | 环境 | 角色 |
| --- | --- | --- | --- |
| `mobile-chromium` | `implemented` | Pixel 7 device 参数，viewport `375 × 812` | 移动下限和 Chromium 行为。 |
| `mobile-webkit` | `implemented` | Playwright iPhone 15 device 参数 | 约 390px 的 WebKit 行为。 |
| Firefox mobile | `not-covered` | 无自动 project | 产品规格要求的 Firefox 断行另行检查。 |
| 真实 iOS／Android 设备 | `manual` | 实体设备与系统浏览器 | 动态地址栏、safe-area、真实触摸和字体观感。 |

主要素材为 `/posts/guxiang-de-bianzhengfa`。注释／文献密集场景使用 `/posts/lih-lenin-disputed` 的扩展检查，当前为 `planned`。

自动化映射：[`tests/e2e/reader-mobile.spec.ts`](../../../tests/e2e/reader-mobile.spec.ts)。

## 自动化场景

当前 `implemented` 场景：

1. 打开普通正文并等待 `document.fonts.ready`。
2. 确认移动文章目录、繁简按钮和阅读习惯入口可见，桌面全站导航与独立主题按钮不占据移动页眉。
3. 比较 `documentElement.scrollWidth` 与 `clientWidth`，允许 1px 渲染误差，不允许文档级水平溢出。
4. 打开“文章目录” dialog，确认背景滚动被锁定。
5. 以 `visualViewport` 或窗口尺寸为边界，确认 sheet 四边都位于可见区域内，允许 2px 亚像素误差。
6. 确认目录内的本页 BibTeX 复制、下载和返回篇首操作可达。

以下仍为 `planned`：

- 在 390px 精确 viewport 重复注释／文献弹层的展开、跨引用和 `scrollTop ≤ 1px` 契约；
- 覆盖 767／768px 断点两侧和 1024／1360px 的职责切换；
- 对 `text-align: start`、零额外字距与长罗马数字注释编号补充稳定断言；
- 为成功态移动构图主动附加截图，而不是只依赖失败截图；
- 在 Firefox 中检查起始对齐和零额外字距。

不得断言 Chromium 与 WebKit 在同一字符换行，也不得固定视觉行总数；字体、字族、引擎和 viewport 都可能改变合法换行点。

## WebKit 本地 bridge 边界

所有 specs 通过共享 [`tests/e2e/fixtures.ts`](../../../tests/e2e/fixtures.ts) 导入测试对象。WebKit 自动 fixture 只把 CSP 升级后的 `https://127.0.0.1:3100/**` 请求桥接回本地 HTTP `next start`，不修改 CSP、不启用 `bypassCSP`，也不影响正式域名。

该机制只让本地 WebKit 在保留 `upgrade-insecure-requests` 时取得 CSS、字体和 Next.js chunks 并执行 hydration。它不证明 TLS、证书、HSTS、Cloudflare 边缘网络、线上混合内容、真实 Safari 或 CSP 的完整安全性。详细原因与限制见 [`testing.md` 第 5 节](../../testing.md#5-本地-webkit-csp-transport-bridge)。

## 体验式检查

以下状态为 `manual`：

- 实体 iPhone Safari 的动态地址栏收放、非零 safe-area 和底部 sheet 触控命中区；
- 实体 Android Chrome 的软键盘、返回手势和视口缩放；
- 移动中文断行是否自然、起始对齐是否稳定、字体 fallback 是否出现明显跳变；
- 目录、注释和文献动效在默认与 `prefers-reduced-motion` 下的终态；
- 成功态页面是否仍保持案卷式移动重组，而不是被压缩的桌面三栏。

## 证据与失败条件

自动化证据必须指向精确博客 SHA、平台 SHA、project、Playwright 版本、run ID/attempt 与 caller artifact。若测试只在 retry 后结束，记录为 flake，不以最终总结掩盖初始失败。

出现以下任一情况即为失败：

- 页面未 hydration、存在未解释的 console／page error；
- 移动工具入口缺失或桌面导航占据移动页眉；
- 文档水平溢出超过容差；
- dialog 超出 visual viewport、背景未锁定或关键操作不可达；
- 为让测试通过而删除生产 CSP、扩大 bridge 到非 loopback 或把 WebKit 仿真描述成真实 Safari。

## 明确不证明的范围

- Playwright WebKit 等同真实 iOS Safari：`not-covered`。
- Firefox 自动化：`not-covered`。
- TLS／证书链与生产 CDN 网络：`not-covered`。
- 真实设备视觉、触摸、动态地址栏和 safe-area：`manual`。
- 完整视觉回归与跨站点性能：`not-covered`。
