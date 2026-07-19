import { extname } from "node:path";
import { parse as parseJavaScript } from "@babel/parser";
import { parseFragment as parseHtml } from "parse5";
import { getEmojiMetadata, normalizeEmoji, tokenizeEmojiText } from "emoji-styles";
import { getRule } from "./rules";
import type { AuditFinding, AuditRuleId, AuditSeverity } from "../types";

interface AstNode {
  type: string;
  start?: number | null;
  end?: number | null;
  name?: unknown;
  value?: unknown;
  extra?: unknown;
  [key: string]: unknown;
}

interface HtmlLocation {
  startOffset: number;
  endOffset: number;
  startTag?: HtmlLocation;
  endTag?: HtmlLocation;
  attrs?: Record<string, HtmlLocation>;
}

interface HtmlNode {
  nodeName: string;
  tagName?: string;
  value?: string;
  attrs?: Array<{ name: string; value: string }>;
  childNodes?: HtmlNode[];
  sourceCodeLocation?: HtmlLocation | null;
}

export interface ScanSourceOptions {
  displayPath: string;
  absolutePath: string;
  source: string;
  knownProviders: ReadonlySet<string>;
  allowRemoteAssets: boolean;
  severity(ruleId: AuditRuleId): AuditSeverity | "off";
}

const SKIPPED_TEXT_ELEMENTS = new Set(["script", "style", "textarea", "code", "pre"]);
const CRITICAL_FILE_PATTERN = /(?:^|[/\\])(?:__snapshots__|visual|screenshots?)(?:[/\\]|$)|\.(?:snap|stories|story|spec|test)\.[cm]?[jt]sx?$/i;
const PROVIDER_URL_PATTERN = /(?:cdn\.jsdelivr\.net\/gh\/(?:microsoft\/fluentui-emoji|googlefonts\/noto-emoji|jdecked\/twemoji|SerenityOS\/serenity)|raw\.githubusercontent\.com\/(?:microsoft\/fluentui-emoji|googlefonts\/noto-emoji|jdecked\/twemoji|SerenityOS\/serenity)|media\.githubusercontent\.com\/media\/microsoft\/fluentui-emoji-animated|unpkg\.com\/(?:twemoji|emoji-datasource))/i;
const REMOTE_URL_PATTERN = /^https?:\/\//i;
const CUSTOM_EMOJI_PATH_PATTERN = /(?:^|[/_.-])emojis?(?:[/_.-]|$)|(?:^|[/_.-])reactions?(?:[/_.-]|$)/i;
const PROVIDER_MEMBER_IDS: Record<string, string> = {
  fluentAnimated: "fluent-animated",
  fluent3d: "fluent-3d",
  fluentColor: "fluent-color",
  fluentFlat: "fluent-flat",
  noto: "noto",
  notoAnimated: "noto-animated",
  serenityOS: "serenityos",
  twemoji: "twemoji",
  native: "native",
};

export function scanSource(options: ScanSourceOptions): AuditFinding[] {
  const extension = extname(options.absolutePath).toLowerCase();
  if (extension === ".html") return scanHtml(options);
  return scanJavaScript(options, extension);
}

function scanJavaScript(options: ScanSourceOptions, extension: string): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const plugins: Array<"jsx" | "typescript" | "decorators-legacy" | "importAttributes"> = ["importAttributes"];
  if ([".jsx", ".tsx"].includes(extension)) plugins.push("jsx");
  if ([".ts", ".tsx"].includes(extension)) plugins.push("typescript", "decorators-legacy");
  let root: AstNode;
  try {
    root = parseJavaScript(options.source, {
      sourceType: "unambiguous",
      errorRecovery: true,
      allowAwaitOutsideFunction: true,
      plugins,
    }) as unknown as AstNode;
  } catch (error) {
    return [finding(options, "emoji-styles/parser/invalid-source", 0, 1, error instanceof Error ? error.message : String(error))].filter(Boolean) as AuditFinding[];
  }
  const parseErrors = Array.isArray(root.errors) ? root.errors as Array<{ message?: string; pos?: number }> : [];
  for (const error of parseErrors) {
    push(findings, finding(options, "emoji-styles/parser/invalid-source", error.pos ?? 0, (error.pos ?? 0) + 1, error.message ?? "Source contains a syntax error."));
  }

  walkAst(root, null, "", (node, parent, key, ancestors) => {
    if (node.type === "JSXOpeningElement") inspectJsxOpening(node, options, findings);
    if (node.type === "JSXElement") inspectJsxControl(node, options, findings);

    const text = sourceText(node);
    if (text === null || shouldSkipStringNode(node, parent, key, ancestors)) return;
    inspectText(text, nodeStart(node), nodeEnd(node), options, findings, true, node.type === "JSXText" ? "react" : null);
    inspectUrl(text, nodeStart(node), nodeEnd(node), options, findings);
  });
  return dedupe(findings);
}

