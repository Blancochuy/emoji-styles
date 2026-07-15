import { tokenizeEmojiText, type EmojiProviderRef } from "emoji-styles";

export interface TransformEmojiTextConfig {
  provider?: EmojiProviderRef | string;
  size?: number | string;
  decorative?: boolean;
  include?: (textNode: Text) => boolean;
  skipTags?: readonly string[];
}

export interface EmojiTransformMetrics {
  scannedTextNodes: number;
  transformedTextNodes: number;
  emojiCount: number;
  durationMs: number;
}

const DEFAULT_SKIP_TAGS = ["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "PRE", "NOSCRIPT"];

function rootDocument(root: Node): Document {
  if (root.nodeType === 9) return root as Document;
  const document = root.ownerDocument;
  if (!document) throw new Error("transformEmojiText requires a DOM root with an ownerDocument");
  return document;
}

function shouldSkip(node: Text, skipped: ReadonlySet<string>): boolean {
  let current = node.parentElement;
  while (current) {
    if (skipped.has(current.tagName)) return true;
    const contentEditable = current.getAttribute("contenteditable");
    if (
      current.isContentEditable
      || (contentEditable !== null && contentEditable.toLowerCase() !== "false")
    ) return true;
    if (current.matches("styled-emoji, [data-emoji-styles-transformed='true']")) return true;
    current = current.parentElement;
  }
  return false;
}

export function transformEmojiText(
  root: Node,
  config: TransformEmojiTextConfig = {},
): EmojiTransformMetrics {
  const startedAt = typeof performance === "undefined" ? Date.now() : performance.now();
  const document = rootDocument(root);
  const skipped = new Set(config.skipTags ?? DEFAULT_SKIP_TAGS);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) nodes.push(current as Text);

  let transformedTextNodes = 0;
  let emojiCount = 0;
  for (const node of nodes) {
    if (!node.parentNode || !node.data || shouldSkip(node, skipped) || config.include?.(node) === false) continue;
    const tokens = tokenizeEmojiText(node.data);
    if (!tokens.some((token) => token.type === "emoji")) continue;
    const fragment = document.createDocumentFragment();
    for (const token of tokens) {
      if (token.type === "text") {
        fragment.append(document.createTextNode(token.value));
        continue;
      }
      const element = document.createElement("styled-emoji");
      element.setAttribute("emoji", token.value);
      element.setAttribute("data-emoji-styles-transformed", "true");
      if (config.provider) {
        element.setAttribute("provider", typeof config.provider === "string" ? config.provider : config.provider.id);
      }
      if (config.size !== undefined) element.setAttribute("size", String(config.size));
      if (config.decorative) element.setAttribute("decorative", "");
      fragment.append(element);
      emojiCount++;
    }
    node.parentNode.replaceChild(fragment, node);
    transformedTextNodes++;
  }
  const endedAt = typeof performance === "undefined" ? Date.now() : performance.now();
  return { scannedTextNodes: nodes.length, transformedTextNodes, emojiCount, durationMs: endedAt - startedAt };
}

export function undoEmojiTextTransform(root: ParentNode): number {
  const elements = Array.from(root.querySelectorAll("styled-emoji[data-emoji-styles-transformed='true']"));
  for (const element of elements) {
    element.replaceWith(element.ownerDocument.createTextNode(element.getAttribute("emoji") ?? ""));
  }
  root.normalize();
  return elements.length;
}
