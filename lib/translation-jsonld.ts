import { contributorEntityType } from "./contributors";
import { getPublishedBookChapters } from "./books";
import { licenseUrlFromRights } from "./citations";
import { PRIMARY_CREDIT_ROLES } from "./posts";
import { site } from "./site";
import type { TranslationEdition, TranslationSource } from "./translations";

function sourceAuthors(source: TranslationSource) {
  return source.credits
    .filter((credit) => PRIMARY_CREDIT_ROLES.includes(credit.role))
    .map((credit) => ({
      "@type": contributorEntityType(credit.contributorId) === "organization" ? "Organization" : "Person",
      name: credit.name,
      url: `${site.url}/library?contributor=${encodeURIComponent(credit.contributorId)}`,
    }));
}

export function translationJsonLd(source: TranslationSource, edition: TranslationEdition) {
  const url = `${site.url}${edition.href}`;
  const sourceUrl = `${site.url}${source.href}`;
  const license = licenseUrlFromRights(edition.rights);
  const sourceTranslators = source.credits
    .filter((credit) => credit.role === "translator")
    .map((credit) => ({
      "@type": contributorEntityType(credit.contributorId) === "organization" ? "Organization" : "Person",
      name: credit.name,
      url: `${site.url}/library?contributor=${encodeURIComponent(credit.contributorId)}`,
    }));
  const sourceEditors = source.credits
    .filter((credit) => credit.role === "editor")
    .map((credit) => ({
      "@type": contributorEntityType(credit.contributorId) === "organization" ? "Organization" : "Person",
      name: credit.name,
      url: `${site.url}/library?contributor=${encodeURIComponent(credit.contributorId)}`,
    }));
  const sourceProofreaders = source.credits
    .filter((credit) => credit.role === "proofreader")
    .map((credit) => ({
      "@type": contributorEntityType(credit.contributorId) === "organization" ? "Organization" : "Person",
      name: credit.name,
      url: `${site.url}/library?contributor=${encodeURIComponent(credit.contributorId)}`,
      description: "proofreader",
    }));
  const translators = edition.credits
    .filter((credit) => credit.role === "translator")
    .map((credit) => ({
      "@type": credit.entityType === "organization" ? "Organization" : "Person",
      name: credit.name,
      url: `${site.url}/library?contributor=${encodeURIComponent(credit.contributorId)}`,
      ...(credit.scope ? { description: credit.scope } : {}),
    }));
  const editorialCredits = edition.credits
    .filter((credit) => credit.role !== "translator")
    .map((credit) => ({
      "@type": "PropertyValue",
      name: credit.role,
      value: [credit.name, credit.scope].filter(Boolean).join(" · "),
    }));
  const type = source.ref.type === "book-chapter"
    ? "Chapter"
    : source.format === "interview" ? "Interview" : "Article";
  const authors = sourceAuthors(source);
  const publisherName = edition.locale === "en" ? "Lab on Roof" : "屋頂現視研";
  const sourceRelation = edition.translationMethod === "original"
    ? { sameAs: sourceUrl }
    : {
      translationOfWork: {
        "@type": type,
        "@id": `${sourceUrl}#work`,
        url: sourceUrl,
        name: source.title,
        inLanguage: source.language,
        ...(sourceTranslators.length ? { translator: sourceTranslators } : {}),
        ...(sourceEditors.length ? { editor: sourceEditors } : {}),
        ...(sourceProofreaders.length ? { contributor: sourceProofreaders } : {}),
      },
    };
  const work = {
    "@type": type,
    "@id": `${url}#work`,
    url,
    headline: edition.title,
    description: edition.excerpt,
    inLanguage: edition.locale,
    ...(edition.publishedISO ? { datePublished: edition.publishedISO } : {}),
    ...(edition.updatedISO ? { dateModified: edition.updatedISO } : {}),
    mainEntityOfPage: { "@id": `${url}#webpage` },
    ...sourceRelation,
    ...(authors.length ? { author: authors } : {}),
    ...(translators.length ? { translator: translators } : {}),
    publisher: { "@type": "Organization", name: publisherName, url: site.url },
    additionalProperty: [
      { "@type": "PropertyValue", name: "translationMethod", value: edition.translationMethod },
      { "@type": "PropertyValue", name: "sourceRelationship", value: edition.sourceRelationship },
      { "@type": "PropertyValue", name: "baseLanguage", value: edition.baseLanguage },
      ...editorialCredits,
    ],
    ...(source.book && source.chapter ? {
      isPartOf: {
        "@type": "Book",
        "@id": `${site.url}/${edition.locale}/books/${encodeURIComponent(edition.bookSlug)}#book`,
        name: edition.bookTitle,
        description: edition.bookExcerpt,
      },
      position: getPublishedBookChapters(source.book).findIndex((chapter) => chapter.id === source.chapter?.id) + 1,
    } : {}),
    ...(license ? { license } : {}),
  };
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: edition.title,
        inLanguage: edition.locale,
        mainEntity: { "@id": `${url}#work` },
      },
      work,
    ],
  };
}
