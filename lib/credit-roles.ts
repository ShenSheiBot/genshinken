/* ============================================================
   署名角色元数据 — 独立于内容层，供服务端与客户端共用。
   lib/posts.ts 在构建期消费；文库的客户端筛选也需要角色顺序
   与标记，因此不能落在依赖 node:fs 的模块里。
   ============================================================ */

export type CreditRole =
  | "author"
  | "interviewee"
  | "interviewer"
  | "participant"
  | "speaker"
  | "translator"
  | "proofreader"
  | "editor";

// 署名角色 → 方块标记。作者实心，其余空心。可在 front-matter 用任一历史 key 填写。
export const CREDIT_ROLE_META: Record<
  CreditRole,
  { label: string; mark: string; solid: boolean }
> = {
  author: { label: "作者", mark: "作", solid: true },
  interviewee: { label: "受访", mark: "访", solid: true },
  interviewer: { label: "采访", mark: "采", solid: false },
  participant: { label: "与谈", mark: "谈", solid: true },
  speaker: { label: "主讲", mark: "讲", solid: true },
  translator: { label: "译者", mark: "译", solid: false },
  proofreader: { label: "校对", mark: "校", solid: false },
  editor: { label: "编辑", mark: "编", solid: false },
};

export const CREDIT_ROLES = Object.keys(CREDIT_ROLE_META) as CreditRole[];

/** Roles that identify the principal public voice of an article or programme. */
export const PRIMARY_CREDIT_ROLES: readonly CreditRole[] = [
  "author",
  "interviewee",
  "participant",
  "speaker",
];
