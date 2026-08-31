export type SearchCreditKind = "author" | "contributor";

export function normalizeSearchEntity(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/^[@#]+/u, "")
    .replace(/^["'“‘]+|["'”’]+$/gu, "")
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("zh-CN");
}

/**
 * A collision-free word that Pagefind can index without applying CJK
 * segmentation. It is derived from the public credit name, so the browser can
 * resolve an exact name without shipping a second contributor catalogue.
 */
export function searchCreditToken(value: string, kind: SearchCreditKind): string {
  const bytes = new TextEncoder().encode(normalizeSearchEntity(value));
  const alphabet = "abcdefghijklmnop";
  const encoded = Array.from(bytes, (byte) => (
    `${alphabet[byte >> 4]}${alphabet[byte & 15]}`
  )).join("");
  return `${kind === "author" ? "ra" : "rc"}${encoded}`;
}
