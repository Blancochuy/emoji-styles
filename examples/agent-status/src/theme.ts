import {
  createMappedProvider,
  defineEmojiTheme,
  publicProviders,
} from "emoji-styles";

export const states = {
  working: {
    emoji: "⚙️",
    label: "Agent working",
    file: "working.svg",
    title: "Working",
    detail: "Reviewing the proposed changes",
    note: "The agent is checking the changes before handing them back to you.",
  },
  complete: {
    emoji: "✅",
    label: "Agent completed",
    file: "complete.svg",
    title: "Completed",
    detail: "Ready for your review",
    note: "The work is ready. A person still reviews the result before it ships.",
  },
  error: {
    emoji: "⚠️",
    label: "Agent needs attention",
    file: "error.svg",
    title: "Needs attention",
    detail: "A check needs your attention",
    note: "The agent stopped at a failed check. Inspect the result before retrying.",
  },
} as const;
export type AgentState = keyof typeof states;

export function createAgentTheme(brokenImage = false) {
  const provider = createMappedProvider({
    id: brokenImage ? "agent-desk-unavailable" : "agent-desk",
    label: "Agent Desk",
    version: "1.0.0",
    format: "svg",
    local: true,
    license: { name: "MIT", attribution: "Emoji Styles contributors" },
    assets: Object.fromEntries(
      Object.values(states).map(({ emoji, file }) => [
        emoji,
        `/emoji/${brokenImage ? "unavailable-" : ""}${file}`,
      ]),
    ),
  });
  return defineEmojiTheme(
    Object.fromEntries(
      Object.entries(states).map(([key, state]) => [
        `agent.${key}`,
        { emoji: state.emoji, label: state.label },
      ]),
    ),
    {
      id: "agent-desk",
      version: "1.0.0",
      defaultProvider: provider,
      // No CDN dependency. The terminal fallback keeps the label and uses OS artwork.
      fallbacks: [publicProviders.native],
      nativeFallback: true,
    },
  );
}
