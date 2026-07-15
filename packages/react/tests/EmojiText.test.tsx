import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMappedProvider, publicProviders } from "emoji-styles";
import { EmojiText } from "../src/EmojiText";

describe("EmojiText", () => {
  it("replaces emoji in a complete text string through a mapped provider", () => {
    const provider = createMappedProvider({
      id: "acme",
      label: "Acme",
      assets: { "🚀": "/icons/deploy.svg" },
      fallback: publicProviders.twemoji,
    });

    const { container } = render(
      <EmojiText provider={provider} lazy={false}>Deploy 🚀 now</EmojiText>,
    );

    expect(container).toHaveTextContent("Deploy now");
    expect(screen.getByRole("img", { name: "Rocket" })).toHaveAttribute(
      "src",
      "/icons/deploy.svg",
    );
  });

  it("lets design-system components override selected emoji", () => {
    render(
      <EmojiText
        lazy={false}
        renderEmoji={(emoji, defaultRenderer) =>
          emoji === "🚀" ? <svg aria-label="Deploy icon" /> : defaultRenderer
        }
      >
        Deploy 🚀 safely 🔥
      </EmojiText>,
    );

    expect(screen.getByLabelText("Deploy icon")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Fire" })).toBeInTheDocument();
  });

  it("renders mapped ZWJ sequences with their CLDR label", () => {
    const provider = createMappedProvider({ assets: { "👨‍💻": "/icons/developer.svg" } });
    render(<EmojiText provider={provider} lazy={false}>Builder 👨‍💻</EmojiText>);
    expect(screen.getByRole("img", { name: "Man technologist" })).toHaveAttribute(
      "src",
      "/icons/developer.svg",
    );
  });
});
