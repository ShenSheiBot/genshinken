"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TranslationLocale } from "@/lib/translations";
import { scrollElementToReadingAnchor } from "@/app/components/reading-edition/reading-progress";
import styles from "./translation-edition.module.css";
import { translationReferenceUi } from "./translationUi";

type ReferenceKind = "notes" | "sources";

type ReferenceItem = {
  id: string;
  label: string;
  html: string;
};

function targetFromAnchor(anchor: HTMLAnchorElement): HTMLElement | null {
  const href = anchor.getAttribute("href");
  if (!href?.startsWith("#")) return null;
  try {
    return document.getElementById(decodeURIComponent(href.slice(1)));
  } catch {
    return null;
  }
}

function referenceItems(section: HTMLElement | null, labels: Map<string, string>): ReferenceItem[] {
  const list = section?.querySelector(":scope > ol");
  if (!list) return [];
  return Array.from(list.children).flatMap((child, index) => {
    if (!(child instanceof HTMLElement) || child.tagName !== "LI") return [];
    if (!child.id) child.id = `translation-reference-${index + 1}`;
    const clone = child.cloneNode(true) as HTMLElement;
    clone.removeAttribute("id");
    clone.querySelectorAll<HTMLElement>("[id]").forEach((node) => node.removeAttribute("id"));
    clone
      .querySelectorAll("a[data-footnote-backref], a.source-backref, a[href^='#user-content-fnref'], a[href^='#source-ref-']")
      .forEach((node) => node.remove());
    return [{
      id: child.id,
      label: labels.get(child.id) || child.dataset.referenceLabel || String(index + 1),
      html: clone.innerHTML,
    }];
  });
}

function focusableElements(scope: HTMLElement): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>(
    "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
  )).filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
}

function scrollToReadingLine(target: HTMLElement): void {
  target.focus({ preventScroll: true });
  scrollElementToReadingAnchor(target);
}

