"use client";

import { useLayoutEffect, useRef } from "react";
import styles from "./reading-edition.module.css";

export type Sidenote = {
  id: string;
  label: string;
  html: string;
  anchor: HTMLAnchorElement | null;
};

/** One document flow: notes follow their markers, with only collisions pushed down. */
export default function ReaderSidenotes({ notes, originLabel, typography }: { notes: Sidenote[]; originLabel: string; typography: string }) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const host = root.current;
    if (!host) return;
    let frame = 0;
    const arrange = () => {
      const start = host.getBoundingClientRect().top;
      let bottom = 0;
      for (const [index, note] of notes.entries()) {
        const element = host.children[index] as HTMLElement;
        const desired = note.anchor ? note.anchor.getBoundingClientRect().top - start : bottom;
        const top = Math.max(0, desired, bottom);
        element.style.top = `${top}px`;
        bottom = top + element.getBoundingClientRect().height + 18;
      }
      // Include the last note in the document height, keeping it clear of the footer.
      host.style.height = `${Math.max(0, bottom - 18)}px`;
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(arrange); };
    arrange();
    const observer = new ResizeObserver(schedule);
    const body = document.querySelector(".reading-edition-flow");
    if (body) observer.observe(body);
    for (const child of host.children) observer.observe(child);
    window.addEventListener("resize", schedule);
    document.addEventListener("animationend", schedule, true);
    document.fonts.addEventListener("loadingdone", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      document.removeEventListener("animationend", schedule, true);
      document.fonts.removeEventListener("loadingdone", schedule);
    };
  }, [notes, typography]);

  return <div ref={root} className={styles.sidenotes} data-reader-sidenotes>
    {notes.map((note) => <section key={note.id} id={`reading-sidenote-${note.id}`}
      className={styles.sidenote} data-sidenote-id={note.id} tabIndex={-1} aria-label={note.label}>
      <button type="button" className={styles.sidenoteNumber} aria-label={`${note.label} · ${originLabel}`}
        disabled={!note.anchor} onClick={() => {
          note.anchor?.scrollIntoView({ block: "center", behavior: "auto" });
          note.anchor?.focus({ preventScroll: true });
        }}>{note.label}</button>
      <div dangerouslySetInnerHTML={{ __html: note.html }} />
    </section>)}
  </div>;
}
