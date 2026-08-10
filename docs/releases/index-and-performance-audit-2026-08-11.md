# 索引与性能治理归档 · 2026-08-11

状态：**`shipped`（生产已上线并验证）；索引侧恢复以 GSC 覆盖报告在 +2／+6 周的复查为准**

生产地址：<https://un-canon.blog>

版本锚点：`index-and-performance-audit-2026-08-11`

审计基线：`b5d1558`（2026-08-10 拉取）

上线提交：`b5d1558..01c616c`（六个提交，全部在 `main` 上）

抓取覆盖率基线导出：[`gsc-coverage-2026-08-10/`](./gsc-coverage-2026-08-10/)（Search Console「所有已知网页」，导出日 2026-08-10；四份 CSV 内容与导出逐字一致，仅文件名改为 ASCII kebab-case）

本文归档一次以 Vercel Fluid CPU 持续增长与 Search Console 大面积无法索引为起点的审计与整改。它冻结三件事：问题的**根因判定**、六个提交划定的**修复边界**、以及上线后在生产域名上取得的**验证证据**。它不冻结持续更新的文章内容，不承诺 GSC 报告的恢复时间，也不把仓库外的 Cloudflare／GSC 操作算作本仓库的交付。

## 审计入口的三个症状

| 症状 | 观测 |
| --- | --- |
| Vercel Fluid CPU 持续增长 | 与内容量不成比例 |
| 大量页面无法索引 | 264 页「重复网页，用户未选定规范网页」；51 页「有适当规范标记的备用网页」；57 页已抓取未索引；45 页已发现未索引 |
| 已知网页数暴涨 | 7-10：15 → 7-11：98 → 7-25：1,170 → 8-06：1,480（见 `gsc-coverage-2026-08-10/chart.csv`） |

三者同源交织，不是三个独立故障。

## 根因判定（冻结）

1. **Fluid CPU ＝ `/library` 请求期 SSR × 爬虫枚举 facet**。`/library` 是全站唯一动态路由（`await searchParams`）：每次冷启动把全部 markdown 语料跑完整 unified → KaTeX → sanitize 管线**只为生成摘要**，响应 `private, no-store` 不可缓存；而每篇文章页向爬虫暴露 `section/tag/contributor/role` 链接，非空组合约 4,000–6,000 个。已知网页数在 facet 链接上线（7-23）两天后从 98 涨到 1,170，时间线吻合。
2. **「重复无 canonical」主体 ＝ `cite.bib` × 双主机**。BibTeX 导出是 `application/x-bibtex` 响应，物理上无法携带 `rel=canonical`，却被每页 head 的 `alternates.types` 向爬虫广告；154 个端点 × apex/www 双主机 ≈ 308，与 264 同量级。次因：根 layout 声明 `alternates.canonical: "/"`，被所有忘写 `alternates` 的路由继承（章节页曾整批把规范网址指向首页）。
3. **首屏关键路径三处失血**：`/fonts/` 无 `Cache-Control`（⇒ `max-age=0`，1.37 MB 正文字体每次访问重新验证）；`ReadingEdition` 跨路由 import 首页 CSS，把 72 KB 拖进每篇文章的阻塞路径；`ReadingEditionChrome` 逐块 `getBoundingClientRect` 造成 31 ms 强制回流。
4. **两端对齐的「过撑行」在浏览器而不在文稿**。触发源是 CSS `text-autospace`（Chromium 137+ 默认即 `normal`）：断行会在汉字与 `.latin-run` 交界处提前收行，未首行缩进的段落实测 680 px 只排 23 字，再被两端对齐拉满，字面步进 1.556 em。**已实测：调字距能「修好」当时的两处，却让另外四章冒出同类过撑**——受害段落只随度量漂移换一批，改文稿是错的。
5. **排版门禁的缺口是「规则从未成文」，不是「检查太窄」**。对两轮共 343 处手工标点修复逐类归档：8 类里 7 类从未写进任何文档，第 8 类有文档而零检查；此前没有任何门禁做过段末标点检查。

## 修复边界（六个提交）

