# Charter：BibTeX 剪贴板与反馈

状态：`implemented`

## 任务与风险

检查 Reader 的“复制本页 BibTeX 引用”是否写入同页公开 `.bib` 数据，并为成功和拒绝提供可访问、可重试的反馈；避免只改变按钮视觉文本而不给读屏用户状态，或把测试注入的 clipboard spy 误写成操作系统剪贴板集成。

产品权威为 [`frontend-product-spec.md` 第 6 节](../../frontend-product-spec.md#6-书籍连载与引用)，引用生成与发布层级见 [`content-pipeline.md`](../../architecture/content-pipeline.md)，执行与证据政策见 [`testing.md`](../../testing.md)。

自动化映射：[`tests/e2e/reader-clipboard.spec.ts`](../../../tests/e2e/reader-clipboard.spec.ts)。

## 环境与素材

| 场景 | 状态 | Projects | 素材 |
| --- | --- | --- | --- |
| 正文 BibTeX 成功／拒绝反馈 | `implemented` | `chromium`、`mobile-chromium`、`mobile-webkit` | `/posts/guxiang-de-bianzhengfa` 与其 `/cite.bib` |
| 书籍原书／译本两个复制位 | `planned` | 待定 | `/books/shulgin-dni` |
| Chromium 原生 clipboard permission 与读回 | `planned` | `chromium` | 公开 BibTeX |
| WebKit／iOS 系统剪贴板 | `not-covered` | 无稳定自动环境 | 实体系统 |

移动项目先打开文章目录以暴露复制按钮；桌面项目使用可见 Reader 引用操作。WebKit 本地请求通过共享 CSP bridge 完成 hydration，但 clipboard 仍由明确注入的 spy 控制，bridge 不提供 secure-context 或原生权限证明。

## 自动化场景

当前 `implemented` 场景：

1. 页面加载前以 `addInitScript` 安装确定性的 `navigator.clipboard.writeText` spy。
2. 获取当前正文 `/cite.bib` 的公开响应文本。
3. 点击“复制本页 BibTeX 引用”，确认写入值与 `.bib` 响应在忽略末尾换行后完全一致。
4. 确认按钮出现“已复制”，`role=status` 以 polite live region 发布“BibTeX 已复制到剪贴板”。
5. 在另一个隔离测试中让第一次 `writeText` reject，确认 live status 显示“复制失败，请重试”且按钮恢复可用；第二次点击改为 resolve，并再次比对写入值与 `.bib` 后确认成功状态。

当前测试证明的是 UI 状态与写入参数合同，不是操作系统剪贴板。注入 spy 的内容必须来自公开 `.bib` 响应，不能在 test 中复制一份手写 BibTeX 期望值而与生产生成器漂移。

以下仍为 `planned`：

- `/books/shulgin-dni` 原书和译本两个复制位分别匹配各自生成数据，缺失资料不借用另一版本；
- Chromium 隔离 context 中授予 clipboard permission 后的原生写入／读回；
- `navigator.clipboard` 不存在时 `document.execCommand("copy")` fallback 的兼容分支；
- 多次快速点击、状态复位和组件卸载时 timer 清理；
- 下载链接与复制内容在更多 citation item type 中的一致性浏览器抽查。

内部 3200ms 状态复位时长不是产品规格，不应固定为公开断言，除非产品文档另行规定。

## 体验式检查

以下状态为 `manual`：

- 读屏软件是否在成功和失败时朗读一次清楚、不过度重复的状态；
- 实体桌面与移动系统的 clipboard permission 提示、拒绝和重试体验；
- 按钮成功／失败反馈在不同主题和窄 viewport 中是否可见且不造成布局跳动。

## 证据与失败条件

证据必须标明使用 spy 还是原生 clipboard、实际 project、精确提交、run ID/attempt、artifact 与 retry／flake。用 spy 取得的报告只能写 UI／数据合同，不能写系统剪贴板或 Safari 集成。

出现以下任一情况即为失败：

- 写入值与当前 `.bib` 响应不一致；
- 成功只有视觉按钮文字而 live status 为空；
- 拒绝后没有明确状态、按钮永久 disabled 或抛出未捕获错误；
- 原书／译本复制位串用另一份记录；
- 把 CSP bridge、spy 或 mock 结果描述成原生 secure-context／系统权限证据；
- 将 token、私有数据或生产 session 写入 report、trace 或截图。

## 明确不证明的范围

- WebKit／iOS 原生系统剪贴板：`not-covered`。
- Clipboard secure-context、权限提示和浏览器策略：`not-covered`。
- Chromium 原生写入／读回：`planned`。
- 书籍双复制位与 fallback：`planned`。
- 屏幕阅读器真实朗读与视觉反馈观感：`manual`。
