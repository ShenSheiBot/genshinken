# Charter：键盘与 dialog 焦点

状态：`implemented`

## 任务与风险

检查 Reader 设置与移动注释 dialog 的键盘入口、初始焦点、正反向循环、关闭和触发点恢复，防止焦点逃到被遮挡背景或关闭后丢失阅读位置。

产品权威为 [`frontend-product-spec.md` 1、4.4 与 4.7](../../frontend-product-spec.md#1-全局品牌与语言)，运行时响应式职责见 [`reader-runtime.md` 第 3 节](../../architecture/reader-runtime.md#3-响应式职责)，执行与证据政策见 [`testing.md`](../../testing.md)。

自动化映射：[`tests/e2e/reader-dialog-focus.spec.ts`](../../../tests/e2e/reader-dialog-focus.spec.ts)。

## 环境与素材

| 场景 | 状态 | Projects | 素材 |
| --- | --- | --- | --- |
| 阅读习惯 dialog | `implemented` | `chromium`、`mobile-chromium`、`mobile-webkit` | `/posts/guxiang-de-bianzhengfa` |
| 移动注释 dialog | `implemented` | `mobile-chromium`、`mobile-webkit` | `/posts/lih-lenin-disputed` |
| 目录树与跨注释／文献历史 | `planned` | 待定 | `/posts/lih-lenin-disputed` |
| 屏幕阅读器与真实辅助技术 | `manual` | 实体环境 | 代表性正文 |

WebKit 本地 hydration 使用共享 CSP transport bridge；它不改变焦点产品代码，也不证明真实 Safari 辅助技术行为。边界见 [`testing.md` 第 5 节](../../testing.md#5-本地-webkit-csp-transport-bridge)。

## 自动化场景

当前 `implemented` 场景：

1. 打开阅读习惯 dialog，确认初始焦点位于 dialog 容器。
2. 从容器按 `Shift+Tab` 到最后一个可聚焦操作，再按 `Tab` 循环至首个操作。
3. 点击关闭，等待退出动画结束并确认焦点恢复到“阅读习惯”触发按钮。
4. 在移动 project 中聚焦正文第一个真实脚注，以键盘 `Enter` 打开“文章注释”。
5. 确认注释 dialog 初始焦点、反向循环与正向循环均留在当前可见 dialog 内。
6. 按 `Escape` 关闭，确认焦点恢复到原脚注链接。
7. 以真实注释 hash 深链载入移动正文，确认自动打开的注释 dialog 关闭后也恢复到对应正文脚注，而不是把焦点留在 `body`。

运行时可聚焦项必须排除处于 `[inert]` 或 `[aria-hidden="true"]` 祖先中的元素；dialog 自身获得初始焦点时，第一次 `Tab`／`Shift+Tab` 也必须进入首尾可见操作，不能逃到背景。

以下仍为 `planned`：

- 用键盘遍历完整目录树和多级展开／收拢；
- 注释进入文献时保持同一 dialog，并沿跨引用历史返回；
- 关闭按钮、`Escape`、遮罩和引用返回等不同退出路径的完整触发点恢复矩阵；
- `prefers-reduced-motion` 下关闭与恢复不依赖动画；
- 为成功态可见焦点样式主动附加截图。

## 体验式检查

以下状态为 `manual`：

- 可见焦点在明暗主题、衬线／无衬线和移动 viewport 中是否清楚且不被裁切；
- VoiceOver、NVDA 或其他屏幕阅读器是否正确朗读 dialog 名称、状态和返回关系；
- 触屏与外接键盘混合操作后的焦点位置；
- 长注释、文献表格和软键盘出现时的焦点与滚动体验。

自动化 `activeElement`、角色和 ARIA 断言不能写成完整 WCAG 或屏幕阅读器结论。

## 证据与失败条件

证据必须记录实际 project、精确提交、run ID/attempt、artifact 和 retry／flake。成功态可见焦点若没有主动截图，只能记录 DOM 焦点与可访问语义断言，不能追加视觉结论。

出现以下任一情况即为失败：

- dialog 打开后焦点留在背景或无可判断位置；
- 正向或反向 Tab 逃出当前 dialog；
- 隐藏、inert 或非活动面板的后代进入循环；
- `Escape`／关闭后不能恢复到精确触发源；
- 通过移除 `aria-modal`、焦点约束或产品交互来让测试变绿。

## 明确不证明的范围

- 完整 WCAG 合规：`not-covered`。
- 屏幕阅读器和真实辅助技术：`manual`。
- 可见焦点的全部主题与视觉组合：`manual`。
- 完整目录树、跨引用历史和所有退出路径：`planned`。
- 实体 iOS Safari 外接键盘行为：`not-covered`。
