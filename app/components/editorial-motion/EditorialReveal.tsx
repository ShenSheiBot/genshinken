"use client";

import { useEffect } from "react";

const REVEAL_SELECTOR = "[data-reveal]";

/**
 * Activates the selected editorial reveal language without URL state, storage,
 * or prototype UI. Content remains visible when JavaScript or
 * IntersectionObserver is unavailable.
 */
export default function EditorialReveal() {
  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.dataset.editorialRevealController = "ready";
    if (reduceMotion || !("IntersectionObserver" in window)) {
      delete root.dataset.editorialRevealReady;
      return () => {
        delete root.dataset.editorialRevealController;
      };
    }

    const observed = new WeakSet<Element>();
    const visible = new WeakSet<Element>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || visible.has(entry.target)) return;
        visible.add(entry.target);
        (entry.target as HTMLElement).dataset.revealVisible = "true";
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });

    const observe = () => {
      document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((node) => {
        if (observed.has(node)) return;
        observed.add(node);
        observer.observe(node);
      });
    };

    root.dataset.editorialRevealReady = "true";
    observe();
    const mutation = new MutationObserver(observe);
    mutation.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutation.disconnect();
      observer.disconnect();
      delete root.dataset.editorialRevealReady;
      delete root.dataset.editorialRevealController;
    };
  }, []);

  return null;
}
