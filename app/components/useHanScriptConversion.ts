"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ConverterFunction, LocalePreset } from "opencc-js/core";
import {
  HAN_SCRIPT_STORAGE_KEY,
  browserHanScript,
  hanScriptLanguageTag,
  isHanScript,
  preferredHanScript,
  type HanScript,
} from "@/lib/han-script";

type TrackedValue = { source: string; rendered: string };
type AttributeName = "alt" | "aria-label" | "placeholder" | "title";

const CONVERSION_ROOT = '[data-han-convert-root="post"]';
const CONVERSION_LANG_TARGET = "[data-han-convert-lang]";
const CONVERSION_ATTRIBUTES: readonly AttributeName[] = [
  "alt",
  "aria-label",
  "placeholder",
  "title",
];
const CONVERSION_SKIP = [
  "script",
  "style",
  "noscript",
  "template",
  "code",
  "pre",
  "kbd",
  "samp",
  "svg",
  "math",
  ".ignore-opencc",
  '[translate="no"]',
  "[data-no-han-convert]",
  '[lang]:not([lang^="zh" i])',
].join(",");

const trackedText = new WeakMap<Text, TrackedValue>();
const trackedAttributes = new WeakMap<Element, Map<AttributeName, TrackedValue>>();

let hansToHant: Promise<ConverterFunction> | null = null;
let hantToHans: Promise<ConverterFunction> | null = null;

function localePreset(module: {
  from: LocalePreset["from"];
  to: LocalePreset["to"];
  configs: NonNullable<LocalePreset["configs"]>;
}): LocalePreset {
  return { from: module.from, to: module.to, configs: module.configs };
}

async function loadConverter(source: HanScript): Promise<ConverterFunction> {
  if (source === "hans") {
    hansToHant ??= Promise.all([
      import("opencc-js/core"),
      import("opencc-js/preset/cn2t"),
    ]).then(([core, preset]) =>
      core.ConverterBuilder(localePreset(preset))({ from: "cn", to: "t" })
    );
    return hansToHant;
  }

  hantToHans ??= Promise.all([
    import("opencc-js/core"),
    import("opencc-js/preset/t2cn"),
  ]).then(([core, preset]) =>
    core.ConverterBuilder(localePreset(preset))({ from: "t", to: "cn" })
  );
  return hantToHans;
}

function isIgnored(node: Node, root: HTMLElement): boolean {
  const element = node.nodeType === Node.ELEMENT_NODE
    ? node as Element
    : node.parentElement;
  const ignored = element?.closest(CONVERSION_SKIP);
  return !!ignored && root.contains(ignored);
}

function renderText(
  node: Text,
  root: HTMLElement,
  converter: ConverterFunction | null
): void {
  if (isIgnored(node, root)) return;
  const current = node.data;
  let tracked = trackedText.get(node);
  if (!tracked) {
    tracked = { source: current, rendered: current };
    trackedText.set(node, tracked);
  } else if (current !== tracked.rendered) {
    tracked.source = current;
  }

  const next = converter ? converter(tracked.source) : tracked.source;
  tracked.rendered = next;
  if (node.data !== next) node.data = next;
}

function renderAttribute(
  element: Element,
  attribute: AttributeName,
  root: HTMLElement,
  converter: ConverterFunction | null
): void {
  if (isIgnored(element, root)) return;
  const current = element.getAttribute(attribute);
  if (current == null) return;

  let attributes = trackedAttributes.get(element);
  if (!attributes) {
    attributes = new Map();
    trackedAttributes.set(element, attributes);
  }

  let tracked = attributes.get(attribute);
  if (!tracked) {
    tracked = { source: current, rendered: current };
    attributes.set(attribute, tracked);
  } else if (current !== tracked.rendered) {
    tracked.source = current;
  }

  const next = converter ? converter(tracked.source) : tracked.source;
  tracked.rendered = next;
  if (current !== next) element.setAttribute(attribute, next);
}

function renderElementAttributes(
  element: Element,
  root: HTMLElement,
  converter: ConverterFunction | null
): void {
  CONVERSION_ATTRIBUTES.forEach((attribute) =>
    renderAttribute(element, attribute, root, converter)
  );
}

