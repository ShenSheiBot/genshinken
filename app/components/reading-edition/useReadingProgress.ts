"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  READING_PROGRESS_ENABLED_KEY,
  nativeScrollRestorationHasPriority,
  readReadingProgress,
  readReadingProgressEnabled,
  readingProgressKey,
  remoteReadingProgressSupersedesPending,
  removeAllReadingProgress,
  removeReadingProgress,
  writeReadingProgress,
  writeReadingProgressEnabled,
  type ReadingProgressRecord,
} from "./reading-progress";

export type ReadingBlockMeasurement = {
  element: HTMLElement;
  fingerprint: string;
  headingId: string | null;
  centers: number[];
};

export type ReadingLineMeasurement = {
  blockIndex: number;
  lineIndex: number;
};

export type ReadingMeasurement = {
  resource: string;
  revision: string;
  body: HTMLElement;
  blocks: ReadingBlockMeasurement[];
  lineCenters: number[];
  lines: ReadingLineMeasurement[];
};

export type ReadingProgressMessages = {
  appended: string;
  approximate: string;
  restored: string;
  disabled: string;
  disabledNotStored: string;
  enabled: string;
  enabledNotStored: string;
  clearCurrentFailed: string;
  clearCurrentDone: string;
  clearAllFailed: string;
  clearAllDone: string;
};

const DEFAULT_MESSAGES: ReadingProgressMessages = {
  appended: "文章已有新增内容，已回到上次读完的位置",
  approximate: "文章已更新，已恢复到上次位置附近",
  restored: "已恢复到上次阅读位置",
  disabled: "已停止保存本机阅读记录",
  disabledNotStored: "本页已停止保存；浏览器未能记住此设置",
  enabled: "已开启本机阅读记录",
  enabledNotStored: "本页已开启保存；浏览器未能记住此设置",
  clearCurrentFailed: "浏览器未能清除本文阅读记录",
  clearCurrentDone: "已清除本文阅读记录",
  clearAllFailed: "浏览器未能清除全部阅读记录",
  clearAllDone: "已清除全部阅读记录",
};

type RestoreConfidence = "exact" | "near" | "approximate";

type RestoreResult = {
  top: number;
  confidence: RestoreConfidence;
  boundaryAfter: HTMLElement | null;
  appended: boolean;
};

type RestoredReading = {
  record: ReadingProgressRecord;
  restoredAt: number;
  measurement: ReadingMeasurement;
};

const SAVE_DELAY_MS = 1000;
const CORRECTION_WINDOW_MS = 15_000;
const STATUS_DURATION_MS = 3200;
const NAVIGATION_KEYS = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", "End", "Home", " "]);
const NAVIGATION_TICKET_MAX_AGE_MS = 30_000;

type NavigationTicket = {
  id: number;
  target: string;
  createdAt: number;
  claimedAt: number | null;
};

type ReadingNavigationTracker = {
  version: 1;
  nextId: number;
  tickets: NavigationTicket[];
};

type NavigationTrackerWindow = Window & {
  __ubReadingNavigationV1?: ReadingNavigationTracker;
};

function navigationTarget(url = window.location.href): string {
  try {
    const parsed = new URL(url, window.location.href);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }
}

function addNavigationTicket(tracker: ReadingNavigationTracker, target: string): void {
  const now = performance.now();
  tracker.tickets = tracker.tickets
    .filter((ticket) => now - ticket.createdAt < NAVIGATION_TICKET_MAX_AGE_MS)
    .slice(-7);
  tracker.tickets.push({ id: tracker.nextId++, target, createdAt: now, claimedAt: null });
}

/**
 * A window-level listener survives the reader's Next.js client-route unmount.
 * The singleton also prevents StrictMode and Fast Refresh from duplicating it.
 */
function readingNavigationTracker(): ReadingNavigationTracker {
  const owner = window as NavigationTrackerWindow;
  if (owner.__ubReadingNavigationV1) return owner.__ubReadingNavigationV1;
  const tracker: ReadingNavigationTracker = { version: 1, nextId: 1, tickets: [] };
  owner.__ubReadingNavigationV1 = tracker;
  try {
    const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nativeScrollRestorationHasPriority(entry?.type)) {
      addNavigationTicket(tracker, navigationTarget(entry?.name));
    }
  } catch {
    // The live scroll position and pageshow event remain as fallbacks.
  }
  window.addEventListener("popstate", () => {
    addNavigationTicket(tracker, navigationTarget());
  }, { capture: true });
  return tracker;
}

