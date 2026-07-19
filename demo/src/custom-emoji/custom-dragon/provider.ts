import { createManifestProvider, type EmojiProviderManifest } from "emoji-styles";
import manifest from "./emoji-provider.json" with { type: "json" };

export const emojiProvider = createManifestProvider(manifest as EmojiProviderManifest);