export default function TranslationReferences({
  locale,
  contentRevision,
}: {
  locale: TranslationLocale;
  contentRevision: string;
}) {
  const labels = translationReferenceUi[locale];
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const lastTriggerRef = useRef<HTMLAnchorElement | null>(null);
  const originAfterCloseRef = useRef<HTMLAnchorElement | null>(null);
  const pointerScrollRef = useRef<number | null>(null);
  const sheetScrollRef = useRef<number | null>(null);
  const narrowRef = useRef(false);
  const [portalReady, setPortalReady] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [kind, setKind] = useState<ReferenceKind>("notes");
  const [items, setItems] = useState<Record<ReferenceKind, ReferenceItem[]>>({ notes: [], sources: [] });
  const [active, setActive] = useState<Record<ReferenceKind, string>>({ notes: "", sources: "" });

  const selectReference = useCallback((nextKind: ReferenceKind, id: string, updateHash = true) => {
    setKind(nextKind);
    setActive((current) => ({ ...current, [nextKind]: id }));
    if (updateHash) {
      history.replaceState(
        history.state,
        "",
        `${window.location.pathname}${window.location.search}#${encodeURIComponent(id)}`
      );
    }
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const update = () => {
      narrowRef.current = query.matches;
      setNarrow(query.matches);
      if (!query.matches) setSheetOpen(false);
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setPortalReady(true);
    const host = hostRef.current;
    const root = host?.closest<HTMLElement>(".translation-edition-page");
    const appendix = root?.querySelector<HTMLElement>("[data-translation-appendices]");
    if (!root || !appendix) return;

    const markerLabels = new Map<string, string>();
    root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
      const target = targetFromAnchor(anchor);
      if (!target || !appendix.contains(target) || markerLabels.has(target.id)) return;
      markerLabels.set(target.id, (anchor.textContent || "").trim());
    });

    const nextItems = {
      notes: referenceItems(appendix.querySelector<HTMLElement>(".footnotes"), markerLabels),
      sources: referenceItems(appendix.querySelector<HTMLElement>(".source-notes"), markerLabels),
    };
    setItems(nextItems);
    setActive((current) => ({
      notes: nextItems.notes.some((item) => item.id === current.notes) ? current.notes : nextItems.notes[0]?.id ?? "",
      sources: nextItems.sources.some((item) => item.id === current.sources) ? current.sources : nextItems.sources[0]?.id ?? "",
    }));
    if (nextItems.notes.length === 0 && nextItems.sources.length > 0) setKind("sources");

    const rememberReadingPosition = (event: PointerEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      const target = anchor ? targetFromAnchor(anchor) : null;
      if (anchor && target && appendix.contains(target)) pointerScrollRef.current = window.scrollY;
    };

    const activate = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor) return;
      const inPage = root.contains(anchor);
      const inReferenceSurface = Boolean(anchor.closest("[data-translation-reference-surface]"));
      if (!inPage && !inReferenceSurface) return;
      const target = targetFromAnchor(anchor);
      if (!target) return;
      if (appendix.contains(anchor) && !appendix.contains(target)) {
        event.preventDefault();
        history.replaceState(
          history.state,
          "",
          `${window.location.pathname}${window.location.search}#${encodeURIComponent(target.id)}`
        );
        scrollToReadingLine(target);
        return;
      }
      if (!appendix.contains(target)) return;
      const section = target.closest<HTMLElement>(".source-notes, .footnotes");
      if (!section) return;
      const nextKind: ReferenceKind = section.classList.contains("source-notes") ? "sources" : "notes";
      const targetItem = target.closest<HTMLElement>("li") ?? section.querySelector<HTMLElement>(":scope > ol > li");
      if (!targetItem?.id) return;

      event.preventDefault();
      lastTriggerRef.current = inPage ? anchor : lastTriggerRef.current;
      selectReference(nextKind, targetItem.id);
      if (narrowRef.current) {
        const readingPosition = pointerScrollRef.current ?? window.scrollY;
        pointerScrollRef.current = null;
        sheetScrollRef.current = readingPosition;
        window.scrollTo({ top: readingPosition, behavior: "auto" });
        setSheetOpen(true);
      }
    };
    document.addEventListener("pointerdown", rememberReadingPosition, true);
    document.addEventListener("click", activate);

    const hash = decodeURIComponent(window.location.hash.slice(1));
    const hashTarget = hash ? document.getElementById(hash) : null;
    if (hashTarget && appendix.contains(hashTarget)) {
      const section = hashTarget.closest<HTMLElement>(".source-notes, .footnotes");
      const hashKind: ReferenceKind = section?.classList.contains("source-notes") ? "sources" : "notes";
      const targetItem = hashTarget.closest<HTMLElement>("li") ?? section?.querySelector<HTMLElement>(":scope > ol > li");
      const sourceAnchor = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'))
        .find((anchor) => targetFromAnchor(anchor)?.id === targetItem?.id && !appendix.contains(anchor));
      if (targetItem?.id) {
        lastTriggerRef.current = sourceAnchor ?? null;
        selectReference(hashKind, targetItem.id, false);
        if (narrowRef.current) setSheetOpen(true);
      }
    }

    return () => {
      document.removeEventListener("pointerdown", rememberReadingPosition, true);
      document.removeEventListener("click", activate);
    };
  }, [contentRevision, selectReference]);

  const availableKinds = useMemo(
    () => (["notes", "sources"] as const).filter((candidate) => items[candidate].length > 0),
    [items]
  );
  const currentItems = items[kind];
  const currentIndex = Math.max(0, currentItems.findIndex((item) => item.id === active[kind]));
  const currentItem = currentItems[currentIndex];

  const move = useCallback((offset: number) => {
    const group = items[kind];
    if (group.length === 0) return;
    const index = Math.max(0, group.findIndex((item) => item.id === active[kind]));
    const next = group[Math.min(group.length - 1, Math.max(0, index + offset))];
    if (next) selectReference(kind, next.id);
  }, [active, items, kind, selectReference]);

  const closeSheet = useCallback((restoreFocus = true) => {
    setSheetOpen(false);
    if (restoreFocus) requestAnimationFrame(() => lastTriggerRef.current?.focus({ preventScroll: true }));
  }, []);

  const viewOrigin = useCallback(() => {
    const root = hostRef.current?.closest<HTMLElement>(".translation-edition-page");
    const appendix = root?.querySelector<HTMLElement>("[data-translation-appendices]");
    if (!root || !currentItem) return;
    const origin = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'))
      .find((anchor) => targetFromAnchor(anchor)?.id === currentItem.id && !appendix?.contains(anchor));
    if (!origin) return;
    history.replaceState(history.state, "", `${window.location.pathname}${window.location.search}`);
    if (sheetOpen) {
      originAfterCloseRef.current = origin;
      setSheetOpen(false);
      return;
    }
    scrollToReadingLine(origin);
  }, [currentItem, sheetOpen]);

  useEffect(() => {
    if (!sheetOpen) return;
    const scrollPosition = sheetScrollRef.current ?? window.scrollY;
    sheetScrollRef.current = null;
    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.width = "100%";
    requestAnimationFrame(() => closeRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSheet();
        return;
      }
      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusable = focusableElements(sheetRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      const origin = originAfterCloseRef.current;
      originAfterCloseRef.current = null;
      if (origin) {
        scrollToReadingLine(origin);
      } else {
        window.scrollTo({ top: scrollPosition, behavior: "auto" });
      }
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeSheet, sheetOpen]);

  if (availableKinds.length === 0) return <div ref={hostRef} />;

  const panel = (surface: "desk" | "sheet") => (
    <section
      className={surface === "desk" ? styles.translationReferenceDesk : styles.translationReferenceSheetPanel}
      data-translation-reference-desk={surface === "desk" ? "true" : undefined}
      data-translation-reference-surface={surface}
    >
      <header className={styles.translationReferenceHeader}>
        <div className={styles.translationReferenceTabs}>
          {availableKinds.map((candidate) => (
            <button
              type="button"
              data-active={candidate === kind ? "true" : "false"}
              onClick={() => setKind(candidate)}
              key={candidate}
            >
              {labels[candidate]}
            </button>
          ))}
        </div>
        <b aria-label={labels.position(currentIndex + 1, currentItems.length)}>
          {String(currentIndex + 1).padStart(2, "0")}<span>/</span>{String(currentItems.length).padStart(2, "0")}
        </b>
      </header>
      {currentItem && (
        <article
          className={styles.translationReferenceContent}
          aria-live="polite"
          aria-label={`${kind === "notes" ? labels.note : labels.source} ${currentItem.label}`}
        >
          <i>{currentItem.label}</i>
          <div dangerouslySetInnerHTML={{ __html: currentItem.html }} />
        </article>
      )}
      <footer className={styles.translationReferenceActions}>
        <button type="button" disabled={currentIndex === 0} onClick={() => move(-1)}>{labels.previous}</button>
        <button type="button" onClick={viewOrigin}>{labels.origin}</button>
        <button type="button" disabled={currentIndex >= currentItems.length - 1} onClick={() => move(1)}>{labels.next}</button>
      </footer>
    </section>
  );

  return (
    <div
      ref={hostRef}
      className={styles.translationReferences}
      data-translation-references-ready={availableKinds.length > 0 ? "true" : undefined}
    >
      {!narrow && panel("desk")}
      {portalReady && narrow && sheetOpen && createPortal(
        <div
          className={styles.translationReferenceSheetLayer}
          lang={locale}
          data-translation-reference-surface="sheet"
          onPointerDown={(event) => { if (event.currentTarget === event.target) closeSheet(); }}
        >
          <section
            ref={sheetRef}
            className={styles.translationReferenceSheet}
            role="dialog"
            aria-modal="true"
            aria-label={labels[kind]}
          >
            <span className={styles.translationReferenceSheetHandle} aria-hidden="true" />
            <button ref={closeRef} type="button" className={styles.translationReferenceClose} aria-label={labels.close} onClick={() => closeSheet()}>×</button>
            {panel("sheet")}
          </section>
        </div>,
        document.body
      )}
    </div>
  );
}