function claimNativeNavigationTicket(): boolean {
  const tracker = readingNavigationTracker();
  const target = navigationTarget();
  const now = performance.now();
  tracker.tickets = tracker.tickets.filter((ticket) =>
    now - ticket.createdAt < NAVIGATION_TICKET_MAX_AGE_MS
      && ticket.claimedAt === null
  );
  let ticket: NavigationTicket | undefined;
  for (let index = tracker.tickets.length - 1; index >= 0; index -= 1) {
    if (tracker.tickets[index].target === target) {
      ticket = tracker.tickets[index];
      break;
    }
  }
  if (!ticket) return false;
  if (ticket.claimedAt === null) ticket.claimedAt = now;
  return true;
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function documentTop(element: HTMLElement): number {
  return element.getBoundingClientRect().top + window.scrollY;
}

function topForCenter(measurement: ReadingMeasurement, center: number, viewportAnchor: () => number): number {
  return Math.max(0, documentTop(measurement.body) + center - viewportAnchor() + 1);
}

function bestFingerprintIndex(
  fingerprint: string | undefined,
  record: ReadingProgressRecord,
  measurement: ReadingMeasurement
): number {
  if (!fingerprint) return -1;
  let best = -1;
  let bestScore = Number.NEGATIVE_INFINITY;
  measurement.blocks.forEach((block, index) => {
    if (block.fingerprint !== fingerprint) return;
    let score = 0;
    if (record.anchor.previousFingerprint && measurement.blocks[index - 1]?.fingerprint === record.anchor.previousFingerprint) score += 8;
    if (record.anchor.nextFingerprint && measurement.blocks[index + 1]?.fingerprint === record.anchor.nextFingerprint) score += 8;
    if (record.anchor.headingId && block.headingId === record.anchor.headingId) score += 4;
    score -= Math.abs(index - record.anchor.blockIndex) / Math.max(1, measurement.blocks.length);
    if (score > bestScore) {
      best = index;
      bestScore = score;
    }
  });
  return best;
}

function targetBlockTop(
  blockIndex: number,
  lineProgress: number,
  measurement: ReadingMeasurement,
  viewportAnchor: () => number
): number | null {
  const block = measurement.blocks[blockIndex];
  if (!block || block.centers.length === 0) return null;
  const lineIndex = Math.round(clamp(lineProgress) * Math.max(0, block.centers.length - 1));
  const center = block.centers[Math.min(block.centers.length - 1, lineIndex)];
  return topForCenter(measurement, center, viewportAnchor);
}

function resolveRestore(
  record: ReadingProgressRecord,
  revision: string,
  measurement: ReadingMeasurement,
  viewportAnchor: () => number
): RestoreResult | null {
  if (measurement.blocks.length === 0 || measurement.lineCenters.length === 0) return null;

  const lastBlockIndex = measurement.blocks.length - 1;
  const endFingerprintIndex = bestFingerprintIndex(record.endFingerprint, record, measurement);
  const contentWasAppended = record.status === "completed"
    && record.revision !== revision
    && endFingerprintIndex >= 0
    && endFingerprintIndex < lastBlockIndex;

  if (contentWasAppended) {
    const top = targetBlockTop(endFingerprintIndex, 1, measurement, viewportAnchor);
    if (top !== null) {
      return {
        top,
        confidence: "exact",
        boundaryAfter: measurement.blocks[endFingerprintIndex].element,
        appended: true,
      };
    }
  }

  if (record.status === "completed" && endFingerprintIndex === lastBlockIndex) {
    const endMark = measurement.body
      .closest<HTMLElement>(".reading-edition-flow")
      ?.querySelector<HTMLElement>("[data-reading-end]");
    if (endMark) {
      return {
        top: Math.max(0, documentTop(endMark) - viewportAnchor() + 1),
        confidence: record.revision === revision ? "exact" : "near",
        boundaryAfter: null,
        appended: false,
      };
    }
  }

  const exactBlockIndex = bestFingerprintIndex(record.anchor.fingerprint, record, measurement);
  if (exactBlockIndex >= 0) {
    const top = targetBlockTop(exactBlockIndex, record.anchor.blockLineProgress, measurement, viewportAnchor);
    if (top !== null) {
      return {
        top,
        confidence: record.revision === revision ? "exact" : "near",
        boundaryAfter: null,
        appended: false,
      };
    }
  }

  const previousIndex = bestFingerprintIndex(record.anchor.previousFingerprint ?? undefined, record, measurement);
  const nextIndex = bestFingerprintIndex(record.anchor.nextFingerprint ?? undefined, record, measurement);
  const neighboringIndex = previousIndex >= 0 && previousIndex < lastBlockIndex
    ? previousIndex + 1
    : nextIndex > 0
      ? nextIndex - 1
      : -1;
  if (neighboringIndex >= 0) {
    const top = targetBlockTop(neighboringIndex, record.anchor.blockLineProgress, measurement, viewportAnchor);
    if (top !== null) return { top, confidence: "near", boundaryAfter: null, appended: false };
  }

  if (record.anchor.headingId) {
    const sectionIndexes = measurement.blocks.flatMap((block, index) => block.headingId === record.anchor.headingId ? [index] : []);
    if (sectionIndexes.length > 0) {
      const sectionLines = sectionIndexes.flatMap((blockIndex) =>
        measurement.blocks[blockIndex].centers.map((center) => ({ blockIndex, center }))
      );
      const offset = Math.round(record.anchor.sectionProgress * Math.max(0, sectionLines.length - 1));
      const target = sectionLines[offset];
      if (target) {
        return {
          top: topForCenter(measurement, target.center, viewportAnchor),
          confidence: "near",
          boundaryAfter: null,
          appended: false,
        };
      }
    }
  }

  const fallbackLine = Math.round(record.anchor.bodyProgress * Math.max(0, measurement.lineCenters.length - 1));
  const center = measurement.lineCenters[Math.min(measurement.lineCenters.length - 1, fallbackLine)];
  return {
    top: topForCenter(measurement, center, viewportAnchor),
    confidence: "approximate",
    boundaryAfter: null,
    appended: false,
  };
}

function topLevelBlock(body: HTMLElement, element: HTMLElement): HTMLElement {
  let block = element;
  while (block.parentElement && block.parentElement !== body) block = block.parentElement;
  return block;
}

export function useReadingProgress({
  active,
  slug,
  revision,
  measurement,
  viewportAnchor,
  messages = DEFAULT_MESSAGES,
}: {
  active: boolean;
  slug: string;
  revision: string;
  measurement: ReadingMeasurement | null;
  viewportAnchor: () => number;
  messages?: ReadingProgressMessages;
}) {
  const [trackingEnabled, setTrackingEnabledState] = useState(true);
  const [preferenceReady, setPreferenceReady] = useState(false);
  const [hasCurrentRecord, setHasCurrentRecord] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [boundaryHost, setBoundaryHost] = useState<HTMLElement | null>(null);

  const trackingEnabledRef = useRef(true);
  const recordRef = useRef<ReadingProgressRecord | null>(null);
  const latestRecordRef = useRef<ReadingProgressRecord | null>(null);
  const measurementRef = useRef<ReadingMeasurement | null>(measurement);
  const restorePhaseRef = useRef<"pending" | "done">("pending");
  const writeReadyRef = useRef(false);
  const userInteractedRef = useRef(false);
  const nativeRestorationRef = useRef(false);
  const restoredReadingRef = useRef<RestoredReading | null>(null);
  const routeDecisionRef = useRef<{ key: string; native: boolean } | null>(null);
  const readerPathnameRef = useRef("");
  const saveTimerRef = useRef<number | null>(null);
  const statusTimerRef = useRef<number | null>(null);
  const boundaryHostRef = useRef<HTMLElement | null>(null);
  const boundaryTargetRef = useRef<HTMLElement | null>(null);

  measurementRef.current = measurement?.resource === slug && measurement.revision === revision ? measurement : null;

  const clearSaveTimer = useCallback(() => {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
  }, []);

  const clearBoundary = useCallback(() => {
    boundaryHostRef.current?.remove();
    boundaryHostRef.current = null;
    boundaryTargetRef.current = null;
    setBoundaryHost(null);
  }, []);

  const showStatus = useCallback((message: string) => {
    if (statusTimerRef.current !== null) window.clearTimeout(statusTimerRef.current);
    setStatusMessage(message);
    statusTimerRef.current = window.setTimeout(() => {
      setStatusMessage("");
      statusTimerRef.current = null;
    }, STATUS_DURATION_MS);
  }, []);

  const flush = useCallback(() => {
    clearSaveTimer();
    const record = latestRecordRef.current;
    if (!active || !trackingEnabledRef.current || !writeReadyRef.current || !userInteractedRef.current || !record) return;
    const persisted = readReadingProgress(slug);
    if (persisted && remoteReadingProgressSupersedesPending(persisted, record)) {
      latestRecordRef.current = null;
      recordRef.current = persisted;
      userInteractedRef.current = false;
      setHasCurrentRecord(true);
      return;
    }
    if (writeReadingProgress(slug, record)) {
      recordRef.current = record;
      setHasCurrentRecord(true);
    }
  }, [active, clearSaveTimer, slug]);

  const scheduleFlush = useCallback(() => {
    clearSaveTimer();
    saveTimerRef.current = window.setTimeout(flush, SAVE_DELAY_MS);
  }, [clearSaveTimer, flush]);

  const installBoundary = useCallback((after: HTMLElement | null) => {
    const body = measurementRef.current?.body;
    if (!after || !body || !body.contains(after)) {
      clearBoundary();
      return;
    }
    const target = topLevelBlock(body, after);
    if (boundaryTargetRef.current === target && boundaryHostRef.current?.isConnected) return;
    clearBoundary();
    const host = document.createElement("div");
    host.dataset.readingUpdateBoundaryHost = "true";
    target.insertAdjacentElement("afterend", host);
    boundaryHostRef.current = host;
    boundaryTargetRef.current = target;
    setBoundaryHost(host);
  }, [clearBoundary]);

  useEffect(() => {
    clearSaveTimer();
    clearBoundary();
    if (statusTimerRef.current !== null) window.clearTimeout(statusTimerRef.current);
    setStatusMessage("");
    restorePhaseRef.current = "pending";
    writeReadyRef.current = false;
    userInteractedRef.current = false;
    nativeRestorationRef.current = false;
    restoredReadingRef.current = null;
    latestRecordRef.current = null;

    if (!active) {
      readerPathnameRef.current = "";
      trackingEnabledRef.current = false;
      recordRef.current = null;
      setTrackingEnabledState(false);
      setHasCurrentRecord(false);
      setPreferenceReady(true);
      restorePhaseRef.current = "done";
      return;
    }

    readerPathnameRef.current = window.location.pathname;
    const decisionKey = `${slug}\0${revision}\0${navigationTarget()}`;
    if (routeDecisionRef.current?.key !== decisionKey) {
      routeDecisionRef.current = { key: decisionKey, native: claimNativeNavigationTicket() };
    }
    nativeRestorationRef.current = routeDecisionRef.current.native;
    const enabled = readReadingProgressEnabled();
    const record = readReadingProgress(slug);
    trackingEnabledRef.current = enabled;
    recordRef.current = record;
    setTrackingEnabledState(enabled);
    setHasCurrentRecord(record !== null);
    setPreferenceReady(true);
  }, [active, clearBoundary, clearSaveTimer, revision, slug]);

  useEffect(() => {
    if (!active) return;
    const mountedPathname = window.location.pathname;
    const markUserInteraction = () => {
      userInteractedRef.current = true;
      restoredReadingRef.current = null;
      if (restorePhaseRef.current === "pending") {
        restorePhaseRef.current = "done";
        writeReadyRef.current = trackingEnabledRef.current;
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (NAVIGATION_KEYS.has(event.key)) markUserInteraction();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      nativeRestorationRef.current = true;
      restoredReadingRef.current = null;
      restorePhaseRef.current = "done";
      writeReadyRef.current = trackingEnabledRef.current;
    };
    const onPopState = () => {
      if (window.location.pathname === mountedPathname) claimNativeNavigationTicket();
      nativeRestorationRef.current = true;
      restoredReadingRef.current = null;
      restorePhaseRef.current = "done";
      writeReadyRef.current = trackingEnabledRef.current;
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === READING_PROGRESS_ENABLED_KEY) {
        const enabled = event.newValue !== "false";
        trackingEnabledRef.current = enabled;
        writeReadyRef.current = enabled && restorePhaseRef.current === "done";
        setTrackingEnabledState(enabled);
        if (!enabled) {
          clearSaveTimer();
          latestRecordRef.current = null;
          restoredReadingRef.current = null;
          userInteractedRef.current = false;
        } else {
          userInteractedRef.current = false;
        }
      } else if (event.key === readingProgressKey(slug)) {
        const record = readReadingProgress(slug);
        if (!record) {
          recordRef.current = null;
          clearSaveTimer();
          latestRecordRef.current = null;
          restoredReadingRef.current = null;
          userInteractedRef.current = false;
          clearBoundary();
        } else if (remoteReadingProgressSupersedesPending(record, latestRecordRef.current)) {
          clearSaveTimer();
          recordRef.current = record;
          latestRecordRef.current = null;
          restoredReadingRef.current = null;
          userInteractedRef.current = false;
        }
        setHasCurrentRecord(record !== null);
      }
    };

    window.addEventListener("wheel", markUserInteraction, { passive: true });
    window.addEventListener("touchstart", markUserInteraction, { passive: true });
    window.addEventListener("pointerdown", markUserInteraction, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pagehide", flush);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("wheel", markUserInteraction);
      window.removeEventListener("touchstart", markUserInteraction);
      window.removeEventListener("pointerdown", markUserInteraction);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      flush();
    };
  }, [active, clearBoundary, clearSaveTimer, flush, slug]);

  useEffect(() => {
    if (!active || !preferenceReady || !measurement || measurement.resource !== slug || measurement.revision !== revision || restorePhaseRef.current !== "pending") return;
    if (!trackingEnabledRef.current || !recordRef.current) {
      restorePhaseRef.current = "done";
      writeReadyRef.current = trackingEnabledRef.current;
      return;
    }

    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (restorePhaseRef.current !== "pending") return;
        const browserHasPosition = window.scrollY > 8;
        if (window.location.hash || nativeRestorationRef.current || browserHasPosition || userInteractedRef.current) {
          restorePhaseRef.current = "done";
          writeReadyRef.current = trackingEnabledRef.current;
          return;
        }
        const record = recordRef.current;
        if (!record) return;
        const result = resolveRestore(record, revision, measurement, viewportAnchor);
        restorePhaseRef.current = "done";
        writeReadyRef.current = trackingEnabledRef.current;
        if (!result) return;

        if (Math.abs(window.scrollY - result.top) > 1) {
          window.scrollTo({ top: result.top, behavior: "auto" });
        }
        installBoundary(result.boundaryAfter);
        restoredReadingRef.current = { record, restoredAt: performance.now(), measurement };
        if (result.appended) showStatus(messages.appended);
        else if (result.confidence === "approximate") showStatus(messages.approximate);
        else showStatus(messages.restored);
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [active, installBoundary, measurement, messages, preferenceReady, revision, showStatus, slug, viewportAnchor]);

  useEffect(() => {
    const restored = restoredReadingRef.current;
    if (!active || !measurement || measurement.resource !== slug || measurement.revision !== revision || !restored || restored.measurement === measurement || userInteractedRef.current) return;
    if (performance.now() - restored.restoredAt > CORRECTION_WINDOW_MS) return;
    restored.measurement = measurement;
    const result = resolveRestore(restored.record, revision, measurement, viewportAnchor);
    if (!result) return;
    if (Math.abs(window.scrollY - result.top) > 1) {
      window.scrollTo({ top: result.top, behavior: "auto" });
    }
    installBoundary(result.boundaryAfter);
  }, [active, installBoundary, measurement, revision, slug, viewportAnchor]);

  const observePosition = useCallback((currentLine: number) => {
    const currentMeasurement = measurementRef.current;
    if (!active || !trackingEnabledRef.current || !writeReadyRef.current || !userInteractedRef.current || !currentMeasurement) return;
    if (window.location.pathname !== readerPathnameRef.current || !currentMeasurement.body.isConnected) return;
    if (currentLine < 1 || currentMeasurement.lines.length === 0 || currentMeasurement.blocks.length === 0) return;

    const globalLineIndex = Math.min(currentMeasurement.lines.length - 1, currentLine - 1);
    const location = currentMeasurement.lines[globalLineIndex];
    const block = currentMeasurement.blocks[location.blockIndex];
    if (!block) return;
    const previous = currentMeasurement.blocks[location.blockIndex - 1];
    const next = currentMeasurement.blocks[location.blockIndex + 1];
    const bodyProgress = currentMeasurement.lines.length <= 1
      ? 0
      : globalLineIndex / (currentMeasurement.lines.length - 1);
    const lineProgress = block.centers.length <= 1 ? 0 : location.lineIndex / (block.centers.length - 1);
    const sectionBlocks = currentMeasurement.blocks.filter((item) => item.headingId === block.headingId);
    const sectionLineCount = sectionBlocks.reduce((count, item) => count + item.centers.length, 0);
    const sectionLinesBefore = sectionBlocks
      .slice(0, Math.max(0, sectionBlocks.indexOf(block)))
      .reduce((count, item) => count + item.centers.length, 0);
    const sectionProgress = sectionLineCount <= 1
      ? 0
      : (sectionLinesBefore + location.lineIndex) / (sectionLineCount - 1);
    const endMark = currentMeasurement.body
      .closest<HTMLElement>(".reading-edition-flow")
      ?.querySelector<HTMLElement>("[data-reading-end]");
    const crossedEnd = !!endMark && endMark.getBoundingClientRect().top <= viewportAnchor();
    const previousRecord = latestRecordRef.current ?? recordRef.current;
    const sameRevisionCompleted = previousRecord?.revision === revision && previousRecord.status === "completed";
    const completed = crossedEnd || sameRevisionCompleted;
    const now = Math.max(Date.now(), (previousRecord?.savedAt ?? 0) + 1);
    const sameRevision = previousRecord?.revision === revision;
    const lastBlock = currentMeasurement.blocks.at(-1);

    const record: ReadingProgressRecord = {
      schema: 1,
      resource: `post:${slug}`,
      revision,
      savedAt: now,
      status: completed ? "completed" : "reading",
      anchor: {
        fingerprint: block.fingerprint,
        previousFingerprint: previous?.fingerprint ?? null,
        nextFingerprint: next?.fingerprint ?? null,
        headingId: block.headingId,
        blockIndex: location.blockIndex,
        blockLineProgress: clamp(lineProgress),
        sectionProgress: clamp(sectionProgress),
        bodyProgress: completed ? 1 : bodyProgress,
        line: Math.max(1, Math.min(currentMeasurement.lineCenters.length, currentLine)),
        lineCount: currentMeasurement.lineCenters.length,
      },
      furthestProgress: sameRevision
        ? Math.max(previousRecord?.furthestProgress ?? 0, completed ? 1 : bodyProgress)
        : completed ? 1 : bodyProgress,
      ...(completed ? {
        completedAt: sameRevisionCompleted ? previousRecord?.completedAt ?? now : now,
        endFingerprint: lastBlock?.fingerprint,
      } : {}),
    };
    latestRecordRef.current = record;
    scheduleFlush();
  }, [active, revision, scheduleFlush, slug, viewportAnchor]);

  const setTrackingEnabled = useCallback((enabled: boolean) => {
    trackingEnabledRef.current = enabled;
    restoredReadingRef.current = null;
    setTrackingEnabledState(enabled);
    const preferenceStored = writeReadingProgressEnabled(enabled);
    if (!enabled) {
      clearSaveTimer();
      latestRecordRef.current = null;
      userInteractedRef.current = false;
      showStatus(preferenceStored
        ? messages.disabled
        : messages.disabledNotStored);
    } else {
      restorePhaseRef.current = "done";
      writeReadyRef.current = true;
      userInteractedRef.current = false;
      showStatus(preferenceStored
        ? messages.enabled
        : messages.enabledNotStored);
    }
  }, [clearSaveTimer, messages, showStatus]);

  const clearCurrent = useCallback(() => {
    clearSaveTimer();
    if (!removeReadingProgress(slug)) {
      showStatus(messages.clearCurrentFailed);
      return;
    }
    recordRef.current = null;
    latestRecordRef.current = null;
    restoredReadingRef.current = null;
    userInteractedRef.current = false;
    setHasCurrentRecord(false);
    clearBoundary();
    showStatus(messages.clearCurrentDone);
  }, [clearBoundary, clearSaveTimer, messages, showStatus, slug]);

  const clearAll = useCallback(() => {
    clearSaveTimer();
    if (removeAllReadingProgress() === null) {
      showStatus(messages.clearAllFailed);
      return;
    }
    recordRef.current = null;
    latestRecordRef.current = null;
    restoredReadingRef.current = null;
    userInteractedRef.current = false;
    setHasCurrentRecord(false);
    clearBoundary();
    showStatus(messages.clearAllDone);
  }, [clearBoundary, clearSaveTimer, messages, showStatus]);

  useEffect(() => () => {
    clearSaveTimer();
    if (statusTimerRef.current !== null) window.clearTimeout(statusTimerRef.current);
    boundaryHostRef.current?.remove();
  }, [clearSaveTimer]);

  return {
    trackingEnabled,
    hasCurrentRecord,
    statusMessage,
    boundaryHost,
    observePosition,
    setTrackingEnabled,
    clearCurrent,
    clearAll,
  };
}
