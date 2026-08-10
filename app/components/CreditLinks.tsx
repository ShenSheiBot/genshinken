import Link from "next/link";
import type { ReactNode } from "react";
import type { Credit } from "@/lib/posts";

// 样式在 globals.css 的 .credit-links-* 全局类（勿改回 CSS Module：本组件被
// layout 的 TopBar 与多个路由共用，模块化会重新成为 CSS 分块合并的枢纽）。
const styles = {
  links: "credit-links",
  item: "credit-links-item",
  mark: "credit-links-mark",
  name: "credit-links-name",
  separator: "credit-links-separator",
  fallback: "credit-links-fallback",
} as const;

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
