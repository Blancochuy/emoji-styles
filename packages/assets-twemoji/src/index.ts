import { createCdnProvider, type EmojiAssetProvider } from "emoji-styles";

export const TWEMOJI_VERSION = "15.1.0";
export const DEFAULT_TWEMOJI_BASE_URL = `/emoji/twemoji/${TWEMOJI_VERSION}`;

export function createLocalTwemojiProvider(
  baseUrl = DEFAULT_TWEMOJI_BASE_URL,
): EmojiAssetProvider {
  return createCdnProvider({
    id: "twemoji-local",
    label: "Twemoji Local",
    baseUrl: baseUrl.replace(/\/$/, ""),
    extension: "png",
    visibility: "public",
    filename: (data) => data.codepoint.replace(/-fe0f/gi, ""),
    license: {
      name: "CC BY 4.0",
      url: "https://creativecommons.org/licenses/by/4.0/",
      attribution: "Twemoji graphics by Twitter and contributors",
    },
  });
}

export const localTwemojiProvider = createLocalTwemojiProvider();
