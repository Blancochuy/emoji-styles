"use client";

import { Emoji, publicProviders } from "react-emoji-styles";

export function ResolutionExample() {
  return (
    <Emoji
      emoji="🎉"
      provider={publicProviders.fluentAnimated}
      fallbacks={[publicProviders.fluent3d, publicProviders.twemoji, publicProviders.native]}
      label="Release complete"
      onFallback={(event) => console.info("Emoji fallback", event)}
    />
  );
}