function inspectJsxOpening(node: AstNode, options: ScanSourceOptions, findings: AuditFinding[]) {
  const name = jsxName(node.name);
  const attributes = jsxAttributes(node);
  const provider = attributes.get("provider")?.value;
  if (provider && !options.knownProviders.has(provider)) {
    push(findings, finding(options, "emoji-styles/provider/unknown", attributes.get("provider")!.start, attributes.get("provider")!.end, `Unknown emoji provider \"${provider}\".`));
  }
  if (provider === "native" && isCriticalPath(options.displayPath)) {
    push(findings, finding(options, "emoji-styles/determinism/native-critical-ui", nodeStart(node), nodeEnd(node), "Native emoji provider used in a snapshot or visual-test source."));
  }
  if (name.toLowerCase() !== "img") return;
  const source = attributes.get("src")?.value;
  if (!source || !isEmojiAssetSource(source)) return;
  if (!attributes.has("alt")) {
    push(findings, finding(options, "emoji-styles/accessibility/missing-label", nodeStart(node), nodeEnd(node), "Emoji image is missing a meaningful alt label.", undefined, "Add an explicit CLDR or product-specific label."));
  }
  if (!PROVIDER_URL_PATTERN.test(source)) {
    push(findings, finding(options, "emoji-styles/provider/custom-asset-bypass", attributes.get("src")!.start, attributes.get("src")!.end, "Custom emoji image bypasses the configured provider registry."));
  }
}

function inspectJsxControl(node: AstNode, options: ScanSourceOptions, findings: AuditFinding[]) {
  const opening = node.openingElement as AstNode | undefined;
  if (!opening || jsxName(opening.name).toLowerCase() !== "button") return;
  const attributes = jsxAttributes(opening);
  if (attributes.has("aria-label") || attributes.has("aria-labelledby") || attributes.has("title")) return;
  const children = Array.isArray(node.children) ? node.children as AstNode[] : [];
  const childText = children.map(jsxStaticChildText).join("");
  const emoji = emojiIn(childText);
  const visibleText = childText.replace(/\s/gu, "");
  if (!emoji.length || visibleText !== emoji.join("")) return;
  const labels = emoji.map((value) => getEmojiMetadata(value)?.label ?? value).join(", ");
  const insertion = nodeEnd(opening.name as AstNode);
  push(findings, finding(options, "emoji-styles/accessibility/missing-label", nodeStart(opening), nodeEnd(opening), "Emoji-only button has no accessible label.", emoji[0], `Add aria-label=\"${labels}\".`, {
    description: `Add accessible label \"${labels}\" to the button`, safety: "safe", edits: [{ start: insertion, end: insertion, text: ` aria-label=${JSON.stringify(labels)}` }],
  }));
}

function scanHtml(options: ScanSourceOptions): AuditFinding[] {
  const findings: AuditFinding[] = [];
  let document: HtmlNode;
  const parseErrors: Array<{ code: string; startOffset?: number }> = [];
  try {
    document = parseHtml(options.source, { sourceCodeLocationInfo: true, onParseError: (error) => parseErrors.push(error) }) as unknown as HtmlNode;
  } catch (error) {
    return [finding(options, "emoji-styles/parser/invalid-source", 0, 1, error instanceof Error ? error.message : String(error))].filter(Boolean) as AuditFinding[];
  }
  for (const error of parseErrors) {
    push(findings, finding(options, "emoji-styles/parser/invalid-source", error.startOffset ?? 0, (error.startOffset ?? 0) + 1, `HTML parse error: ${error.code}.`));
  }
  const visit = (node: HtmlNode, ancestors: HtmlNode[]) => {
    const tag = node.tagName?.toLowerCase();
    const attributes = new Map((node.attrs ?? []).map((attribute) => [attribute.name, attribute.value]));
    if (tag) inspectHtmlElement(node, tag, attributes, options, findings);
    if (node.nodeName === "#text" && !ancestors.some((ancestor) => SKIPPED_TEXT_ELEMENTS.has(ancestor.tagName?.toLowerCase() ?? ""))) {
      const location = node.sourceCodeLocation;
      if (location) inspectText(node.value ?? "", location.startOffset, location.endOffset, options, findings, true, "web");
    }
    for (const child of node.childNodes ?? []) visit(child, [...ancestors, node]);
  };
  visit(document, []);
  return dedupe(findings);
}