| 提交 | 范围 |
| --- | --- |
| `3fd9b46` | `/library` 改为静态壳 + 客户端筛选：`lib/library-filter.ts` 承载纯函数语义，行以 `data-lib-*` 携带筛选凭据，内联预过滤脚本在首绘前隐藏不匹配行，`LibraryClient` 水合后接管并以 `router.replace` 规范化无效 facet；删 `app/search/`，`/search` 改由 `redirects()` 出 308；新增 `verify:library`，`verify:routing` 禁止任何 page 出现 `searchParams`／`next/headers`／`force-dynamic` |
| `b454142` | 索引信号：根 layout 不再下发可继承 canonical（移入 `app/page.tsx` 并重申 RSS alternate）；`cite.bib` 加 `X-Robots-Tag: noindex` 且**不**进 robots Disallow；robots 两个 UA 组加 `Disallow: /library?` 与 `/search`；middleware 的日期 matcher 加数字约束（旧写法等价于「任意 ≥3 段路径」，对每个 `/_next/static` chunk 都触发） |
| `1a81b00` | 关键路径：`/fonts/*` 一年 immutable（`?v=<sha256[0:12]>` 内容寻址保证安全）；layout 预载 STSong 与品牌字体，href 从 `cjk-font-manifest.json` 推导、带 `crossOrigin`；首页卡片样式逐字复制进 `@sync-from` 定界块并加漂移守卫，`CreditLinks` 转全局类，切断 layout 与路由级 CSS Module 的相接；两处循环不变量提出测量循环；删 `TocRail`／`ReadingRail`；`browserslist` 钉到 Safari/iOS 15.6 |
| `b6733eb` | 排版契约成文并门禁化：`docs/delivery-standards.md` §4.1／§4.2 立 `[TYPO-P1..P8]` 与 `[TYPO-L1]`；`validate-content.mjs` 按**段尾字符白名单**（而非坏模式枚举）＋字符类禁令执法；`verify-typography-registry.mjs` 强制「文档有规则必有执法锚点」；40 条存量违规清零（35 处直接修、5 处受保护文稿走 `authorizedChanges`、3 处是规则缺陷）；`.art-body` 显式 `text-autospace: no-autospace` |
| `290b878` | 《往日》校对层 04／05 导入，单元 05.2 发布；CJK 子集重建 5,419 → 5,443 码位；三处门禁从钉死快照改为按状态推导 |
| `01c616c` | WebKit CSP 桥接的导航竞态：`route.fetch`／`fulfill` 只吞竞态签名，其余照抛 |

**不做的事（有意）**：STSong 两阶段分片（等 CrUX 数据再定）；`ALLOWED_TRANSFORMS` 白名单扩容（受保护文稿的清扫仍走逐条授权）；facet 链接不加 `nofollow`（robots 已负责抓取面）。

## 验证证据（上线时）

- `npm run check` 在 `01c616c` 全绿；中间四个提交**除 `verify:fonts` 外**全部门禁通过（字体 manifest 指纹覆盖整棵树，只能在末位重建一次，属结构性限制）。
- `next build`：`/library` 为 `○ (Static)`，全站唯一 `ƒ` 是 middleware；部署元数据的 `lambdaRuntimeStats` 从 `{"nodejs":4}` 降为 `{"nodejs":3}`。
- Playwright（`--workers=1 --retries=1`，chromium／mobile-chromium／mobile-webkit）：68 passed／13 skipped／0 failed；GitHub 上 `verify` 与 `Chromium + WebKit suite` 两个必需 check 均 success。
- `node scripts/verify-editorial-release.mjs https://un-canon.blog`：**passed**（走 Cloudflare 的真实链路）。
- 生产抽查：`cite.bib` → 200 + `x-robots-tag: noindex`；`/fonts/*.woff2?v=` → `public, max-age=31536000, immutable`；`/search?section=essay` → 308 → `/library?section=essay`；`/library?<无效 facet>` → 200 + `x-vercel-cache: PRERENDER`（不再 307、不再 `no-store`）；`/2019/01/01/foo` → 410。
- 阅读版逐行度量：147 条阅读路由 0 处过撑行（`tests/e2e/reader-line-justification.spec.ts` 枚举 sitemap 全语料）。

## 仓库外的配套操作（已完成，非本仓库交付）

- Cloudflare 托管 robots.txt 与 Content Signals 已关闭：线上恢复为单一 `User-agent: *` 组。
- `www.un-canon.blog` 整条线退役：Cloudflare DNS 记录已删，主机不再解析（NXDOMAIN）。截至归档时，Vercel 项目的域名列表里仍挂着 `www.un-canon.blog`（面板显示 Invalid Configuration），需在 Settings → Domains 里 Remove 才算解绑完毕。选择**删除**而非 301 是明确取舍——301 会把 www 的信号并回 apex，删除则是丢弃；而仓库从未对外声明过 www（canonical／sitemap／RSS／JSON-LD 一律 apex，全库 `www.un-canon` 零命中），因此没有信号可合并，重复主机就此消失。

## 后续复查

- GSC：+2 周、+6 周复查覆盖报告。预期已知网页数停涨；facet 变体转「已被 robots.txt 屏蔽」后逐步退出；`cite.bib` 转「被 noindex 标记排除」；www 变体按 DNS 错误掉出。完全恢复约 2–3 个月。
- Vercel：确认 Fluid CPU 曲线走平。
- 若首访 LCP 仍被正文字体主导，再评估 STSong 两阶段分片（核心高频子集 + `unicode-range` 剩余片）。
