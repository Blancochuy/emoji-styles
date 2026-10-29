import { useCallback, useState } from "react";
import type { ReactNode } from "react";

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─── Copy Button Component ───

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      className="copy-button"
      onClick={handleCopy}
      title={label ?? "Copy to clipboard"}
      aria-label={label ?? "Copy to clipboard"}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {label && <span>{copied ? "Copied!" : label}</span>}
    </button>
  );
}

// ─── Syntax Highlighter (CSS-based) ───

export function highlightCode(code: string, language: string): ReactNode {
  const lines = code.split("\n");
  const tokenPattern = /(\/\/.*$|\/\*.*?\*\/|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|<\/?[A-Za-z][^>]*>|\b(?:import|export|from|const|let|function|return|class|new|default|true|false|null|undefined|standalone|template|setup)\b|\b\d+\b|\b(?:Emoji|EmojiToken|EmojiProvider|CompiledEmojiToken|defineEmojiTheme|createMappedProvider|getEmojiUrl|renderCompiledEmojiTokenToHTML|defineCompiledEmoji|installCompiledEmojiFallbacks|providers|publicProviders|experimentalProviders)\b)/g;

  const renderLine = (line: string) => {
    const output: ReactNode[] = [];
    let cursor = 0;
    for (const match of line.matchAll(tokenPattern)) {
      const index = match.index ?? 0;
      if (index > cursor) output.push(line.slice(cursor, index));
      const token = match[0];
      let className = "hl-keyword";
      if (token.startsWith("//") || token.startsWith("/*")) className = "hl-comment";
      else if (/^['"`]/.test(token)) className = "hl-string";
      else if (token.startsWith("<")) className = "hl-tag";
      else if (/^\d+$/.test(token)) className = "hl-number";
      else if (/^(Emoji|EmojiToken|EmojiProvider|CompiledEmojiToken|defineEmojiTheme|createMappedProvider|getEmojiUrl|renderCompiledEmojiTokenToHTML|defineCompiledEmoji|installCompiledEmojiFallbacks|providers|publicProviders|experimentalProviders)$/.test(token)) className = "hl-component";
      output.push(<span className={className} key={`${index}-${token}`}>{token}</span>);
      cursor = index + token.length;
    }
    if (cursor < line.length) output.push(line.slice(cursor));
    return output.length ? output : " ";
  };

  return lines.map((line, i) => (
    <span key={`${language}-${i}`} className="code-line">
      <span className="line-number">{i + 1}</span>
      <span className="code-line-source">{renderLine(line)}</span>
    </span>
  ));
}
