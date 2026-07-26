import Link from "next/link";
import type { ReactNode } from "react";
import type { Credit } from "@/lib/posts";
import styles from "./CreditLinks.module.css";

type CreditLinksProps = {
  credits: readonly Credit[];
  className?: string;
  itemClassName?: string;
  markClassName?: string;
  nameClassName?: string;
  showMarks?: boolean;
  limit?: number;
  separator?: ReactNode;
  fallbackName?: string;
};

function classes(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

function displayName(value: string) {
  return value.split(/([·・])/u).map((part, index) =>
    part === "·" || part === "・" ? (
      <span className="cjk-interpunct" key={`${part}-${index}`}>{part}</span>
    ) : part
  );
}

/**
 * A byline whose role mark remains inert text and whose contributor name is
 * the only linked surface. Contributor links intentionally omit `role`: the
 * library first shows every credited position for that person.
 */
export default function CreditLinks({
  credits,
  className,
  itemClassName,
  markClassName,
  nameClassName,
  showMarks = true,
  limit,
  separator,
  fallbackName = "未署名",
}: CreditLinksProps) {
  const visible = typeof limit === "number" ? credits.slice(0, limit) : credits;

  if (visible.length === 0) {
    return <span className={classes(styles.links, className)}><span className={styles.fallback}>{fallbackName}</span></span>;
  }

  return (
    <span className={classes(styles.links, className)}>
      {visible.map((credit, index) => (
        <span key={`${credit.role}-${credit.contributorId}`}>
          {index > 0 && separator != null && (
            <span className={styles.separator} aria-hidden="true">{separator}</span>
          )}
          <span className={classes("credit", styles.item, itemClassName)} data-credit-role={credit.role}>
            {showMarks && (
              <span
                className={classes(
                  "cmark",
                  credit.solid ? "solid" : "hollow",
                  styles.mark,
                  markClassName
                )}
                role="img"
                aria-label={
                  credit.role === "author"
                    ? "作者"
                    : credit.role === "translator" ? "译者" : "校对"
                }
              >
                {credit.mark}
              </span>
            )}
            <Link
              className={classes(styles.name, nameClassName)}
              href={`/library?contributor=${encodeURIComponent(credit.contributorId)}`}
            >
              {displayName(credit.name)}
            </Link>
          </span>
        </span>
      ))}
    </span>
  );
}