function inspectHtmlElement(node: HtmlNode, tag: string, attributes: Map<string, string>, options: ScanSourceOptions, findings: AuditFinding[]) {
  const location = node.sourceCodeLocation;
  if (!location) return;
  const provider = attributes.get("provider");
  if (tag === "styled-emoji" && provider && !options.knownProviders.has(provider)) {
    push(findings, finding(options, "emoji-styles/provider/unknown", location.startOffset, location.startTag?.endOffset ?? location.endOffset, `Unknown emoji provider \"${provider}\".`));
  }
  if (tag === "styled-emoji" && provider === "native" && isCriticalPath(options.displayPath)) {
    push(findings, finding(options, "emoji-styles/determinism/native-critical-ui", location.startOffset, location.startTag?.endOffset ?? location.endOffset, "Native emoji provider used in a snapshot or visual-test source."));
  }
  const source = attributes.get("src");
  if (tag === "img" && source && isEmojiAssetSource(source)) {
    if (!attributes.has("alt")) {
      push(findings, finding(options, "emoji-styles/accessibility/missing-label", location.startOffset, location.startTag?.endOffset ?? location.endOffset, "Emoji image is missing a meaningful alt label.", undefined, "Add an explicit CLDR or product-specific label."));
    }
    if (!PROVIDER_URL_PATTERN.test(source)) {
      push(findings, finding(options, "emoji-styles/provider/custom-asset-bypass", location.startOffset, location.startTag?.endOffset ?? location.endOffset, "Custom emoji image bypasses the configured provider registry."));
    }
  }
  if (source) inspectUrl(source, location.startOffset, location.startTag?.endOffset ?? location.endOffset, options, findings);
  if (tag !== "button" || attributes.has("aria-label") || attributes.has("aria-labelledby") || attributes.has("title")) return;
  const directText = htmlStaticText(node);
  const emoji = emojiIn(directText);
  if (!emoji.length || directText.replace(/\s/gu, "") !== emoji.join("")) return;
  const labels = emoji.map((value) => getEmojiMetadata(value)?.label ?? value).join(", ");
  const insertion = location.startOffset + 1 + tag.length;
  push(findings, finding(options, "emoji-styles/accessibility/missing-label", location.startOffset, location.startTag?.endOffset ?? location.endOffset, "Emoji-only button has no accessible label.", emoji[0], `Add aria-label=\"${labels}\".`, {
    description: `Add accessible label \"${labels}\" to the button`, safety: "safe", edits: [{ start: insertion, end: insertion, text: ` aria-label=${JSON.stringify(labels)}` }],
  }));
}

function inspectText(text: string, start: number, end: number, options: ScanSourceOptions, findings: AuditFinding[], visibleUi: boolean, migration: "react" | "web" | null) {
  for (const emoji of emojiIn(text)) {
    const offset = findRawOffset(options.source, emoji, start, end);
    if (!normalizeEmoji(emoji)) {
      push(findings, finding(options, "emoji-styles/unicode/unsupported-sequence", offset, offset + emoji.length, `Emoji-like sequence ${emoji} is not in the bundled RGI dataset.`, emoji));
      continue;
    }
    if (visibleUi) {
      const replacement = migration === "react"
        ? `<Emoji emoji=${JSON.stringify(emoji)} />`
        : migration === "web"
          ? `<styled-emoji emoji=${JSON.stringify(emoji)}></styled-emoji>`
          : null;
      push(findings, finding(options, "emoji-styles/semantic/raw-emoji", offset, offset + emoji.length, `Raw ${emoji} bypasses the configured emoji policy.`, emoji, `Use <Emoji emoji=${JSON.stringify(emoji)} /> or a semantic EmojiToken.`, replacement ? {
        description: `Replace raw ${emoji} with a policy-aware renderer`,
        safety: "unsafe",
        edits: [{ start: offset, end: offset + emoji.length, text: replacement }],
      } : undefined));
    }
    if (isCriticalPath(options.displayPath)) push(findings, finding(options, "emoji-styles/determinism/native-critical-ui", offset, offset + emoji.length, `Raw ${emoji} can render differently in snapshots and visual tests.`, emoji));
  }
}

