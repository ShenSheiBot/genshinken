export const translationReferenceUi = {
  en: {
    notes: "Notes",
    sources: "Sources",
    note: "Note",
    source: "Source",
    previous: "Previous",
    next: "Next",
    origin: "Return to text",
    close: "Close notes",
    position: (current: number, total: number) => `${current} of ${total}`,
  },
  ja: {
    notes: "注",
    sources: "文献",
    note: "注",
    source: "文献",
    previous: "前へ",
    next: "次へ",
    origin: "本文位置",
    close: "注を閉じる",
    position: (current: number, total: number) => `${current} / ${total}`,
  },
} as const;
