import { getAllPublicContent } from "./public-content";

export type SearchTag = { name: string; count: number };

export async function getSearchTags(locale = "zh-CN"): Promise<SearchTag[]> {
  const counts = new Map<string, number>();
  for (const entry of await getAllPublicContent()) {
    for (const tag of new Set(entry.tags)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, locale));
}
