export const EDITORIAL_SECTIONS = [
  "essay",
  "review",
  "translation",
  "interview",
  "community",
  "multimedia",
  "negative",
] as const;

export type EditorialSection = (typeof EDITORIAL_SECTIONS)[number];

/** Reader-facing sections. `multimedia` and `negative` remain parseable only for legacy URLs. */
export const READER_EDITORIAL_SECTIONS = [
  "essay",
  "review",
  "translation",
  "interview",
  "community",
] as const satisfies readonly EditorialSection[];

export type ReaderEditorialSection = (typeof READER_EDITORIAL_SECTIONS)[number];

/**
 * Pick one item from every reader-facing section, then fill the remaining
 * slots from the shared pool. Omitting `random` produces a stable SSG/no-JS
 * fallback; passing a random source produces a fresh browser recommendation.
 */
export function selectHomeRecommendations<
  T extends { section: ReaderEditorialSection },
>(
  items: readonly T[],
  limit = 10,
  random?: () => number
): T[] {
  if (limit <= 0) return [];

  const remaining = [...items];
  const selected: T[] = [];

  const drawIndex = (length: number): number => {
    if (!random || length <= 1) return 0;
    const value = random();
    const bounded = Number.isFinite(value)
      ? Math.min(Math.max(value, 0), 1 - Number.EPSILON)
      : 0;
    return Math.floor(bounded * length);
  };

  for (const section of READER_EDITORIAL_SECTIONS) {
    if (selected.length >= limit) break;
    const candidates = remaining
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.section === section);
    if (candidates.length === 0) continue;

    const candidate = candidates[drawIndex(candidates.length)];
    const { item, index } = candidate;
    selected.push(item);
    remaining.splice(index, 1);
  }

  if (random) {
    for (let index = remaining.length - 1; index > 0; index -= 1) {
      const swapIndex = drawIndex(index + 1);
      [remaining[index], remaining[swapIndex]] = [remaining[swapIndex], remaining[index]];
    }
  }

  return selected.concat(remaining.slice(0, Math.max(0, limit - selected.length)));
}

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
  interview: {
    label: "访",
    number: "04",
  },
  community: {
    label: "社",
    number: "05",
  },
  multimedia: {
    label: "多媒体",
    number: "05",
  },
  negative: {
    label: "负",
    number: "06",
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
  interview: "interview",
  dialogue: "interview",
  访: "interview",
  访谈: "interview",
  community: "community",
  社: "community",
  multimedia: "multimedia",
  media: "multimedia",
  多媒体: "multimedia",
  negative: "negative",
  负: "negative",
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
