import { getAvailableEmojis, getEmojiData } from "react-emoji-styles";

export interface CatalogEntry {
  emoji: string;
  label: string;
  category: string;
  searchText: string;
}

/** Build searchable text once, rather than normalizing metadata on every keystroke. */
export function createCatalogIndex(): CatalogEntry[] {
  return getAvailableEmojis().map((emoji) => {
    const data = getEmojiData(emoji);
    return {
      emoji,
      label: data?.alt ?? emoji,
      category: data?.group ?? "Other",
      searchText: [emoji, data?.alt, data?.name, data?.codepoint, data?.group, data?.subgroup].join(" ").toLowerCase(),
    };
  });
}

export function filterCatalog(entries: readonly CatalogEntry[], query: string, category: string): CatalogEntry[] {
  const normalized = query.trim().toLowerCase();
  const codepointQuery = normalized.replace(/u\+/g, "").replace(/\s+/g, "-");
  return entries.filter((entry) =>
    (!category || entry.category === category) &&
    (!normalized || entry.searchText.includes(normalized) || entry.searchText.includes(codepointQuery)),
  );
}
