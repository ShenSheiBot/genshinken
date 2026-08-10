/* ============================================================
   署名角色元数据 — 独立于内容层，供服务端与客户端共用。
   lib/posts.ts 在构建期消费；文库的客户端筛选也需要角色顺序
   与标记，因此不能落在依赖 node:fs 的模块里。
   ============================================================ */

export type CreditRole = "author" | "translator" | "proofreader";

// 署名角色 → 方块标记。作者实心，其余空心。可在 front-matter 用任一历史 key 填写。
export const CREDIT_ROLE_META: Record<
  CreditRole,
  { label: string; mark: string; solid: boolean }
> = {
  author: { label: "作者", mark: "作", solid: true },
  translator: { label: "译者", mark: "译", solid: false },
  proofreader: { label: "校对", mark: "校", solid: false },
};

export const CREDIT_ROLES = Object.keys(CREDIT_ROLE_META) as CreditRole[];
