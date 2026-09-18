"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import styles from "./reading-edition.module.css";

export function HoverContents({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);
  return (
    <div ref={container} className={styles.hoverContents} data-open={open}
      onPointerEnter={(event) => { if (event.pointerType === "mouse") setOpen(true); }}
      onPointerLeave={(event) => { if (!event.currentTarget.contains(document.activeElement)) setOpen(false); }}
      onFocus={() => setOpen(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          event.currentTarget.querySelector("button")?.focus();
          setOpen(false);
        }
      }}>
      <button type="button" className={styles.contentsPeek} aria-expanded={open} aria-controls="reader-hover-contents"
        onClick={() => setOpen(true)}>{label}<span aria-hidden="true"> ›</span></button>
      <div id="reader-hover-contents" className={styles.contentsReveal} inert={!open} aria-hidden={!open}>
        {children}
      </div>
    </div>
  );
}

/** The content is the same sanitized note HTML used by the optional side rail. */
export function ReferencePopover({ anchor, html, label, closeLabel, focus, onClose, children }: {
  anchor: HTMLAnchorElement;
  html: string;
  label: string;
  closeLabel: string;
  focus: boolean;
  onClose: (restoreFocus?: boolean) => void;
  children?: ReactNode;
}) {
  const panel = useRef<HTMLElement>(null);
  const dismiss = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [position, setPosition] = useState({ left: 12, top: 80 });
  const cancelDismiss = () => { if (dismiss.current) clearTimeout(dismiss.current); };

  useLayoutEffect(() => {
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const box = panel.current?.getBoundingClientRect();
      if (!box) return;
      const view = window.visualViewport;
      const leftEdge = (view?.offsetLeft ?? 0) + 12;
      const topEdge = Math.max((view?.offsetTop ?? 0) + 12, 76);
      const rightEdge = (view?.offsetLeft ?? 0) + (view?.width ?? innerWidth) - 12;
      const bottomEdge = (view?.offsetTop ?? 0) + (view?.height ?? innerHeight) - 12;
      const below = rect.bottom + 8;
      const top = below + box.height <= bottomEdge ? below : rect.top - box.height - 8;
      setPosition({
        left: Math.max(leftEdge, Math.min(rect.left - 16, rightEdge - box.width)),
        top: Math.max(topEdge, Math.min(top, bottomEdge - box.height)),
      });
    };
    place();
    const observer = new ResizeObserver(place);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener("resize", place);
    const onScroll = () => {
      const rect = anchor.getBoundingClientRect();
      if (!anchor.isConnected || rect.bottom < 76 || rect.top > innerHeight) onClose();
      else place();
    };
    window.addEventListener("scroll", onScroll, true);
    window.visualViewport?.addEventListener("resize", place);
    window.visualViewport?.addEventListener("scroll", place);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
      window.visualViewport?.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("scroll", place);
    };
  }, [anchor, html, onClose]);

  useEffect(() => {
    if (focus) panel.current?.focus({ preventScroll: true });
  }, [anchor, focus]);

  useEffect(() => {
    const inside = (node: EventTarget | null) => node instanceof Node && (anchor.contains(node) || panel.current?.contains(node));
    const leave = () => {
      cancelDismiss();
      if (!focus) dismiss.current = setTimeout(() => {
        if (!panel.current?.matches(":hover") && !inside(document.activeElement)) onClose();
      }, 220);
    };
    const outside = (event: Event) => { if (!inside(event.target)) onClose(); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(true); }
    };
    const previous = anchor.getAttribute("aria-expanded");
    anchor.setAttribute("aria-expanded", "true");
    anchor.setAttribute("aria-controls", "reader-note-popover");
    anchor.addEventListener("pointerleave", leave);
    anchor.addEventListener("pointerenter", cancelDismiss);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", escape);
    return () => {
      cancelDismiss();
      if (previous === null) anchor.removeAttribute("aria-expanded");
      else anchor.setAttribute("aria-expanded", previous);
      anchor.removeAttribute("aria-controls");
      anchor.removeEventListener("pointerleave", leave);
      anchor.removeEventListener("pointerenter", cancelDismiss);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [anchor, focus, onClose]);

  return <section ref={panel} id="reader-note-popover" role="dialog" aria-label={label} tabIndex={-1}
    className={styles.notePopover} style={position}
    onPointerEnter={cancelDismiss}
    onPointerLeave={() => {
      cancelDismiss();
      if (!focus) dismiss.current = setTimeout(() => {
        if (!panel.current?.contains(document.activeElement) && document.activeElement !== anchor) onClose();
      }, 220);
    }}>
    <header><b>{label}</b><button type="button" aria-label={closeLabel} onClick={() => onClose(true)}>×</button></header>
    <div className={styles.referenceDetailContent} dangerouslySetInnerHTML={{ __html: html }} />
    {children}
  </section>;
}