function renderSubtree(
  node: Node,
  root: HTMLElement,
  converter: ConverterFunction | null
): void {
  if (node.nodeType === Node.TEXT_NODE) {
    renderText(node as Text, root, converter);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE || isIgnored(node, root)) return;

  const element = node as Element;
  renderElementAttributes(element, root, converter);
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let current = walker.nextNode(); current; current = walker.nextNode()) {
    renderText(current as Text, root, converter);
  }
  element.querySelectorAll("*").forEach((child) =>
    renderElementAttributes(child, root, converter)
  );
}

function navigatorLanguages(): readonly string[] {
  return navigator.languages?.length
    ? navigator.languages
    : navigator.language
      ? [navigator.language]
      : [];
}

function readSavedScript(): string | null {
  try {
    return window.localStorage.getItem(HAN_SCRIPT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeSavedScript(script: HanScript): void {
  try {
    window.localStorage.setItem(HAN_SCRIPT_STORAGE_KEY, script);
  } catch {
    // Language preference remains usable for this visit when storage is restricted.
  }
}

/** Reading-progress fingerprints must remain stable across display conversions. */
export function hanSourceText(node: Text): string {
  return trackedText.get(node)?.source ?? node.data;
}

export function useHanScriptConversion({
  sourceScript,
  contentRevision,
}: {
  sourceScript: HanScript;
  contentRevision: string;
}) {
  const [script, setScript] = useState<HanScript>(sourceScript);
  const [busy, setBusy] = useState(false);
  const [conversionRevision, setConversionRevision] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const declared = document.documentElement.dataset.chineseScript;
    const initial = isHanScript(declared)
      ? declared
      : preferredHanScript(readSavedScript(), navigatorLanguages());
    document.documentElement.dataset.chineseScript = initial;
    setScript(initial);

    const syncStorage = (event: StorageEvent) => {
      if (event.key !== HAN_SCRIPT_STORAGE_KEY) return;
      const next = isHanScript(event.newValue)
        ? event.newValue
        : browserHanScript(navigatorLanguages());
      document.documentElement.dataset.chineseScript = next;
      setScript(next);
    };
    const syncBrowser = () => {
      if (isHanScript(readSavedScript())) return;
      const next = browserHanScript(navigatorLanguages());
      document.documentElement.dataset.chineseScript = next;
      setScript(next);
    };

    window.addEventListener("storage", syncStorage);
    window.addEventListener("languagechange", syncBrowser);
    return () => {
      mounted.current = false;
      window.removeEventListener("storage", syncStorage);
      window.removeEventListener("languagechange", syncBrowser);
      document.documentElement.lang = "zh";
      delete document.documentElement.dataset.chineseConverting;
    };
  }, []);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(CONVERSION_ROOT);
    if (!root) return;

    let cancelled = false;
    let observer: MutationObserver | null = null;
    document.documentElement.dataset.chineseConverting = "true";
    setBusy(true);

    void (async () => {
      const converter = script === sourceScript
        ? null
        : await loadConverter(sourceScript);
      if (cancelled) return;

      renderSubtree(root, root, converter);
      const languageTag = hanScriptLanguageTag(script);
      root.lang = languageTag;
      root.querySelectorAll<HTMLElement>(CONVERSION_LANG_TARGET).forEach((element) => {
        element.lang = languageTag;
      });
      document.documentElement.lang = languageTag;
      document.documentElement.dataset.chineseScript = script;

      observer = new MutationObserver((records) => {
        records.forEach((record) => {
          if (record.type === "characterData") {
            renderText(record.target as Text, root, converter);
          } else if (record.type === "attributes") {
            renderAttribute(
              record.target as Element,
              record.attributeName as AttributeName,
              root,
              converter
            );
          } else {
            record.addedNodes.forEach((node) => renderSubtree(node, root, converter));
          }
        });
      });
      observer.observe(root, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: [...CONVERSION_ATTRIBUTES],
      });

      delete document.documentElement.dataset.chineseConverting;
      if (mounted.current) {
        setBusy(false);
        setConversionRevision((revision) => revision + 1);
      }
    })().catch(() => {
      delete document.documentElement.dataset.chineseConverting;
      if (mounted.current) setBusy(false);
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [contentRevision, script, sourceScript]);

  const selectScript = useCallback((next: HanScript) => {
    writeSavedScript(next);
    document.documentElement.dataset.chineseScript = next;
    setScript(next);
  }, []);

  const toggleScript = useCallback(() => {
    selectScript(script === "hans" ? "hant" : "hans");
  }, [script, selectScript]);

  return {
    script,
    busy,
    conversionRevision,
    selectScript,
    toggleScript,
  };
}
