import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  createSemanticTokenProvider,
  defineEmojiTheme,
  publicProviders,
} from "emoji-styles";
import { EmojiProvider } from "../src/EmojiProvider";
import { EmojiToken } from "../src/EmojiToken";

describe("EmojiToken", () => {
  it("renders a localized custom asset from context", async () => {
    const theme = defineEmojiTheme({
      "action.deploy": {
        emoji: "🚀",
        label: "Deploy application",
        labels: { es: "Desplegar aplicación" },
        asset: { url: "/icons/deploy.svg", format: "svg" },
      },
    }, { id: "product", version: "1.0.0" });

    const { container } = render(
      <EmojiProvider theme={theme} locale="es">
        <EmojiToken token="action.deploy" lazy={false} />
      </EmojiProvider>,
    );

    const image = await screen.findByRole("img", { name: "Desplegar aplicación" });
    expect(image).toHaveAttribute("src", "/icons/deploy.svg");
    expect(container.querySelector("[data-emoji-token='action.deploy']")).toHaveAttribute(
      "data-emoji-source",
      "custom-asset",
    );
  });

  it("keeps decorative tokens hidden from assistive technology", async () => {
    const theme = defineEmojiTheme({
      "reaction.fire": {
        emoji: "🔥",
        label: "Fire",
        decorative: true,
        asset: { url: "/icons/fire.webp", format: "webp" },
      },
    }, { id: "reactions", version: "1.0.0" });

    const { container } = render(<EmojiToken token="reaction.fire" theme={theme} lazy={false} />);
    await waitFor(() => expect(
      container.querySelector("[data-emoji-token='reaction.fire']"),
    ).toHaveAttribute("data-emoji-source", "custom-asset"));
    expect(container.querySelector("[data-emoji-token='reaction.fire']")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("resolves serialized provider ids through the context registry", async () => {
    const provider = createSemanticTokenProvider({
      id: "acme-icons",
      label: "Acme Icons",
      version: "1.0.0",
      assets: { "action.deploy": "/acme/deploy.svg" },
      fallback: publicProviders.twemoji,
    });
    const theme = defineEmojiTheme({
      "action.deploy": {
        emoji: "🚀",
        label: "Deploy",
        asset: "action.deploy",
      },
    }, {
      id: "acme",
      version: "1.0.0",
      defaultProvider: "acme-icons",
    });

    const { container } = render(
      <EmojiProvider theme={theme} providers={{ "acme-icons": provider }}>
        <EmojiToken token="action.deploy" lazy={false} />
      </EmojiProvider>,
    );
    await waitFor(() => expect(
      screen.getByRole("img", { name: "Deploy" }),
    ).toHaveAttribute("src", "/acme/deploy.svg"));
    expect(container.querySelector("[data-emoji-token='action.deploy']")).toHaveAttribute(
      "data-emoji-source",
      "semantic-provider",
    );
  });

  it("renders native Unicode when provider coverage is unavailable", async () => {
    const theme = defineEmojiTheme({
      "status.future": { emoji: "🫪", label: "Distorted face" },
    }, {
      id: "future",
      version: "1.0.0",
      defaultProvider: publicProviders.twemoji,
      fallbacks: [publicProviders.native],
    });

    const { container } = render(<EmojiToken token="status.future" theme={theme} lazy={false} />);
    await waitFor(() => expect(
      container.querySelector("[data-emoji-token='status.future']"),
    ).toHaveAttribute("data-emoji-source", "native"));
    expect(screen.getByText("🫪")).toHaveAttribute("aria-label", "Distorted face");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
