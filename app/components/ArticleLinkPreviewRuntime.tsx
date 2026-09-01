"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type LinkPreview = {
  url: string;
  hostname: string;
  siteName: string;
  title: string;
};

const previewCache = new Map<string, Promise<LinkPreview>>();

function loadPreview(url: string): Promise<LinkPreview> {
  const existing = previewCache.get(url);
  if (existing) return existing;
  const request = fetch(`/api/link-preview?url=${encodeURIComponent(url)}`, {
    headers: { Accept: "application/json" },
  }).then(async (response) => {
    if (!response.ok) throw new Error("preview unavailable");
    return await response.json() as LinkPreview;
  }).catch((error: unknown) => {
    previewCache.delete(url);
    throw error;
  });
  previewCache.set(url, request);
  return request;
}

function iconImage(pageUrl: string): HTMLImageElement {
  const image = document.createElement("img");
  image.alt = "";
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";
  image.src = `/api/link-preview/icon?url=${encodeURIComponent(pageUrl)}`;
  image.addEventListener("error", () => image.remove(), { once: true });
  return image;
}

function fallbackHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./iu, "");
  } catch {
    return url;
  }
}

function populateCard(card: HTMLElement, preview: LinkPreview, pageUrl: string): void {
  const identity = document.createElement("div");
  identity.className = "external-link-popover-identity";
  const icon = document.createElement("span");
  icon.className = "external-link-popover-icon";
  icon.append(iconImage(pageUrl));
  const site = document.createElement("strong");
  site.textContent = preview.siteName || preview.hostname;
  const host = document.createElement("small");
  host.textContent = preview.hostname;
  identity.append(icon, site, host);

  const title = document.createElement("b");
  title.className = "external-link-popover-title";
  title.textContent = preview.title;
  const address = document.createElement("span");
  address.className = "external-link-popover-address";
  address.textContent = preview.url;
  card.replaceChildren(identity, ...(preview.title ? [title] : []), address);
}

function populateFallbackCard(card: HTMLElement, pageUrl: string): void {
  const host = fallbackHostname(pageUrl);
  const identity = document.createElement("div");
  identity.className = "external-link-popover-identity";
  const icon = document.createElement("span");
  icon.className = "external-link-popover-icon";
  const site = document.createElement("strong");
  site.textContent = host;
  identity.append(icon, site);
  const address = document.createElement("span");
  address.className = "external-link-popover-address";
  address.textContent = pageUrl;
  card.replaceChildren(identity, address);
}

function positionCard(card: HTMLElement, anchor: HTMLElement): void {
  const anchorBox = anchor.getBoundingClientRect();
  const cardBox = card.getBoundingClientRect();
  const gutter = 12;
  const left = Math.max(
    gutter,
    Math.min(anchorBox.left, window.innerWidth - cardBox.width - gutter)
  );
  const above = anchorBox.top - cardBox.height - 10;
  const top = above >= gutter
    ? above
    : Math.min(window.innerHeight - cardBox.height - gutter, anchorBox.bottom + 10);
  card.style.left = `${Math.round(left)}px`;
  card.style.top = `${Math.max(gutter, Math.round(top))}px`;
}

function sizeCardForContext(card: HTMLElement, anchor: HTMLElement): void {
  const contextSize = Number.parseFloat(getComputedStyle(anchor).fontSize);
  if (!Number.isFinite(contextSize)) return;
  const titleSize = Math.min(15, Math.max(12.5, contextSize * .9));
  const siteSize = Math.min(13, Math.max(11, contextSize * .76));
  card.style.setProperty("--external-link-title-size", `${titleSize}px`);
  card.style.setProperty("--external-link-site-size", `${siteSize}px`);
}

function applyPreviewToChip(link: HTMLAnchorElement, preview: LinkPreview): void {
  const label = link.querySelector<HTMLElement>(".external-link-chip-label");
  if (label) label.textContent = preview.siteName || preview.hostname;
  const identity = preview.siteName || preview.hostname;
  link.setAttribute("aria-label", preview.title ? `${identity}：${preview.title}` : identity);
}