function inspectUrl(value: string, start: number, end: number, options: ScanSourceOptions, findings: AuditFinding[]) {
  if (!REMOTE_URL_PATTERN.test(value)) return;
  const offset = findRawOffset(options.source, value, start, end);
  if (!options.allowRemoteAssets && isEmojiAssetSource(value)) {
    push(findings, finding(options, "emoji-styles/provider/remote-forbidden", offset, offset + value.length, "Remote emoji asset violates the project policy."));
  }
  if (!PROVIDER_URL_PATTERN.test(value)) return;
  push(findings, finding(options, "emoji-styles/provider/direct-url", offset, offset + value.length, "Direct provider URL bypasses version, fallback, and license checks."));
  if (isUnpinnedProviderUrl(value)) push(findings, finding(options, "emoji-styles/provider/unpinned-url", offset, offset + value.length, "Provider URL is not pinned to an immutable version or commit."));
}

function sourceText(node: AstNode): string | null {
  if (node.type === "StringLiteral" && typeof node.value === "string") return node.value;
  if (node.type === "JSXText" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateElement") {
    const value = node.value as { raw?: string } | undefined;
    return value?.raw ?? null;
  }
  return null;
}

function shouldSkipStringNode(node: AstNode, parent: AstNode | null, key: string, ancestors: readonly AstNode[]): boolean {
  if (parent && ["ImportDeclaration", "ExportAllDeclaration", "ExportNamedDeclaration"].includes(parent.type) && key === "source") return true;
  if (parent?.type === "JSXAttribute") {
    const name = jsxName(parent.name);
    return ["emoji", "token", "label", "alt", "aria-label", "title"].includes(name);
  }
  const enclosingAttribute = [...ancestors].reverse().find((ancestor) => ancestor.type === "JSXAttribute");
  if (enclosingAttribute && ["emoji", "token", "label", "alt", "aria-label", "title"].includes(jsxName(enclosingAttribute.name))) return true;
  if (parent?.type === "ObjectProperty" && key === "value" && jsxName(parent.key) === "emoji") return true;
  return false;
}

function jsxAttributes(node: AstNode): Map<string, { value?: string; start: number; end: number }> {
  const output = new Map<string, { value?: string; start: number; end: number }>();
  const attributes = Array.isArray(node.attributes) ? node.attributes as AstNode[] : [];
  for (const attribute of attributes) {
    if (attribute.type !== "JSXAttribute") continue;
    const name = jsxName(attribute.name);
    const valueNode = attribute.value as AstNode | null | undefined;
    const value = valueNode?.type === "StringLiteral" && typeof valueNode.value === "string"
      ? valueNode.value
      : valueNode?.type === "JSXExpressionContainer"
        ? providerExpressionValue(valueNode.expression as AstNode | undefined)
        : undefined;
    output.set(name, { value, start: nodeStart(attribute), end: nodeEnd(attribute) });
  }
  return output;
}

function providerExpressionValue(expression: AstNode | undefined): string | undefined {
  if (!expression || expression.type !== "MemberExpression") return undefined;
  const property = expression.property as AstNode | undefined;
  const member = property && typeof property.name === "string" ? property.name : undefined;
  return member ? PROVIDER_MEMBER_IDS[member] : undefined;
}

function jsxName(value: unknown): string {
  const node = value as AstNode | undefined;
  if (!node) return "";
  if (typeof node.name === "string") return node.name;
  if (node.type === "JSXMemberExpression") return `${jsxName(node.object)}.${jsxName(node.property)}`;
  return "";
}

