/**
 * parse5-based helpers to post-process the site's rendered HTML into
 * EPUB3-compatible XHTML. parse5 is already a site dependency; no second
 * markup pipeline is introduced here — input HTML always comes from
 * lib/markdown.ts.
 */
import { parseFragment } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

export type XhtmlNode = DefaultTreeAdapterMap["childNode"] | DefaultTreeAdapterMap["documentFragment"];
export type XhtmlElement = DefaultTreeAdapterMap["element"];
export type XhtmlFragment = DefaultTreeAdapterMap["documentFragment"];
type XhtmlTextNode = DefaultTreeAdapterMap["textNode"];

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

export function parseHtmlFragment(html: string): XhtmlFragment {
  return parseFragment(html);
}

export function isElement(node: XhtmlNode): node is XhtmlElement {
  return "tagName" in node && typeof node.tagName === "string";
}

function isTextNode(node: XhtmlNode): node is XhtmlTextNode {
  return node.nodeName === "#text";
}

function childNodes(node: XhtmlNode): XhtmlNode[] {
  return "childNodes" in node ? (node.childNodes as XhtmlNode[]) : [];
}

/** Depth-first walk; the visitor may return false to skip a subtree. */
export function walkElements(
  root: XhtmlNode,
  visit: (element: XhtmlElement) => boolean | void
): void {
  for (const child of childNodes(root)) {
    if (isElement(child)) {
      if (visit(child) === false) continue;
      walkElements(child, visit);
    } else {
      walkElements(child, visit);
    }
  }
}

export function getAttribute(element: XhtmlElement, name: string): string | undefined {
  return element.attrs.find((attribute) => attributeName(attribute) === name)?.value;
}

export function setAttribute(element: XhtmlElement, name: string, value: string): void {
  const existing = element.attrs.find((attribute) => attributeName(attribute) === name);
  if (existing) existing.value = value;
  else element.attrs.push({ name, value });
}

export function removeAttribute(element: XhtmlElement, name: string): void {
  element.attrs = element.attrs.filter((attribute) => attributeName(attribute) !== name);
}

export function hasClass(element: XhtmlElement, className: string): boolean {
  const value = getAttribute(element, "class");
  return Boolean(value) && String(value).split(/\s+/u).includes(className);
}

export function findElements(
  root: XhtmlNode,
  predicate: (element: XhtmlElement) => boolean
): XhtmlElement[] {
  const found: XhtmlElement[] = [];
  walkElements(root, (element) => {
    if (predicate(element)) found.push(element);
  });
  return found;
}

export function replaceChild(parent: XhtmlNode, current: XhtmlNode, next: XhtmlNode): void {
  const children = childNodes(parent);
  const index = children.indexOf(current);
  if (index < 0) throw new Error("[ebook] cannot replace a node that is not a child of its parent");
  children[index] = next;
  if ("parentNode" in next) {
    (next as { parentNode: unknown }).parentNode = parent;
  }
}

export function removeChild(parent: XhtmlNode, current: XhtmlNode): void {
  const children = childNodes(parent);
  const index = children.indexOf(current);
  if (index >= 0) children.splice(index, 1);
}

export function textContent(node: XhtmlNode): string {
  if (isTextNode(node)) return node.value;
  return childNodes(node).map((child) => textContent(child)).join("");
}

export function escapeXmlText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function escapeXmlAttribute(value: string): string {
  return escapeXmlText(value).replaceAll('"', "&quot;");
}

type XhtmlAttribute = XhtmlElement["attrs"][number];

function attributeName(attribute: XhtmlAttribute): string {
  return attribute.prefix ? `${attribute.prefix}:${attribute.name}` : attribute.name;
}

function serializeAttributes(element: XhtmlElement): string {
  return element.attrs
    .map((attribute) => ` ${attributeName(attribute)}="${escapeXmlAttribute(attribute.value)}"`)
    .join("");
}

/**
 * Serialize a parse5 tree as well-formed XML suitable for EPUB3 XHTML
 * content documents. Comments are dropped; raw-text elements never occur
 * because rendered content is sanitized upstream.
 */
export function serializeXhtml(node: XhtmlNode): string {
  if (isTextNode(node)) return escapeXmlText(node.value);
  if (node.nodeName === "#comment") return "";
  if (!isElement(node)) {
    return childNodes(node).map((child) => serializeXhtml(child)).join("");
  }
  const attributes = serializeAttributes(node);
  const children = childNodes(node).map((child) => serializeXhtml(child)).join("");
  if (VOID_ELEMENTS.has(node.tagName) && children === "") {
    return `<${node.tagName}${attributes} />`;
  }
  return `<${node.tagName}${attributes}>${children}</${node.tagName}>`;
}

export function serializeFragmentChildren(fragment: XhtmlFragment): string {
  return fragment.childNodes.map((child) => serializeXhtml(child as XhtmlNode)).join("");
}
