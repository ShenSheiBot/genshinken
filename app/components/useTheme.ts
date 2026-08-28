"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const DEFAULT_THEME: Theme = "light";
const THEME_STORAGE_KEY = "roof_theme";
const THEME_CHANGE_EVENT = "roof:theme-change";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

function currentTheme(): Theme {
  if (typeof document === "undefined") return DEFAULT_THEME;
  return isTheme(document.documentElement.dataset.theme)
    ? document.documentElement.dataset.theme
    : DEFAULT_THEME;
}

function updateThemeChrome(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute("content", theme === "dark" ? "#060605" : "#e8e7e3");
  });
}

export function setTheme(theme: Theme, { persist = true, notify = true } = {}): Theme {
  updateThemeChrome(theme);
  if (persist) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The theme remains usable for this visit when storage is restricted.
    }
  }
  if (notify) window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }));
  return theme;
}

export function toggleTheme(): Theme {
  return setTheme(currentTheme() === "dark" ? "light" : "dark");
}

function subscribe(onStoreChange: () => void): () => void {
  const onThemeChange = () => onStoreChange();
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    updateThemeChrome(isTheme(event.newValue) ? event.newValue : DEFAULT_THEME);
    onStoreChange();
  };

  window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme, () => DEFAULT_THEME);
}
