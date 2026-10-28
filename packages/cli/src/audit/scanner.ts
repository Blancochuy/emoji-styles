import { extname } from "node:path";
import { parse as parseJavaScript } from "@babel/parser";
import { parseFragment as parseHtml } from "parse5";
import { normalizeEmoji, tokenizeEmojiText } from "emoji-styles";
import type { AuditEmojiUsage, AuditFinding, AuditRuleId, AuditSeverity } from "../types";

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
  onParseError?(): void;
  onUsage?(usage: AuditEmojiUsage): void;
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
    options.onParseError?.();
    return [finding(options, "emoji-styles/parser/invalid-source", 0, 1, error instanceof Error ? error.message : String(error))].filter(Boolean) as AuditFinding[];
  }
  const parseErrors = Array.isArray(root.errors) ? root.errors as Array<{ message?: string; pos?: number }> : [];
  if (parseErrors.length) options.onParseError?.();
  for (const error of parseErrors) {
    push(findings, finding(options, "emoji-styles/parser/invalid-source", error.pos ?? 0, (error.pos ?? 0) + 1, error.message ?? "Source contains a syntax error."));
  }

  walkAst(root, null, "", (node, parent, key, ancestors) => {
    if (node.type === "JSXOpeningElement") {
      inspectJsxOpening(node, options, findings);
      if (["Emoji", "styled-emoji"].includes(jsxName(node.name))) {
        const value = jsxAttributes(node).get("emoji");
        const emoji = value?.value && normalizeEmoji(value.value);
        if (emoji && value) {
          const contexts = ancestors.filter((ancestor) => ancestor.type === "JSXElement" && !["Emoji", "styled-emoji"].includes(jsxName((ancestor.openingElement as AstNode)?.name))).map(jsxContext);
          const offset = findRawOffset(options.source, emoji, value.start, value.end);
          const own = [...ancestors].reverse().find((ancestor) => ancestor.type === "JSXElement");
          const ownContext = own ? jsxContext(own) : undefined;
          const usageContext = classifyUsage([...contexts, { tag: "span", attrs: ownContext?.attrs ?? new Map(), text: contexts.at(-1)?.text ?? "", hidden: ownContext?.hidden ?? false }]);
          options.onUsage?.({ emoji, ...usageContext, path: options.displayPath, start: location(options.source, offset), end: location(options.source, offset + emoji.length) });
        }
      }
    }
    if (node.type === "JSXElement" && !ancestors.filter((ancestor) => ancestor.type === "JSXElement").some((ancestor) => jsxContext(ancestor).hidden)) inspectJsxControl(node, options, findings);

    const text = sourceText(node);
    if (text === null || shouldSkipStringNode(node, parent, key, ancestors)) return;
    const elements = ancestors.filter((ancestor) => ancestor.type === "JSXElement");
    const contexts = elements.map(jsxContext);
    const context = classifyUsage(contexts);
    inspectText(text, nodeStart(node), nodeEnd(node), options, findings, context.role !== "decorative", node.type === "JSXText" ? "react" : null, context);
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
  for (const attribute of ["src", "href"]) {
    const value = attributes.get(attribute);
    if (value?.value) inspectUrl(value.value, value.start, value.end, options, findings);
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
  if (!opening) return;
  const context = jsxContext(node);
  if (!isControl(context) || context.hidden || !/^[a-z]/.test(context.tag)) return;
  const attributes = jsxAttributes(opening);
  // Dynamic attributes, spreads and custom children need runtime inspection.
  if (Array.isArray(opening.attributes) && (opening.attributes as AstNode[]).some((attr) => attr.type === "JSXSpreadAttribute")) return;
  if (["aria-label", "aria-labelledby", "title"].some((name) => attributes.has(name) && attributes.get(name)?.value === undefined)) return;
  if (context.attrs.get("aria-labelledby")?.trim()) return;
  if (meaningfulName(context.attrs.get("aria-label")) || meaningfulName(context.attrs.get("title"))) return;
  if (context.uncertain) return;
  inspectUnnamedControl(context, nodeStart(opening), nodeEnd(opening), options, findings);
}

function scanHtml(options: ScanSourceOptions): AuditFinding[] {
  const findings: AuditFinding[] = [];
  let document: HtmlNode;
  const parseErrors: Array<{ code: string; startOffset?: number }> = [];
  try {
    document = parseHtml(options.source, { sourceCodeLocationInfo: true, onParseError: (error) => parseErrors.push(error) }) as unknown as HtmlNode;
  } catch (error) {
    options.onParseError?.();
    return [finding(options, "emoji-styles/parser/invalid-source", 0, 1, error instanceof Error ? error.message : String(error))].filter(Boolean) as AuditFinding[];
  }
  if (parseErrors.length) options.onParseError?.();
  for (const error of parseErrors) {
    push(findings, finding(options, "emoji-styles/parser/invalid-source", error.startOffset ?? 0, (error.startOffset ?? 0) + 1, `HTML parse error: ${error.code}.`));
  }
  const visit = (node: HtmlNode, ancestors: HtmlNode[]) => {
    const tag = node.tagName?.toLowerCase();
    const attributes = new Map((node.attrs ?? []).map((attribute) => [attribute.name, attribute.value]));
    if (tag) inspectHtmlElement(node, tag, attributes, options, findings, ancestors.some((ancestor) => htmlContext(ancestor).hidden));
    if (tag === "styled-emoji" && attributes.get("emoji") && node.sourceCodeLocation) {
      const emoji = normalizeEmoji(attributes.get("emoji")!);
      const offset = node.sourceCodeLocation.attrs?.emoji?.startOffset ?? node.sourceCodeLocation.startOffset;
      const contexts = ancestors.filter((ancestor) => ancestor.tagName).map(htmlContext);
      const own = htmlContext(node);
      if (emoji) options.onUsage?.({ emoji, ...classifyUsage([...contexts, { ...own, text: contexts.at(-1)?.text ?? "" }]), path: options.displayPath, start: location(options.source, offset), end: location(options.source, offset + emoji.length) });
    }
    if (node.nodeName === "#text" && !ancestors.some((ancestor) => SKIPPED_TEXT_ELEMENTS.has(ancestor.tagName?.toLowerCase() ?? ""))) {
      const location = node.sourceCodeLocation;
      if (location) {
        const context = classifyUsage(ancestors.filter((ancestor) => ancestor.tagName).map(htmlContext));
        inspectText(node.value ?? "", location.startOffset, location.endOffset, options, findings, context.role !== "decorative", "web", context);
      }
    }
    for (const child of node.childNodes ?? []) visit(child, [...ancestors, node]);
  };
  visit(document, []);
  return dedupe(findings);
}

function inspectHtmlElement(node: HtmlNode, tag: string, attributes: Map<string, string>, options: ScanSourceOptions, findings: AuditFinding[], hiddenAncestor: boolean) {
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
  const context = htmlContext(node);
  if (!hiddenAncestor && !context.hidden && !context.uncertain && isControl(context) && !meaningfulName(attributes.get("aria-label")) && !attributes.get("aria-labelledby")?.trim() && !meaningfulName(attributes.get("title"))) {
    inspectUnnamedControl(context, location.startOffset, location.startTag?.endOffset ?? location.endOffset, options, findings);
  }
}

function inspectText(text: string, start: number, end: number, options: ScanSourceOptions, findings: AuditFinding[], visibleUi: boolean, migration: "react" | "web" | null, context: UsageContext) {
  let cursor = start;
  for (const emoji of emojiIn(text)) {
    const offset = findRawOffset(options.source, emoji, cursor, end);
    cursor = offset + emoji.length;
    options.onUsage?.({ emoji, ...context, path: options.displayPath, start: location(options.source, offset), end: location(options.source, offset + emoji.length) });
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
      push(findings, finding(options, "emoji-styles/semantic/raw-emoji", offset, offset + emoji.length, `Raw ${emoji} in ${context.role} context bypasses the configured emoji policy.`, emoji, `Use <Emoji emoji=${JSON.stringify(emoji)} /> or a semantic EmojiToken.`, replacement ? {
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
  if (parent?.type === "JSXAttribute" || ancestors.some((ancestor) => ancestor.type === "JSXAttribute")) return true;
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
        : valueNode == null ? "true" : undefined;
    output.set(name, { value, start: nodeStart(attribute), end: nodeEnd(attribute) });
  }
  return output;
}

function providerExpressionValue(expression: AstNode | undefined): string | undefined {
  if (!expression) return undefined;
  if (expression.type === "StringLiteral" && typeof expression.value === "string") return expression.value;
  if (expression.type === "BooleanLiteral") return String(expression.value);
  if (expression.type !== "MemberExpression") return undefined;
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

interface ElementContext {
  tag: string;
  attrs: Map<string, string | undefined>;
  text: string;
  rawText?: string;
  hidden: boolean;
  uncertain?: boolean;
}
type UsageContext = Pick<AuditEmojiUsage, "role" | "evidence" | "reason" | "context" | "element" | "accessibleName">;

function isControl(element: ElementContext): boolean {
  return element.tag === "button" || (element.tag === "a" && element.attrs.has("href")) || ["button", "link", "menuitem", "tab", "checkbox", "radio", "switch"].includes(element.attrs.get("role") ?? "");
}
function hidden(attrs: Map<string, string | undefined>): boolean {
  return attrs.get("aria-hidden") === "true" || (attrs.has("hidden") && attrs.get("hidden") !== "false");
}
// Each parse creates new nodes; weak caches avoid repeatedly traversing whole subtrees.
const jsxContexts = new WeakMap<AstNode, ElementContext>();
const htmlContexts = new WeakMap<HtmlNode, ElementContext>();
function jsxContext(node: AstNode): ElementContext {
  const cached = jsxContexts.get(node);
  if (cached) return cached;
  const opening = node.openingElement as AstNode;
  const tag = jsxName(opening?.name);
  const attrs = new Map([...jsxAttributes(opening ?? node)].map(([name, value]) => [name, value.value]));
  let uncertain = Array.isArray(opening?.attributes) && (opening.attributes as AstNode[]).some((attr) => attr.type === "JSXSpreadAttribute");
  const text = (child: AstNode): string => {
    if (child.type === "JSXElement" || child.type === "JSXFragment") {
      const context = jsxContext(child);
      if (/^[A-Z]/.test(context.tag)) uncertain = true;
      if (context.uncertain || context.attrs.has("aria-label") || context.attrs.has("aria-labelledby")) uncertain = true;
      if (context.hidden) return "";
      if (context.tag === "img") {
        if (context.attrs.get("alt") === undefined) uncertain = true;
        return context.attrs.get("alt") ?? "";
      }
      return context.text;
    }
    if (child.type === "JSXExpressionContainer") {
      const expression = child.expression as AstNode | undefined;
      if (expression?.type !== "StringLiteral" && !(expression?.type === "TemplateLiteral" && (expression.expressions as unknown[])?.length === 0) && expression?.type !== "JSXEmptyExpression") uncertain = true;
    }
    return jsxStaticChildText(child);
  };
  const value = (Array.isArray(node.children) ? node.children as AstNode[] : []).map(text).join("");
  const rawText = (Array.isArray(node.children) ? node.children as AstNode[] : []).map((child) => child.type === "JSXElement" || child.type === "JSXFragment" ? jsxContext(child).rawText ?? "" : jsxStaticChildText(child)).join("");
  const result = { tag, attrs, text: value, rawText, hidden: hidden(attrs), uncertain };
  jsxContexts.set(node, result);
  return result;
}
function htmlContext(node: HtmlNode): ElementContext {
  const cached = htmlContexts.get(node);
  if (cached) return cached;
  const attrs = new Map((node.attrs ?? []).map(({ name, value }) => [name, value]));
  if (attrs.has("hidden")) attrs.set("hidden", "true");
  let uncertain = false;
  const text = (child: HtmlNode): string => {
    if (child.nodeName === "#text") return child.value ?? "";
    const context = htmlContext(child);
    if (context.uncertain || context.attrs.has("aria-label") || context.attrs.has("aria-labelledby")) uncertain = true;
    return context.hidden ? "" : context.tag === "img" ? context.attrs.get("alt") ?? "" : context.text;
  };
  const result = { tag: node.tagName ?? "", attrs, text: (node.childNodes ?? []).map(text).join(""), rawText: htmlStaticText(node), hidden: hidden(attrs), uncertain };
  htmlContexts.set(node, result);
  return result;
}
function classifyUsage(elements: ElementContext[]): UsageContext {
  const nearest = elements.at(-1);
  const base = { context: (nearest?.text ?? "").replace(/\s+/g, " ").trim().slice(0, 240), ...(nearest ? { element: nearest.tag } : {}) };
  if (elements.some((element) => element.hidden)) return { ...base, role: "decorative", evidence: "explicit", reason: "Hidden from assistive technology by aria-hidden or hidden." };
  const control = [...elements].reverse().find(isControl);
  if (control) return { ...base, context: (control.attrs.get("aria-label") || control.text).replace(/\s+/g, " ").trim().slice(0, 240), element: control.tag, accessibleName: accessibleName(control), role: "control", evidence: "explicit", reason: "Inside an intrinsic or explicit ARIA control." };
  if (elements.some((element) => ["status", "alert"].includes(element.attrs.get("role") ?? "") || ["polite", "assertive"].includes(element.attrs.get("aria-live") ?? ""))) return { ...base, role: "status", evidence: "explicit", reason: "Inside a status, alert or live region." };
  if (elements.some((element) => /^[A-Z]/.test(element.tag))) return { ...base, role: "unknown", evidence: "unknown", reason: "Custom component behavior needs runtime inspection." };
  if (nearest && /^[a-z]/.test(nearest.tag)) {
    if (/(?:✅|⚠|❌|ℹ)/u.test(base.context) && /\b(?:success|operational|complete|failed|failure|warning|error|ready|successful)\b/i.test(base.context)) return { ...base, role: "status", evidence: "heuristic", reason: "Status glyph and nearby English status wording; requires review." };
    return { ...base, role: "content", evidence: "explicit", reason: "Text in a non-control element; no status evidence." };
  }
  return { ...base, role: "unknown", evidence: "unknown", reason: "No supported static rendered context; inspect at runtime." };
}
function inspectUnnamedControl(context: ElementContext, start: number, end: number, options: ScanSourceOptions, findings: AuditFinding[]) {
  const emoji = emojiIn(context.rawText ?? context.text);
  const visibleEmoji = emojiIn(context.text);
  if (!emoji.length || context.text.replace(/\s/gu, "") !== visibleEmoji.join("")) return;
  push(findings, finding(options, "emoji-styles/accessibility/missing-label", start, end, `Emoji-only ${context.tag} has no explicit accessible action name.`, emoji[0], "Add a product-specific accessible name describing the action. A glyph name does not establish the action; no automatic fix is provided."));
}

function meaningfulName(value: string | undefined): boolean {
  return Boolean(value && tokenizeEmojiText(value).filter((token) => token.type !== "emoji").map((token) => token.value).join("").trim());
}
function accessibleName(context: ElementContext): "explicit" | "missing" | "unknown" {
  if (context.attrs.get("aria-labelledby")?.trim() || context.uncertain || ["aria-label", "aria-labelledby", "title"].some((name) => context.attrs.has(name) && context.attrs.get(name) === undefined)) return "unknown";
  if (meaningfulName(context.attrs.get("aria-label")) || meaningfulName(context.attrs.get("title")) || meaningfulName(context.text)) return "explicit";
  return "missing";
}
