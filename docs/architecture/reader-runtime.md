# 正文阅读运行时

状态：现行架构

本文是正文阅读运行时的可执行维护说明。页面应呈现什么、交互应达到什么效果，以 [`frontend-product-spec.md`](../frontend-product-spec.md) 为产品权威；阅读记录与繁简转换的决策背景分别保留在 [ADR-BLOG-001](https://wiki.un-canon.com/doc/adr-blog-001-B6AJHj2wg5) 和 [ADR-BLOG-002](https://wiki.un-canon.com/doc/adr-blog-002-IXwWU8aJWR)。维护、测试和发布不得依赖登录 Outline 才能完成。

## 1. 公开入口与所有权

正式正文只有一套运行时：

```text
app/posts/[slug]/page.tsx
  → ReadingDossier
  → ReadingEditionChrome
  → useReadingProgress / useHanScriptConversion / useTheme
```

- `/posts/<slug>` 是文章与书籍连续正文的 canonical 页面。
- `/books/<slug>/chapters/<chapter>` 是稳定章节入口，重定向到连续正文中的显式标题 hash。
- `app/prototype/` 不属于生产运行时，也不应重新成为正文实现或路由入口。

| 文件 | 职责 |
| --- | --- |
| `app/posts/[slug]/page.tsx` | 读取文章、专题归属和引用数据，输出 JSON-LD，并装配正式正文。 |
| `app/components/reading-edition/ReadingEdition.tsx` | 拆分正文、注释和文献；渲染封面、正文网格、附录和相关推荐。 |
| `app/components/reading-edition/ReadingEditionChrome.tsx` | 客户端页眉、目录／图录、视觉行、注释／文献面板、阅读设置和离场动效。 |
| `app/components/reading-edition/reading-edition.module.css` | 正式正文在桌面、平板、移动端和打印环境中的版式。 |
| `app/components/reading-edition/reading-progress.ts` | 阅读记录的数据结构、存储键、校验和纯函数。 |
| `app/components/reading-edition/useReadingProgress.ts` | 保存、恢复、跨标签页同步和文章更新边界。 |
| `app/components/useHanScriptConversion.ts` | 全页繁简偏好、OpenCC 转换和跨标签页同步。 |
| `app/components/useTheme.ts` | 明暗主题偏好和跨标签页同步。 |

## 2. DOM 运行时契约

以下类名是组件间的内部协议，改名必须原子更新生产者、查询方和验证脚本：

- `.reading-edition-page`：正式正文根节点，也是全局进入／退出动效的作用域。
- `.reading-edition-body`：Markdown 正文和视觉行测量根节点。
- `.reading-edition-flow`：正文、结束标记和附录的共同容器；阅读完成状态依赖它定位“正文完”。
- `.reading-edition-appendix`：原始注释／文献 DOM；客户端从这里生成桌面侧栏和移动弹层。
- `#reading-left-rail`：桌面署名、行数、目录和图录的 portal 宿主。
- `#reading-right-rail`：桌面注释／文献的 portal 宿主；无引用的文章不渲染它。

这些选择器不是供内容作者使用的公开 API。自动化测试应优先使用标题、角色、ARIA 名称、稳定 URL 和内容计数；只有确实需要验证组件协作时才直接依赖内部类名。

## 3. 响应式职责

- 桌面宽度（`min-width: 1024px`）使用正文中轴和受正文区边界约束的左右黏性栏。有图片时，左栏目录可切换为图录。
- 平板与窄桌面隐藏 portal 栏，目录、设置和引用改用抽屉／面板。
- 移动端页眉保留首页品牌图标、文章目录、繁简与阅读习惯入口；注释和文献共用一个焦点受控的底部 dialog。
- 原始文末注释／文献继续留在 HTML 中，保证无脚本、打印、链接目标和发布回归仍有完整内容。

桌面侧栏和移动弹层只是同一份引用数据的两个表面，不得分别维护第二套内容或编号。

## 4. 本机状态边界

所有偏好只写入当前浏览器的 `localStorage`，不上传、不跨设备同步；存储受限时页面仍应可阅读。

| 键 | 所有者 | 值与作用 |
| --- | --- | --- |
| `ub_theme` | `useTheme` | `light` / `dark`；全站主题。 |
| `ub_reader_font` | `ReadingEditionChrome` | `serif` / `sans`；正文与标题字族。 |
| `ub_reader_size` | `ReadingEditionChrome` | `small` / `medium` / `large`；正文尺度。 |
| `ub_chinese_script` | `useHanScriptConversion` | `hans` / `hant`；用户请求的文字系统。 |
| `ub_reading:enabled` | reading progress | 是否保存本机阅读记录；默认开启。 |
| `ub_reading:v1:post:<encoded-slug>` | reading progress | 每篇文章的版本化语义位置、完成状态和保存时间。 |

主题、繁简和阅读记录监听 `storage` 事件。远端标签页写入较新阅读记录后，本页必须丢弃更旧的待写状态，不能在失焦或卸载时把旧记录写回去。

## 5. 位置恢复优先级

恢复顺序是产品契约，不应因重构而倒置：

1. 显式 URL hash，例如章节入口和 `#reading-cover`。
2. 浏览器原生 reload、前进／后退和 BFCache 位置。
3. 页面已经具有的非零滚动位置，或加载期间发生的用户输入。
4. 本机保存的语义阅读位置。

自动恢复只在首次视觉行测量完成后执行。字体、图片和布局随后发生变化时会触发重测，并可在校正窗口内调整位置。恢复期间不立即写回记录，以免用页面顶部覆盖旧位置；用户开始滚动、触摸、点击或使用导航键后才允许常规保存。

## 6. `contentRevision` 与跨版本恢复

阅读记录不只保存像素或总行数。它包含正文 block 指纹、相邻 block、标题、block 内行进度、章节进度、全文进度、结束指纹和完成状态。

- 相同 `contentRevision` 优先精确恢复。
- 文章只在文末追加内容时，已读完的旧记录恢复到旧结束位置，并插入“以下为更新内容”边界。
- block 发生移动或轻微修改时，依次尝试精确指纹、相邻 block、同标题章节和全文比例。
- 只能比例恢复时显示“文章已更新，已恢复到上次位置附近”。
- 图片和字体在恢复后继续改变行盒时，15 秒校正窗口内可以重算位置；用户一旦主动操作即停止自动校正。

`contentRevision` 不是 front matter 字段，也不由作者手工维护；`lib/posts.ts` 根据渲染后的正文 HTML 自动计算它。正文渲染结果变化时 revision 自动变化，纯元数据修改不会无意义地使阅读记录失效。

## 7. 主题、繁简与字体

- `data-reader-font`、`data-reader-size` 和主题属性写在 `html` 上，由 CSS 变量统一驱动正文与引用表面。
- 繁简转换以文章声明的源文字系统为输入；媒体 URL、指纹和明确标记的 `ignore-opencc` 内容不参与转换。
- 罕见字包装必须在繁简往返后保持稳定。衬线／无衬线分别使用站内托管的 rare Han fallback，不能因为系统字体差异改变行高。
- 视觉行测量必须在字体、图片、字号、字族或繁简内容变化后重算。

## 8. 验证与已知边界

提交前至少运行：

```bash
npm run verify:reading-progress
npm run verify:han-script
npm run verify:fonts
npm run typecheck
npm run lint
```

完整门禁使用 `npm run check`，生产 HTML 和路由使用构建后的 `npm run verify:release -- <base-url>`。后者是 SSR／HTTP 回归，不执行客户端 JavaScript。

仓库当前状态为 `implemented` 的 Playwright 资产包括 Desktop Chromium Reader smoke、移动 Chromium／WebKit、跨标签页、dialog 焦点与 BibTeX 剪贴板 specs。各 spec 只承担已写入的具体断言；`implemented` 不表示任一分支最近一次执行成功，也不能替代真实字体行盒、动效终态、实体 Safari 或辅助技术体验。精确矩阵、CSP bridge、证据政策以及 `planned / manual / not-covered` 范围统一见 [`testing.md`](../testing.md)。

## 9. 原型清理与回滚

清理以 `d5f831c82de267ab0cd22f297c218fd9bd15cb66` 为比较基线：

- `f1b933e` 只把生产 Reader 提升到 `app/components/reading-edition/`。
- `804f36e` 删除不可达的 Folio、preview 模式、原型链接、切换器和死样式，并重建字体语料闭包。

两次提交均保持公开路由和产品行为不变。若上线后发现清理回归，优先对具体问题做前向修复；需要完整撤回时，在新分支按相反顺序 `git revert 804f36e`、`git revert f1b933e`，重新运行全门禁并走正常部署，不使用改写共享历史的回退方式。
