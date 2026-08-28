# Charter：跨标签页状态与恢复

状态：`implemented`

## 任务与风险

用真实同源多页面检查阅读记录的保存、恢复、显式定位优先级和远端关闭记录后的竞态，防止较旧标签页在失焦或关闭时覆盖较新的用户决定。

权威契约来自 [`reader-runtime.md` 4–6](../../architecture/reader-runtime.md#4-本机状态边界) 与 [`frontend-product-spec.md` 4.2](../../frontend-product-spec.md#42-视觉行进度)。执行和证据边界见 [`testing.md`](../../testing.md)。

自动化映射：[`tests/e2e/reader-cross-tab.spec.ts`](../../../tests/e2e/reader-cross-tab.spec.ts)。

## 环境与素材

- Project：`chromium`。
- 状态：`implemented`。
- 素材：`/posts/guxiang-de-bianzhengfa`。
- 页面关系：同一个 BrowserContext 中创建多个 Page，使它们共享真实同源 `localStorage`。
- 禁止直接构造并 dispatch `StorageEvent` 冒充浏览器传播。

移动引擎和 WebKit 的同场景执行当前为 `not-covered`；本轮把跨标签页竞态固定在 Desktop Chromium，避免在三个 project 中重复同一状态逻辑。

## 自动化场景

当前 `implemented` 场景：

1. 在来源标签页通过公开视觉行控件跳转，等待版本化阅读记录真实写入。
2. 打开同源新标签页，确认无 hash URL 恢复到保存位置，并允许视觉行重测产生不超过三行的定位差异。
3. 再打开带 `#reading-cover` 的标签页，确认显式 hash 优先于本机记录，且不显示自动恢复反馈。
4. 以 Playwright Clock 冻结来源页计时器，产生待写位置并确认记录尚未落盘；正向对照在记录仍开启时关闭来源页，确认 pagehide 会实际写入该 pending record。
5. 反向场景建立相同 pending 前置条件后，由另一标签页通过阅读习惯开关关闭本机记录；等待来源页接收真实 storage 更新并关闭来源页，确认其 pagehide／unmount 不会重新写入被取消的 pending record。

以下仍为 `planned`：

- 较新远端阅读记录淘汰本页较旧的 pending write，且旧页失焦／关闭后不能覆盖较新记录；
- 主题 `roof_theme` 与繁简 `roof_chinese_script` 的真实跨标签传播；
- 清除本文、清除全部与无关 localStorage 键的隔离；
- reload、back/forward、BFCache 与加载期用户输入优先于自动恢复；
- 存储读写被浏览器拒绝时正文仍可阅读；
- 追加内容和 `contentRevision` 改变后的真实浏览器恢复。

## 判定规则

- 测试只通过公开控件和真实浏览器存储路径改变状态；读取 localStorage 只用于取证，不直接写入伪造业务记录。
- 不用固定长时间 sleep 判断保存或传播，使用可观察 UI、存储值和 Playwright 自动重试。
- pending write 场景必须用可控时钟建立“用户位置已变化但记录尚未落盘”的前置条件，不能依赖机器恰好快于内部 debounce。
- 显式 hash、浏览器原生恢复、加载期用户输入和本机记录的优先级不得因重构倒置。
- 远端关闭记录是用户决定；来源页后续 flush 不得把它撤销。
- 视觉行仅是当前排版下的定位证据，不作为跨版本唯一锚点。

## 证据与失败条件

证据必须记录精确提交、`chromium` project、run ID/attempt、artifact 与 retry／flake 状态。报告中的两个 Page 必须属于同一 BrowserContext；单页内手工 dispatch event 的结果不能作为本 charter 证据。

出现以下任一情况即为失败：

- 新标签页不恢复已保存位置，或显式 hash 被本地记录覆盖；
- 远端关闭记录后，来源页关闭又写回记录；
- 测试依赖内部定时长度或不可解释的固定等待；
- 测试清除其他产品偏好或无关站点存储；
- 把同 BrowserContext 结果描述成跨设备或服务器同步。

## 明确不证明的范围

- 跨浏览器 profile、隐私窗口、浏览器品牌或设备同步：`not-covered`。
- 服务器上传、Cookie 或账号同步：`not-covered`，产品也不提供这些能力。
- WebKit 和 mobile project 的跨标签竞态：`not-covered`。
- BFCache、追加内容跨版本和受限存储的完整浏览器场景：`planned`。
- 多窗口真实用户体验和浏览器存储回收策略：`manual`。
