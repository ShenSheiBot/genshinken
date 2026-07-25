import matter from "gray-matter";

const STANDARD_OPENING = /^---\r?\n/u;
const TYPED_OPENING = /^---[^\r\n]+\r?(?:\n|$)/u;

const yamlOnlyOptions = {
  language: "yaml",
  engines: {
    js: {
      parse() {
        throw new Error("JavaScript front matter is not allowed");
      },
    },
    javascript: {
      parse() {
        throw new Error("JavaScript front matter is not allowed");
      },
    },
  },
};

function withoutBom(value) {
  return String(value).replace(/^\uFEFF/u, "");
}

/**
 * Parse a complete Markdown document whose front matter must use the exact
 * `---` YAML delimiter. Typed delimiters such as `---js` are rejected before
 * gray-matter can select an executable parser.
 */
export function parseYamlFrontMatter(source, { required = true } = {}) {
  const normalized = withoutBom(source);
  if (TYPED_OPENING.test(normalized)) {
    throw new Error("front matter must use the exact YAML delimiter ---");
  }
  if (!STANDARD_OPENING.test(normalized)) {
    if (required) throw new Error("missing YAML front matter opening delimiter ---");
    return {
      content: normalized,
      data: {},
      matter: "",
      orig: normalized,
    };
  }
  return matter(normalized, yamlOnlyOptions);
}

/**
 * Preserve the repository's legacy header-with-closing-delimiter format while
 * still routing the synthesized document through the same YAML-only parser.
 */
export function parseLegacyYamlFrontMatter(header, content = "") {
  return parseYamlFrontMatter(`---\n${withoutBom(header)}\n---\n${content}`);
}
