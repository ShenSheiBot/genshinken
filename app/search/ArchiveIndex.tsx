import Link from "next/link";
import { EDITORIAL_SECTION_META } from "@/lib/editorial";
import type { PublicContentEntry } from "@/lib/public-content";
import CreditLinks from "@/app/components/CreditLinks";
import styles from "./archive.module.css";
import ResponsiveFacetDetails from "./ResponsiveFacetDetails";

export type ArchiveFacetOption = {
  key: string;
  label: string;
  count: number;
  active: boolean;
  disabled: boolean;
  href: string;
};

type ArchiveIndexProps = {
  posts: PublicContentEntry[];
  total: number;
  resetHref: string;
  hasFilters: boolean;
  sectionOptions: ArchiveFacetOption[];
  categoryOptions: ArchiveFacetOption[];
  tagOptions: ArchiveFacetOption[];
  contributorOptions: ArchiveFacetOption[];
  roleOptions: ArchiveFacetOption[];
};

function FacetOption({ option }: { option: ArchiveFacetOption }) {
  const content = (
    <>
      <span>{option.label}</span>
      <small>{String(option.count).padStart(2, "0")}</small>
    </>
  );

  if (option.disabled) {
    return (
      <button
        type="button"
        disabled
        className={styles.option}
        data-disabled="true"
        title="当前筛选条件下没有符合的内容"
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      className={styles.option}
      data-active={option.active ? "true" : "false"}
      aria-current={option.active ? "true" : undefined}
      href={option.href}
      scroll={false}
    >
      {content}
    </Link>
  );
}

function FacetGroup({
  number,
  label,
  options,
}: {
  number: string;
  label: string;
  options: ArchiveFacetOption[];
}) {
  const activeCount = options.filter((option) => option.active && option.key !== "all").length;
  return (
    <ResponsiveFacetDetails className={styles.facetGroup} number={number}>
      <summary id={`archive-facet-${number}`}>
        <span className={styles.facetTitle}><i>{number}</i>{label}</span>
        <span className={styles.facetState}>
          {activeCount > 0 ? `已选 ${activeCount}` : `共 ${options.length - 1} 项`}
        </span>
      </summary>
      <div aria-labelledby={`archive-facet-${number}`}>
        {options.map((option) => <FacetOption key={option.key} option={option} />)}
      </div>
    </ResponsiveFacetDetails>
  );
}

function tagsFor(post: PublicContentEntry): string {
  if (post.tags.length === 0) return "无标签";
  const visible = post.tags.slice(0, 2).map((tag) => `#${tag}`).join("　");
  const remaining = post.tags.length - 2;
  return remaining > 0 ? `${visible}　+${remaining}` : visible;
}

export default function ArchiveIndex({
  posts,
  total,
  resetHref,
  hasFilters,
  sectionOptions,
  categoryOptions,
  tagOptions,
  contributorOptions,
  roleOptions,
}: ArchiveIndexProps) {
  const selectedCount = [
    sectionOptions,
    categoryOptions,
    tagOptions,
    contributorOptions,
    roleOptions,
  ].filter(
    (options) => options.some((option) => option.active && option.key !== "all")
  ).length;

  return (
    <main id="main" tabIndex={-1} className={styles.page} data-archive-page="true" data-reveal-zone="archive">
      <header className={styles.hero} data-reveal>
        <div className={styles.heading}>
          <h1>文库</h1>
        </div>
        <div className={styles.count} aria-label={`当前显示 ${posts.length} 项，共 ${total} 项`}>
          <strong>{String(posts.length).padStart(2, "0")}</strong>
          <span>/ {String(total).padStart(2, "0")}</span>
        </div>
      </header>

      <div className={styles.frame}>
        <aside className={styles.filters} aria-label="内容筛选">
          <header>
            <span>已选 {String(selectedCount).padStart(2, "0")} / 05</span>
            {hasFilters ? <Link href={resetHref}>清除全部</Link> : <span>全部内容</span>}
          </header>
          <FacetGroup number="01" label="栏目" options={sectionOptions} />
          <FacetGroup number="02" label="主题分类" options={categoryOptions} />
          <FacetGroup number="03" label="标签" options={tagOptions} />
          <FacetGroup number="04" label="贡献者" options={contributorOptions} />
          <FacetGroup number="05" label="署名位置" options={roleOptions} />
        </aside>

        <section className={styles.results} aria-label="内容索引">
          <div className={styles.columnHead} aria-hidden="true">
            <span>编号 / 日期</span>
            <span>分类 / 标题</span>
            <span>署名 / 标签</span>
          </div>

          {posts.length === 0 ? (
            <div className={styles.empty}>
              <strong>∅</strong>
              <p>当前网址中的筛选条件彼此不兼容。</p>
              <Link href={resetHref}>清除全部筛选</Link>
            </div>
          ) : (
            <ol className={styles.list}>
              {posts.map((post) => {
                const section = EDITORIAL_SECTION_META[post.section];
                return (
                  <li key={post.slug} className={styles.row} data-reveal>
                    <Link
                      className={styles.rowLink}
                      href={post.href}
                      aria-label={`${section.label}：${post.title}`}
                    />
                      <div className={styles.recordId}>
                        <b>{post.no}</b>
                        <time
                          dateTime={post.displayDateISO}
                          title={post.section === "negative" ? "原文写作日期" : "博客发布日期"}
                        >
                          {post.displayDateISO.replaceAll("-", ".")}
                        </time>
                      </div>
                      <div className={styles.recordMain}>
                        <span className={styles.classification}>
                          <b>{section.label}</b>
                          <i>{post.sectionNo}</i>
                          <em>/ {post.category}</em>
                        </span>
                        <h3>{post.title}</h3>
                      </div>
                      <div className={styles.recordMeta}>
                        <CreditLinks
                          className={styles.credit}
                          credits={post.credits}
                          fallbackName={post.author || "未署名"}
                        />
                        <span className={styles.tags}>{tagsFor(post)}</span>
                        <small>{post.section === "multimedia" ? "详情" : `${post.readMin} 分钟阅读`}</small>
                      </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
