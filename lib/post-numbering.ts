export interface SectionNumberRecord {
  section: string;
  sectionNo: string;
  timestamp: number;
  slug: string;
  originalDate: string;
}

/**
 * Regular sections follow blog publication order. The archival `negative`
 * section instead follows the manuscripts' original writing dates.
 */
export function assignSectionNumbers<T extends SectionNumberRecord>(posts: T[]): void {
  const sectionGroups = new Map<string, T[]>();
  for (const post of posts) {
    const group = sectionGroups.get(post.section) ?? [];
    group.push(post);
    sectionGroups.set(post.section, group);
  }

  for (const [section, group] of sectionGroups) {
    if (section === "negative") {
      [...group]
        .sort(
          (a, b) =>
            a.originalDate.localeCompare(b.originalDate) ||
            a.timestamp - b.timestamp ||
            a.slug.localeCompare(b.slug)
        )
        .forEach((post, index) => {
          post.sectionNo = String(index + 1).padStart(2, "0");
        });
      continue;
    }

    group.forEach((post, index) => {
      post.sectionNo = String(group.length - index).padStart(2, "0");
    });
  }
}
