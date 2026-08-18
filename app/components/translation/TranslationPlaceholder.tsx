import Link from "next/link";
import type {
  EditionLanguageLink,
  TranslationLocale,
  TranslationSource,
} from "@/lib/translations";
import LanguageSwitcher from "./LanguageSwitcher";
import styles from "./translation-edition.module.css";

const copy = {
  en: {
    brand: "Lab on Roof",
    edition: "English edition",
    eyebrow: "Edition unavailable · EN",
    title: "This work is still available in its original language.",
    body: "An English edition has not been published. The complete Chinese text—including its notes, figures, and credits—remains available in the archive.",
    original: "Original Chinese title",
    action: "Read the Chinese edition",
  },
  ja: {
    brand: "屋頂現視研",
    edition: "日本語版",
    eyebrow: "未公開の言語版 · JA",
    title: "この作品は、原文で引き続きお読みいただけます。",
    body: "日本語版は公開されていません。注釈・図版・クレジットを含む中国語の全文は、アーカイブで閲覧できます。",
    original: "中国語原題",
    action: "中国語版を読む",
  },
} as const;

export default function TranslationPlaceholder({
  locale,
  source,
  links,
}: {
  locale: TranslationLocale;
  source: TranslationSource;
  links: EditionLanguageLink[];
}) {
  const labels = copy[locale];
  const sourceHref = source.href;
  const sourceLanguage = source.language;

  return (
    <main
      id="main"
      tabIndex={-1}
      className={`translation-edition-page ${styles.page}`}
      lang={locale}
      data-reveal-zone="translation"
    >
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label={labels.brand}>
          <i aria-hidden="true" />
          <span>{labels.brand}</span>
        </Link>
        <span className={styles.headerContext}>{labels.edition}</span>
        <LanguageSwitcher current={locale} links={links} />
      </header>
      <section className={styles.placeholder}>
        <div className={styles.placeholderCard}>
          <p className={styles.placeholderEyebrow}>{labels.eyebrow}</p>
          <h1>{labels.title}</h1>
          <p className={styles.placeholderCopy}>{labels.body}</p>
          <div className={styles.originalCard} lang={sourceLanguage}>
            <span>{labels.original}</span>
            <b>{source.title}</b>
          </div>
          <div className={styles.placeholderActions}>
            <Link className={styles.primaryAction} href={sourceHref} hrefLang={sourceLanguage}>
              {labels.action} →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
