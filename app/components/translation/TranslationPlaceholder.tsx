import Link from "next/link";
import type {
  EditionLanguageLink,
  LanguageDisposition,
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

const externalCopy = {
  en: {
    edition: "Original English edition",
    eyebrow: "Original edition · external",
    title: "Read the original English edition.",
    body: "Rather than reconstructing the original through another-language edition, this page points to the verified publication and its official access routes.",
    original: "Publication details",
    labels: { read: "Read the original", publisher: "View at publisher", purchase: "Buy the book", library: "Find in a library" },
  },
  ja: {
    edition: "日本語原文",
    eyebrow: "原著 · 外部公開",
    title: "日本語原文は正規の公開・刊行先で読めます。",
    body: "別言語版から日本語へ再翻訳せず、確認済みの書誌情報と正規の入手先をご案内します。",
    original: "原版情報",
    labels: { read: "原文を読む", publisher: "出版社で確認する", purchase: "書籍を購入する", library: "図書館で探す" },
  },
} as const;

const notAvailableCopy = {
  en: {
    edition: "English edition",
    eyebrow: "Not offered · EN",
    title: "This work is not offered in English.",
    body: "This publication is a Chinese translation of a Japanese-language work. Under this site's language policy, it is not retranslated into English.",
    original: "Chinese edition",
  },
  ja: {
    edition: "日本語版",
    eyebrow: "提供対象外 · JA",
    title: "この作品の日本語版は提供していません。",
    body: "本稿は英語作品の中国語訳です。当サイトの言語方針により、日本語への再翻訳は行いません。",
    original: "中国語版",
  },
} as const;

export default function TranslationPlaceholder({
  locale,
  source,
  links,
  disposition,
}: {
  locale: TranslationLocale;
  source: TranslationSource;
  links: EditionLanguageLink[];
  disposition?: LanguageDisposition | null;
}) {
  const baseLabels = copy[locale];
  const externalLabels = externalCopy[locale];
  const unavailableLabels = notAvailableCopy[locale];
  const externalOriginal = disposition?.state === "external-original" ? disposition : null;
  const notAvailable = disposition?.state === "not-available";
  const labels = externalOriginal
    ? externalLabels
    : notAvailable
      ? unavailableLabels
      : baseLabels;
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
        <Link href="/" className={styles.brand} aria-label={baseLabels.brand}>
          <i aria-hidden="true" />
          <span>{baseLabels.brand}</span>
        </Link>
        <span className={styles.headerContext}>{labels.edition}</span>
        <LanguageSwitcher current={locale} links={links} />
      </header>
      <section className={styles.placeholder}>
        <div className={styles.placeholderCard} data-kind={disposition?.state ?? "missing"}>
          <p className={styles.placeholderEyebrow}>{labels.eyebrow}</p>
          <h1>{labels.title}</h1>
          <p className={styles.placeholderCopy}>{labels.body}</p>
          <div className={styles.originalCard} lang={externalOriginal ? locale : sourceLanguage}>
            <span>{labels.original}</span>
            <b>{externalOriginal?.title ?? source.title}</b>
            {externalOriginal ? (
              <dl className={styles.originalMetadata}>
                <div><dt>{locale === "ja" ? "著者" : "Author"}</dt><dd>{externalOriginal.creator}</dd></div>
                <div><dt>{locale === "ja" ? "刊行" : "Publication"}</dt><dd>{[externalOriginal.publication, externalOriginal.published].filter(Boolean).join(" · ")}</dd></div>
                {externalOriginal.coverage ? <div><dt>{locale === "ja" ? "該当箇所" : "Coverage"}</dt><dd>{externalOriginal.coverage}</dd></div> : null}
                {externalOriginal.identifier ? <div><dt>{locale === "ja" ? "書誌番号" : "Identifier"}</dt><dd>{externalOriginal.identifier}</dd></div> : null}
              </dl>
            ) : null}
          </div>
          <div className={styles.placeholderActions}>
            {externalOriginal ? externalOriginal.links.map((link) => (
              <a className={styles.primaryAction} href={link.url} key={`${link.kind}:${link.url}`} rel="noreferrer" target="_blank">
                {externalLabels.labels[link.kind]} →
              </a>
            )) : (
              <Link className={styles.primaryAction} href={sourceHref} hrefLang={sourceLanguage}>
                {baseLabels.action} →
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
