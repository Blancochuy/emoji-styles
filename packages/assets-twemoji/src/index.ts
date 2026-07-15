import {
  createCdnProvider,
  emojiDatasetInfo,
  getAvailableEmojis,
  getTwemojiAssetId,
  type EmojiAssetProvider,
} from "emoji-styles";
import { TWEMOJI_ASSET_COUNT, twemojiAssetIds } from "./asset-ids";

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
    format: "png",
    visibility: "public",
    version: TWEMOJI_VERSION,
    local: true,
    source: "https://github.com/jdecked/twemoji",
    filename: getTwemojiAssetId,
    supports: (data) => twemojiAssetIds.has(getTwemojiAssetId(data)),
    coverage: () => {
      const total = getAvailableEmojis().length;
      return {
        providerId: "twemoji-local",
        providerVersion: TWEMOJI_VERSION,
        datasetVersion: emojiDatasetInfo.emojiVersion,
        total,
        supported: TWEMOJI_ASSET_COUNT,
        percentage: Number(((TWEMOJI_ASSET_COUNT / total) * 100).toFixed(2)),
        verified: true,
        source: "emoji-styles-assets-twemoji manifest",
      };
    },
    license: {
      name: "CC BY 4.0",
      url: "https://creativecommons.org/licenses/by/4.0/",
      attribution: "Twemoji graphics by Twitter and contributors",
    },
  });
}

export const localTwemojiProvider = createLocalTwemojiProvider();
