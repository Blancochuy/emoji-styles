import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createCdnProvider, defineEmojiConfig, publicProviders } from "emoji-styles";
import { Emoji } from "../src/Emoji";
import { EmojiProvider } from "../src/EmojiProvider";

const customProvider = createCdnProvider({
  id: "test-provider",
  label: "Test provider",
  baseUrl: "https://assets.example.com/emoji",
  extension: "webp",
  visibility: "custom",
});

describe("Emoji", () => {
  it("renders unknown input as native text", () => {
    render(<Emoji emoji="not-an-emoji" />);

    expect(screen.getByText("not-an-emoji")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders the native provider as system Unicode instead of Twemoji", () => {
    render(<Emoji emoji="🚀" provider={publicProviders.native} size="xl" />);

    expect(screen.getByText("🚀")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Rocket" })).toHaveTextContent("🚀");
    expect(screen.getByRole("img", { name: "Rocket" })).toHaveClass("emoji-styles--native");
    expect(screen.getByText("🚀").closest("svg")).toHaveAttribute("width", "32");
  });

  it("scales native Unicode to arbitrary numeric dimensions without inline styles", () => {
    render(<Emoji emoji="🚀" provider={publicProviders.native} size={96} />);

    const root = screen.getByRole("img", { name: "Rocket" });
    const glyph = root.querySelector("svg");
    expect(root).toHaveAttribute("data-size", "96");
    expect(glyph).toHaveAttribute("width", "96");
    expect(glyph).toHaveAttribute("height", "96");
    expect(root).not.toHaveAttribute("style");
  });

  it("uses custom providers, accessible text, and preset dimensions", () => {
    render(
      <Emoji
        emoji="🚀"
        provider={customProvider}
        alt="Product launch"
        size="xl"
        lazy={false}
      />,
    );

    const image = screen.getByRole("img", { name: "Product launch" });
    expect(image).toHaveAttribute(
      "src",
      "https://assets.example.com/emoji/rocket_1f680.webp",
    );
    expect(image).toHaveAttribute("width", "32");
    expect(image).toHaveAttribute("height", "32");
  });

  it("renders SerenityOS assets and preserves Twemoji fallback URLs for unsupported variants", () => {
    const { rerender } = render(
      <Emoji emoji="🚀" provider={publicProviders.serenityOS} size={32} loading="eager" />,
    );
    expect(screen.getByRole("img", { name: "Rocket" })).toHaveAttribute(
      "src",
      expect.stringContaining("/SerenityOS/serenity@b490eb8b17499c02d67c3e4de360e6ea583dc09c/"),
    );

    rerender(<Emoji emoji="👨🏻" provider={publicProviders.serenityOS} size={32} loading="eager" />);
    expect(screen.getByRole("img").getAttribute("src")).toContain("jdecked/twemoji");
  });

  it("inherits a provider from context", () => {
    render(
      <EmojiProvider provider={customProvider}>
        <Emoji emoji="🚀" lazy={false} />
      </EmojiProvider>,
    );

    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://assets.example.com/emoji/rocket_1f680.webp",
    );
  });

  it("inherits the complete project config from one root provider", () => {
    const config = defineEmojiConfig({
      provider: customProvider,
      fallbacks: [publicProviders.noto],
      nativeFallback: false,
    });
    const { container } = render(
      <EmojiProvider config={config}>
        <Emoji emoji="🚀" loading="eager" />
      </EmojiProvider>,
    );
    const image = screen.getByRole("img");
    expect(image.getAttribute("src")).toContain("assets.example.com");
    fireEvent.error(image);
    expect(image.getAttribute("src")).toContain("noto-emoji");
    fireEvent.error(image);
    expect(container.querySelector("[data-provider='native']")).toBeNull();
  });

  it("falls back to Twemoji and then native text", async () => {
    render(<Emoji emoji="🚀" provider={customProvider} lazy={false} />);

    const image = screen.getByRole("img");
    fireEvent.error(image);
    expect(image.getAttribute("src")).toContain("jdecked/twemoji");

    fireEvent.error(image);
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Rocket" })).toHaveTextContent("🚀");
    });
  });

  it("keeps failed images hidden when text fallback is disabled", () => {
    const { container } = render(
      <Emoji
        emoji="🚀"
        provider={publicProviders.twemoji}
        fallback={false}
        lazy={false}
      />,
    );

    const image = screen.getByRole("img");
    fireEvent.error(image);
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container.querySelector("[data-emoji='🚀']")).toHaveClass("emoji-styles--hidden");
  });

  it("uses a configured provider chain without falling through to the OS", () => {
    const { container } = render(
      <Emoji
        emoji="🚀"
        provider={customProvider}
        fallbacks={[publicProviders.noto]}
        nativeFallback={false}
        loading="eager"
      />,
    );
    const image = screen.getByRole("img");
    fireEvent.error(image);
    expect(image.getAttribute("src")).toContain("noto-emoji");
    fireEvent.error(image);
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container.querySelector("[data-provider='native']")).toBeNull();
  });

  it("renders lazy images when IntersectionObserver is unavailable", async () => {
    render(<Emoji emoji="🚀" provider={customProvider} />);

    await waitFor(() => expect(screen.getByRole("img")).toBeInTheDocument());
  });

  it("supports decorative markup, native loading, resolution, error, and fallback callbacks", async () => {
    const onResolve = vi.fn();
    const onError = vi.fn();
    const onFallback = vi.fn();
    const { container } = render(
      <Emoji
        emoji="🚀"
        provider={customProvider}
        decorative
        loading="eager"
        onResolve={onResolve}
        onError={onError}
        onFallback={onFallback}
      />,
    );
    const image = container.querySelector("img")!;
    expect(image).toHaveAttribute("alt", "");
    expect(image).toHaveAttribute("loading", "eager");
    expect(container.querySelector("[data-emoji='🚀']")).toHaveAttribute("aria-hidden", "true");
    await waitFor(() => expect(onResolve).toHaveBeenCalled());
    fireEvent.error(image);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ emoji: "🚀", index: 0 }));
    expect(onFallback).toHaveBeenCalledWith(expect.objectContaining({ native: false, index: 1 }));
  });
});
