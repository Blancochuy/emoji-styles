import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createCdnProvider, publicProviders } from "emoji-styles";
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
    expect(screen.getByText("🚀")).toHaveClass("emoji-styles--native");
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
