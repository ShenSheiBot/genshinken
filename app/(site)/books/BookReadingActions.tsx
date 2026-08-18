import Link from "next/link";
import styles from "./books.module.css";

interface BookReadingActionsProps {
  startHref: string;
  latestHref: string;
  latestTitle: string;
}

export default function BookReadingActions({
  startHref,
  latestHref,
  latestTitle,
}: BookReadingActionsProps) {
  return (
    <nav className={styles.readingActions} aria-label="阅读入口">
      <Link href={startHref} className={styles.readingAction}>
        <span>首章</span>
        <strong>从第一章阅读</strong>
        <b aria-hidden="true">→</b>
      </Link>
      <Link href={latestHref} className={styles.readingAction}>
        <span>最新章节</span>
        <strong>阅读最新章节</strong>
        <small>{latestTitle}</small>
        <b aria-hidden="true">→</b>
      </Link>
    </nav>
  );
}