function applyIconToChip(link: HTMLAnchorElement, pageUrl: string): void {
  const icon = link.querySelector<HTMLElement>(".external-link-chip-icon");
  if (!icon || icon.style.backgroundImage) return;
  const source = `/api/link-preview/icon?url=${encodeURIComponent(pageUrl)}`;
  icon.style.backgroundImage = `url(${JSON.stringify(source)})`;
}

function installArticleLinkPreviews(): () => void {
  const links = [...document.querySelectorAll<HTMLAnchorElement>(
    ".art-body a.external-link-chip[data-link-preview]"
  )];
  if (links.length === 0) return () => {};

  const cleanups: Array<() => void> = [];
  const hydrate = (link: HTMLAnchorElement) => {
    const pageUrl = link.dataset.linkPreview;
    if (!pageUrl || link.dataset.linkPreviewReady) return;
    applyIconToChip(link, pageUrl);
    link.dataset.linkPreviewReady = "loading";
    void loadPreview(pageUrl).then((preview) => {
      link.dataset.linkPreviewReady = "true";
      applyPreviewToChip(link, preview);
    }).catch(() => {
      link.dataset.linkPreviewReady = "failed";
    });
  };
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        hydrate(entry.target as HTMLAnchorElement);
      }
    }, { rootMargin: "240px" });
    links.forEach((link) => observer.observe(link));
    cleanups.push(() => observer.disconnect());
  } else {
    links.forEach(hydrate);
  }

  const media = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (!media.matches) return () => cleanups.forEach((cleanup) => cleanup());

  const card = document.createElement("div");
  card.className = "external-link-popover";
  card.id = "external-link-popover";
  card.setAttribute("role", "tooltip");
  card.hidden = true;
  document.body.append(card);

  let active: HTMLAnchorElement | null = null;
  let hideTimer: number | undefined;

  const hide = () => {
    if (hideTimer !== undefined) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      if (active) active.removeAttribute("aria-describedby");
      active = null;
      card.hidden = true;
    }, 80);
  };
  const show = (link: HTMLAnchorElement) => {
    if (hideTimer !== undefined) window.clearTimeout(hideTimer);
    active = link;
    const pageUrl = link.dataset.linkPreview;
    if (!pageUrl) return;
    link.setAttribute("aria-describedby", card.id);
    sizeCardForContext(card, link);
    populateFallbackCard(card, pageUrl);
    card.hidden = false;
    positionCard(card, link);

    void loadPreview(pageUrl).then((preview) => {
      if (active !== link) return;
      populateCard(card, preview, pageUrl);
      applyPreviewToChip(link, preview);
      positionCard(card, link);
    }).catch(() => {
      // The compact host chip is the complete failure fallback.
    });
  };

  for (const link of links) {
    const onMouseEnter = () => show(link);
    const onMouseLeave = () => hide();
    const onFocus = () => show(link);
    const onBlur = () => hide();
    link.addEventListener("mouseenter", onMouseEnter);
    link.addEventListener("mouseleave", onMouseLeave);
    link.addEventListener("focus", onFocus);
    link.addEventListener("blur", onBlur);
    cleanups.push(() => {
      link.removeEventListener("mouseenter", onMouseEnter);
      link.removeEventListener("mouseleave", onMouseLeave);
      link.removeEventListener("focus", onFocus);
      link.removeEventListener("blur", onBlur);
    });
  }

  const reposition = () => {
    if (active && !card.hidden) positionCard(card, active);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || card.hidden) return;
    if (active) active.removeAttribute("aria-describedby");
    active = null;
    card.hidden = true;
  };
  window.addEventListener("resize", reposition);
  window.addEventListener("scroll", reposition, true);
  document.addEventListener("keydown", onKeyDown);

  return () => {
    if (hideTimer !== undefined) window.clearTimeout(hideTimer);
    cleanups.forEach((cleanup) => cleanup());
    window.removeEventListener("resize", reposition);
    window.removeEventListener("scroll", reposition, true);
    document.removeEventListener("keydown", onKeyDown);
    card.remove();
  };
}

export default function ArticleLinkPreviewRuntime() {
  const pathname = usePathname();
  useEffect(() => installArticleLinkPreviews(), [pathname]);
  return null;
}
