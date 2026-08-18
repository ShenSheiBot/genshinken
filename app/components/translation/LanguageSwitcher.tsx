import Link from "next/link";
import type { EditionLanguageLink } from "@/lib/translations";
import styles from "./translation-edition.module.css";

type CurrentLanguage = EditionLanguageLink["language"];

const labels = {
  "zh-Hans": "选择文章语言",
  "zh-Hant": "選擇文章語言",
  en: "Choose edition language",
  ja: "言語版を選択",
} as const;

const stateLabels = {
  "zh-Hans": { available: "已有译文", preview: "译文预览", missing: "暂无译文" },
  "zh-Hant": { available: "已有譯文", preview: "譯文預覽", missing: "暫無譯文" },
  en: { available: "available", preview: "preview", missing: "not available" },
  ja: { available: "公開版あり", preview: "プレビュー", missing: "未公開" },
} as const;

export default function LanguageSwitcher({
  current,
  links,
}: {
  current: CurrentLanguage;
  links: EditionLanguageLink[];
}) {
  return (
    <nav className={styles.languageSwitcher} aria-label={labels[current]}>
      {links.map((link) => {
        const isCurrent = link.language === current;
        return (
          <Link
            href={link.href}
            key={link.language}
            hrefLang={link.language}
            lang={link.language}
            aria-current={isCurrent ? "page" : undefined}
            aria-label={`${link.label}: ${stateLabels[current][link.state]}`}
            data-state={link.state}
          >
            <span>{link.label}</span>
            <i aria-hidden="true" />
          </Link>
        );
      })}
    </nav>
  );
}