function walkAst(node: AstNode, parent: AstNode | null, key: string, visit: (node: AstNode, parent: AstNode | null, key: string, ancestors: readonly AstNode[]) => void, ancestors: readonly AstNode[] = []): void {
  visit(node, parent, key, ancestors);
  for (const [childKey, value] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "errors", "comments", "tokens"].includes(childKey)) continue;
    if (Array.isArray(value)) {
      for (const child of value) if (isAstNode(child)) walkAst(child, node, childKey, visit, [...ancestors, node]);
    } else if (isAstNode(value)) walkAst(value, node, childKey, visit, [...ancestors, node]);
  }
}

function isAstNode(value: unknown): value is AstNode {
  return Boolean(value) && typeof value === "object" && typeof (value as AstNode).type === "string";
}

function emojiIn(text: string): string[] {
  return tokenizeEmojiText(text).filter((token) => token.type === "emoji").map((token) => token.value);
}

function jsxStaticChildText(node: AstNode): string {
  if (node.type === "JSXText") return String(node.value ?? "");
  if (node.type === "JSXExpressionContainer") {
    const expression = node.expression as AstNode | undefined;
    if (expression?.type === "StringLiteral" && typeof expression.value === "string") return expression.value;
    if (expression?.type === "TemplateLiteral" && Array.isArray(expression.expressions) && expression.expressions.length === 0) {
      const quasis = Array.isArray(expression.quasis) ? expression.quasis as AstNode[] : [];
      return quasis.map((quasi) => String((quasi.value as { cooked?: string } | undefined)?.cooked ?? "")).join("");
    }
  }
  return "";
}

function htmlStaticText(node: HtmlNode): string {
  if (node.nodeName === "#text") return node.value ?? "";
  if (node.tagName?.toLowerCase() === "styled-emoji") return "";
  return (node.childNodes ?? []).map(htmlStaticText).join("");
}

function finding(options: ScanSourceOptions, ruleId: AuditRuleId, start: number, end: number, message: string, emoji?: string, suggestion?: string, fix?: AuditFinding["fix"]): AuditFinding | null {
  const severity = options.severity(ruleId);
  if (severity === "off") return null;
  return { ruleId, severity, message, path: options.displayPath, start: location(options.source, start), end: location(options.source, end), ...(emoji ? { emoji } : {}), ...(suggestion ? { suggestion } : {}), ...(fix ? { fix } : {}) };
}

function location(source: string, rawOffset: number) {
  const offset = Math.max(0, Math.min(source.length, rawOffset));
  const before = source.slice(0, offset);
  const line = before.split("\n").length;
  const lastNewline = before.lastIndexOf("\n");
  return { line, column: offset - lastNewline, offset };
}

function nodeStart(node: AstNode): number { return typeof node.start === "number" ? node.start : 0; }
function nodeEnd(node: AstNode): number { return typeof node.end === "number" ? node.end : nodeStart(node); }
function findRawOffset(source: string, value: string, start: number, end: number): number {
  const offset = source.indexOf(value, Math.max(0, start));
  return offset >= 0 && offset <= end ? offset : start;
}
function isCriticalPath(path: string): boolean { return CRITICAL_FILE_PATTERN.test(path); }
function isEmojiAssetSource(source: string): boolean { return PROVIDER_URL_PATTERN.test(source) || CUSTOM_EMOJI_PATH_PATTERN.test(source); }
function isUnpinnedProviderUrl(url: string): boolean {
  if (/[@/](?:main|master|latest)(?:[/@]|$)/i.test(url)) return true;
  if (/unpkg\.com\/[^/@]+(?:\/|$)/i.test(url)) return true;
  if (/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/(?:main|master)\//i.test(url)) return true;
  if (/cdn\.jsdelivr\.net\/gh\/[^/]+\/[^/@]+\/(?!@)/i.test(url)) return true;
  return false;
}
function push(findings: AuditFinding[], value: AuditFinding | null) { if (value) findings.push(value); }
function dedupe(findings: AuditFinding[]): AuditFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.ruleId}:${finding.path}:${finding.start.offset}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.path.localeCompare(b.path) || a.start.offset - b.start.offset || a.ruleId.localeCompare(b.ruleId));
}
