import { parseFragment, serialize, defaultTreeAdapter, html as htmlConstants } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

const japaneseWords = new Intl.Segmenter("ja-JP", { granularity: "word" });

/** ICU can split unfamiliar loanwords; uninterrupted katakana stays one word. */
export function japaneseReaderWords(text: string): { segment: string; isWordLike?: boolean }[] {
  return text.split(/(第[0-9０-９]+(?:[〜～–-][0-9０-９]+)?話|[\p{Script=Katakana}ー]+)/gu).filter(Boolean).flatMap<{ segment: string; isWordLike?: boolean }>((part) =>
    /^(?:第[0-9０-９]+(?:[〜～–-][0-9０-９]+)?話|[\p{Script=Katakana}ー]+)$/u.test(part)
      ? [{ segment: part, isWordLike: true }]
      : Array.from(japaneseWords.segment(part)));
}

/** Add breakable word boxes only to Japanese headings, preserving inline markup. */
export function groupJapaneseHeadingWords(html: string, language?: string): string {
  if (!/^ja(?:-|$)/i.test(language ?? "")) return html;
  const fragment = parseFragment(html);
  type Parent = DefaultTreeAdapterMap["element"] | DefaultTreeAdapterMap["documentFragment"];
  function visit(parent: Parent, heading = false) {
    const children: DefaultTreeAdapterMap["childNode"][] = [];
    for (const node of parent.childNodes) {
      if ("tagName" in node) {
        // Equations, code and ruby annotations keep their own layout semantics.
        if (!["code", "pre", "math", "svg", "ruby"].includes(node.tagName)
          && !node.attrs.some(({ name, value }) => name === "data-reader-heading-word"
            || (name === "class" && /\bkatex\b/.test(value)))) {
          visit(node, heading || /^h[1-6]$/.test(node.tagName));
        }
      }
      if (heading && node.nodeName === "#text" && "value" in node) {
        for (const { segment, isWordLike } of japaneseReaderWords(node.value)) {
          if (isWordLike) {
            const word = defaultTreeAdapter.createElement("span", htmlConstants.NS.HTML, [
              { name: "data-reader-heading-word", value: "" },
            ]);
            defaultTreeAdapter.insertText(word, segment);
            word.parentNode = parent;
            children.push(word);
          } else {
            children.push({ nodeName: "#text", value: segment, parentNode: parent });
          }
        }
      } else children.push(node);
    }
    parent.childNodes = children;
  }
  visit(fragment);
  return serialize(fragment);
}
