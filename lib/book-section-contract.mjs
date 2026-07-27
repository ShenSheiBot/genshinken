/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   status: "published" | "forthcoming",
 *   anchor?: string,
 * }} InlineSection
 */

/**
 * @typedef {{ id: string, sections: InlineSection[] }} ChapterWithInlineSections
 */

/**
 * @typedef {{ id: string, title: string, level: number }} RenderedHeading
 */

/**
 * Keep manifest section state and rendered chapter subtitles in lockstep.
 *
 * @param {string} bookSlug
 * @param {ChapterWithInlineSections} chapter
 * @param {RenderedHeading[]} headings
 */
export function validateBookChapterSectionHeadings(bookSlug, chapter, headings) {
  for (const section of chapter.sections) {
    if (section.status !== "published") {
      if (headings.some((candidate) => candidate.title === section.title)) {
        throw new Error(
          `[books] ${bookSlug}: forthcoming section ${section.id} already exists in chapter ${chapter.id}`
        );
      }
      continue;
    }
    const matchingHeadings = headings.filter((candidate) => candidate.id === section.anchor);
    if (matchingHeadings.length !== 1) {
      throw new Error(
        `[books] ${bookSlug}: section ${section.id} must have one heading inside chapter ${chapter.id}`
      );
    }
    const heading = matchingHeadings[0];
    if (heading.level !== 3) {
      throw new Error(
        `[books] ${bookSlug}: section ${section.id} must use an h3 subtitle`
      );
    }
    if (heading.title !== section.title) {
      throw new Error(
        `[books] ${bookSlug}: section ${section.id} title differs from heading #${section.anchor}`
      );
    }
  }
}
