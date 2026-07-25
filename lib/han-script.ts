export type HanScript = "hans" | "hant";

export const DEFAULT_HAN_SCRIPT: HanScript = "hans";
export const HAN_SCRIPT_STORAGE_KEY = "ub_chinese_script";

export function isHanScript(value: unknown): value is HanScript {
  return value === "hans" || value === "hant";
}

export function hanScriptLanguageTag(script: HanScript): "zh-Hans" | "zh-Hant" {
  return script === "hant" ? "zh-Hant" : "zh-Hans";
}

export function browserHanScript(
  languages: readonly string[],
  fallback: HanScript = DEFAULT_HAN_SCRIPT
): HanScript {
  for (const language of languages) {
    const parts = language.trim().toLowerCase().split("-").filter(Boolean);
    if (parts[0] !== "zh") continue;
    if (parts.includes("hant")) return "hant";
    if (parts.includes("hans")) return "hans";

    const region = parts.find((part, index) =>
      index > 0 && (/^[a-z]{2}$/u.test(part) || /^\d{3}$/u.test(part))
    );
    if (region === "tw" || region === "hk" || region === "mo") return "hant";
    if (region === "cn" || region === "sg") return "hans";
  }
  return fallback;
}

export function preferredHanScript(
  saved: unknown,
  languages: readonly string[],
  fallback: HanScript = DEFAULT_HAN_SCRIPT
): HanScript {
  return isHanScript(saved) ? saved : browserHanScript(languages, fallback);
}
