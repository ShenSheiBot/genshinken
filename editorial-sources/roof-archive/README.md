# 屋顶现视研文章来源档案

抓取日期：2026-08-12。来源快照用于逐项核对署名、译者、校对、正文、图片和脚注，不作为重新授权声明。最初四篇保存为 HTML。批量迁移稿的完整 JSON 保留在本地爬虫归档及被 Git 忽略的工作副本中，不纳入产品仓库；仓库只提交人工形成的逐篇编辑证据。

| 快照 | 原始页面 | SHA-256 |
| --- | --- | --- |
| `anonymous-phantom.html` | <https://www.bilibili.com/read/cv2127704/> | `cd59ffcbfe4b492b90c6aa6079b9701c97f581458a88818b1b9a97b230e3510a` |
| `imagination-animal.html` | <https://www.sohu.com/a/739904900_121124792> | `825a35a4ffa48e4fd577680e251daa489983b9c471ad4adef19895e7f2871667` |
| `rethink-everyday.html` | <https://bgm.tv/group/topic/455462> | `ddafa85f3f9aa43a68c948ead5d3ccf1625627f24e3f146ecd34dafdacac2928` |
| `zero-years-ch13.html` | <https://www.bilibili.com/read/cv15016216/> | `fedb534187673a4325014996183b5a9c644f0a75d2ebaae2258c71a52cb2fdee` |

对应发布稿位于 `source/_posts/`。其中《想象界与动物的通道》的 39 处正文注号已逐一转换为 39 条 GFM 脚注；《昭和怀旧与雷普幻想》保留原页标明的 CC BY-NC-SA 4.0 条件。

逐篇清洗的来源判断、日期、署名、结构、图片与删除项另见同目录 `cv*-editorial-note.md` 或 `cv*-evidence.md`；这些说明是可提交、可审计的编辑产出，不替代本地不可变原页面快照，也不应抄入公开文章正文。

运行 `npm run audit:roof-archive` 可对照全部 376 份本地原始稿，报告本地逐字节 JSON 工作副本、专篇证据及公开正文引用的覆盖情况；需要列出全部缺口时追加 `-- --details`。该报告只发现缺口，不替代逐篇人工审校，也不把没有独立公开页的重复稿或被修订版本误判成漏发。
