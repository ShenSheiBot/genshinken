/* 屋顶现视研 — 站点常量 */

export const site = {
  /** 顶栏 / 页脚显示的品牌全称 */
  brand: "屋顶现视研",
  brandCN: "屋顶现视研",
  /** <title> 默认值 */
  title: "屋顶现视研",
  /** 英雄区副标题 / meta description */
  description:
    "以动画、漫画、游戏及相关视听文化为对象的民间批评与译介共同体。自由的人们聚集起来，以阅读、翻译、评论和讨论，为作品打开新的言论空间。",
  /** 站点正式地址（用于 OpenGraph / sitemap） */
  url: "https://roof-genshinken-a8f3d7c2.hiddengem.workers.dev",
  /** 浏览器标签页标题 */
  tabTitle: "屋顶现视研",
  /** 公开主页；正式上线前只列已经核验的入口。 */
  social: [
    { label: "哔哩哔哩", href: "https://space.bilibili.com/355943807" },
    { label: "知乎", href: "https://www.zhihu.com/column/c_1885047759737971171" },
    { label: "微信", href: "http://weixin.qq.com/r/mp/jBzq8iHEKXxWrWWR90me" },
  ],
  infoEmail: "a1835631041@163.com",
  editorEmail: "a1835631041@163.com",
  /** 全站文章默认许可与转载提示；另有明确许可者从其特别说明。 */
  rightsNotice: {
    zh: "除另有说明外，本站内容采用 CC BY-NC-SA 4.0 许可。欢迎规范转载。如有侵犯您的布尔乔亚法权，请联系并提醒号主立刻践行游士删文跑路伦理。",
    en: "Unless otherwise stated, content on this site is licensed under CC BY-NC-SA 4.0. Reuse in accordance with the license is welcome. If we have infringed your bourgeois rights, please get in touch and remind the editor to put the wandering scholar’s code into immediate practice: delete the post and make a run for it.",
    ja: "特記のない限り、当サイトのコンテンツは CC BY-NC-SA 4.0 で提供します。ライセンスに沿った転載を歓迎します。もし皆さまのブルジョア法権を侵害していたら、ご一報ください。管理人に、ただちに記事を消してずらかる「遊士の倫理」を実践せよ、と釘を刺していただければ幸いです。",
  },
} as const;
