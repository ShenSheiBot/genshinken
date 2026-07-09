/* ============================================================
   西方負典 / UN-CANON — 站点常量
   ============================================================ */

export const site = {
  /** 顶栏 / 页脚显示的品牌全称 */
  brand: "西方負典 / UN-CANON",
  brandCN: "西方負典",
  brandEN: "UN-CANON",
  /** <title> 默认值 */
  title: "西方負典 / UN-CANON",
  /** 英雄区副标题 / meta description */
  description:
    "「西方負典」是一档关注历史、产业和文化的人文博客，希望为汉语读者提供基于观察视角的话题和内容。",
  /** 站点正式地址（用于 OpenGraph / sitemap） */
  url: "https://un-canon.blog",
  /** 英雄区主标题（出自《庄子·齐物论》） */
  heroTitleA: "東流不溢",
  heroTitleB: "孰知其故",
  /** 水印字 */
  ghost: "un-canon",
  license: "CC0 1.0",
  /** 浏览器标签页标题 */
  tabTitle: "西方負典的博客",
  /** 页脚「关注」链接（沿用 un-canon.com，博客把「博客」换成「主页」） */
  social: [
    { label: "主页", href: "https://un-canon.com/" },
    { label: "哔哩哔哩", href: "https://space.bilibili.com/323302694" },
    { label: "知乎", href: "https://www.zhihu.com/people/tHEREwILLbEbLOOD" },
    { label: "YOUTUBE", href: "https://www.youtube.com/channel/UCF7IkcI5JK-mxFttzwh0qbQ" },
    { label: "GITHUB", href: "https://github.com/un-canon" },
  ],
  email: "info@un-canon.com",
} as const;
