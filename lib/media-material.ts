import sanitizeHtml from "sanitize-html";

const MEDIA_MATERIAL_TAGS = [
  "a",
  "abbr",
  "b",
  "blockquote",
  "br",
  "code",
  "dd",
  "del",
  "details",
  "div",
  "dl",
  "dt",
  "em",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "ins",
  "kbd",
  "li",
  "mark",
  "ol",
  "p",
  "pre",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "section",
  "small",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "u",
  "ul",
  "wbr",
];

/**
 * Media detail pages are link-and-description records, never playback surfaces.
 * Keep a conservative article allowlist and discard active content, event handlers,
 * unsafe URL schemes and every playback/embed element before injecting the HTML.
 */
/** Sanitize markdown-derived HTML before it crosses a dangerouslySetInnerHTML boundary. */
export function sanitizePublicContentHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: MEDIA_MATERIAL_TAGS,
    allowedAttributes: {
      "*": ["id", "class", "lang", "dir", "role", "aria-*", "data-*"],
      a: ["href", "name", "target", "rel", "title"],
      blockquote: ["cite"],
      img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
      ol: ["start", "reversed", "type"],
      td: ["colspan", "rowspan", "headers"],
      th: ["colspan", "rowspan", "headers", "scope"],
      time: ["datetime"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    enforceHtmlBoundary: true,
    nonTextTags: ["script", "style", "textarea", "option", "iframe", "video", "audio", "object"],
    transformTags: {
      a: (tagName, attributes) => {
        if (attributes.target !== "_blank") return { tagName, attribs: attributes };
        const rel = new Set((attributes.rel || "").split(/\s+/).filter(Boolean));
        rel.add("noopener");
        rel.add("noreferrer");
        return {
          tagName,
          attribs: { ...attributes, rel: [...rel].join(" ") },
        };
      },
    },
  });
}

/** Media records and topic introductions share the same public-content boundary. */
export const sanitizeMediaMaterial = sanitizePublicContentHtml;
