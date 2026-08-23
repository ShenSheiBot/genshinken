import sanitizeHtml from "sanitize-html";
import {
  isR2AudioUrl,
  isR2VideoPosterUrl,
  isR2VideoUrl,
  parseArticleVideoSources,
} from "./article-media-contract-runtime.mjs";

const MEDIA_MATERIAL_TAGS = [
  "a",
  "abbr",
  "annotation",
  "audio",
  "b",
  "blockquote",
  "br",
  "caption",
  "code",
  "col",
  "colgroup",
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
  "input",
  "ins",
  "kbd",
  "li",
  "math",
  "mark",
  "menclose",
  "mfrac",
  "mi",
  "mmultiscripts",
  "mn",
  "mo",
  "mover",
  "mpadded",
  "mphantom",
  "mprescripts",
  "mroot",
  "mrow",
  "mspace",
  "msqrt",
  "msub",
  "msubsup",
  "msup",
  "mtable",
  "mtd",
  "mtext",
  "mtr",
  "munder",
  "munderover",
  "none",
  "ol",
  "p",
  "path",
  "pre",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "section",
  "semantics",
  "small",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "svg",
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
  "video",
  "wbr",
];

const SAFE_KATEX_LENGTH = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:em|ex|px|%)?$/u;
const SAFE_RASTER_DATA_IMAGE = /^data:image\/(?:gif|jpeg|png|webp);base64,[a-z0-9+/=\s]+$/iu;
const SOURCE_PAGE_COMMENT = /<!--\s*p\.(\d{3})\s*-->/gu;
const SOURCE_PAGE_SENTINEL =
  /<span data-source-page-comment="(\d{3})"><\/span>/gu;

function validVideoSourceSet(raw: string | undefined, primary: string): boolean {
  if (!raw) return true;
  const sources = parseArticleVideoSources(raw);
  return sources.length > 0 && sources[0].src === primary;
}

/**
 * Sanitize Markdown-derived HTML before it crosses a dangerouslySetInnerHTML
 * boundary. KaTeX's inert MathML/SVG and numeric layout styles are retained,
 * while executable elements, event attributes and unsafe URL schemes are not.
 */
export function sanitizePublicContentHtml(html: string): string {
  const protectedHtml = html.replace(
    SOURCE_PAGE_COMMENT,
    (_comment, page: string) =>
      `<span data-source-page-comment="${page}"></span>`
  );
  const clean = sanitizeHtml(protectedHtml, {
    allowedTags: MEDIA_MATERIAL_TAGS,
    allowedAttributes: {
      "*": [
        "id",
        "class",
        "lang",
        "dir",
        "role",
        "title",
        "tabindex",
        "aria-*",
        "data-*",
      ],
      a: ["href", "name", "target", "rel", "download"],
      annotation: ["encoding"],
      audio: ["src", "controls", "preload"],
      blockquote: ["cite"],
      col: ["span", "width"],
      details: ["open"],
      img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
      input: ["type", "checked", "disabled"],
      li: ["value"],
      math: ["xmlns", "display"],
      menclose: ["notation"],
      mo: ["accent", "fence", "lspace", "rspace", "separator", "stretchy", "symmetric"],
      mpadded: ["depth", "height", "lspace", "voffset", "width"],
      mspace: ["depth", "height", "width"],
      mtable: ["columnalign", "columnspacing", "rowalign", "rowspacing"],
      mtd: ["columnalign", "columnspan", "rowalign", "rowspan"],
      mtext: ["mathvariant"],
      ol: ["start", "reversed", "type"],
      path: ["d"],
      span: ["style"],
      // htmlparser2 normalizes SVG attribute names before allowlist matching;
      // browsers restore their canonical casing when parsing SVG in HTML.
      svg: ["xmlns", "width", "height", "viewbox", "preserveaspectratio"],
      td: ["colspan", "rowspan", "headers", "align"],
      th: ["colspan", "rowspan", "headers", "scope", "align"],
      time: ["datetime"],
      video: ["src", "poster", "controls", "preload", "playsinline", "width", "height"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    allowedStyles: {
      span: {
        height: [SAFE_KATEX_LENGTH],
        "margin-right": [SAFE_KATEX_LENGTH],
        "min-width": [SAFE_KATEX_LENGTH],
        "padding-left": [SAFE_KATEX_LENGTH],
        top: [SAFE_KATEX_LENGTH],
        "vertical-align": [SAFE_KATEX_LENGTH],
        width: [SAFE_KATEX_LENGTH],
      },
    },
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    enforceHtmlBoundary: true,
    nonTextTags: [
      "script",
      "style",
      "textarea",
      "option",
      "iframe",
      "object",
      "template",
      "noscript",
    ],
    exclusiveFilter: (frame) => {
      const classes = new Set((frame.attribs.class || "").split(/\s+/u).filter(Boolean));
      if (frame.tag === "audio") {
        return !(
          classes.has("article-audio-native")
          && frame.attribs["data-roof-audio"] === "r2"
          && /^\d+$/u.test(frame.attribs["data-roof-audio-duration"] || "")
          && isR2AudioUrl(frame.attribs.src || "")
        );
      }
      if (frame.tag !== "video") return false;
      const source = frame.attribs.src || "";
      const poster = frame.attribs.poster || "";
      return !(
        classes.has("article-video-player") &&
        frame.attribs["data-roof-video"] === "r2" &&
        isR2VideoUrl(source) &&
        isR2VideoPosterUrl(poster) &&
        validVideoSourceSet(frame.attribs["data-roof-video-sources"], source)
      );
    },
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
      img: (tagName, attributes) => {
        const src = attributes.src || "";
        if (!/^data:/iu.test(src) || SAFE_RASTER_DATA_IMAGE.test(src)) {
          return { tagName, attribs: attributes };
        }
        const safeAttributes = { ...attributes };
        delete safeAttributes.src;
        return { tagName, attribs: safeAttributes };
      },
      input: (tagName, attributes) => ({
        tagName,
        attribs: {
          ...(attributes.checked === undefined ? {} : { checked: "" }),
          disabled: "",
          type: "checkbox",
        },
      }),
    },
  });
  return clean.replace(
    SOURCE_PAGE_SENTINEL,
    (_sentinel, page: string) => `<!-- p.${page} -->`
  );
}

/** Media records and topic introductions share the same public-content boundary. */
export const sanitizeMediaMaterial = sanitizePublicContentHtml;
