export const EDITORIAL_SECTIONS = [
  "essay",
  "review",
  "translation",
  "multimedia",
] as const;

export type EditorialSection = (typeof EDITORIAL_SECTIONS)[number];

export const EDITORIAL_SECTION_META: Record<
  EditorialSection,
  { label: string; number: string }
> = {
  essay: { label: "论", number: "01" },
  review: { label: "评", number: "02" },
  translation: {
    label: "译",
    number: "03",
  },
  multimedia: {
    label: "多媒体",
    number: "04",
  },
};

const SECTION_ALIASES: Record<string, EditorialSection> = {
  essay: "essay",
  论: "essay",
  review: "review",
  评: "review",
  translation: "translation",
  interpretation: "translation",
  译: "translation",
  // 兼容已经发布的旧 front matter；面向读者的栏目名称统一显示为“译”。
  译介: "translation",
  multimedia: "multimedia",
  media: "multimedia",
  多媒体: "multimedia",
};

export function editorialSectionFrom(value: unknown): EditorialSection | null {
  if (typeof value !== "string") return null;
  return SECTION_ALIASES[value.trim().toLowerCase()] ?? null;
}

export function isEditorialSection(value: string): value is EditorialSection {
  return EDITORIAL_SECTIONS.includes(value as EditorialSection);
}

export function postPath(post: { slug: string; section: EditorialSection }): string {
  const base = post.section === "multimedia" ? "/media" : "/posts";
  return `${base}/${encodeURIComponent(post.slug)}`;
}
