export interface SectionNumberRecord {
  section: string;
  sectionNo: string;
  timestamp: number;
  slug: string;
  originalDate: string;
}

export interface PostNumberRecord extends SectionNumberRecord {
  no: string;
}

/** Keep archive indexes in their visible, site-wide identifier order. */
export function comparePostNumbersDescending<
  T extends Pick<PostNumberRecord, "no" | "slug">,
>(a: T, b: T): number {
  const aNumber = Number(a.no);
  const bNumber = Number(b.no);

  if (Number.isFinite(aNumber) && Number.isFinite(bNumber) && aNumber !== bNumber) {
    return bNumber - aNumber;
  }

  return a.slug.localeCompare(b.slug);
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

/**
 * Assign the stable site-wide sequence, then give archival `negative` posts
 * their own visibly distinct negative identifiers (`-01`, `-02`, ...).
 * Regular posts retain the existing global sequence so published identifiers
 * do not shift when archival manuscripts are added.
 */
export function assignPostNumbers<T extends PostNumberRecord>(posts: T[]): void {
  posts.forEach((post, index) => {
    post.no = String(posts.length - index);
  });

  assignSectionNumbers(posts);

  for (const post of posts) {
    if (post.section === "negative") post.no = `-${post.sectionNo}`;
  }
}
