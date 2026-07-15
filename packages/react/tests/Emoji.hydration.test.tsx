import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { publicProviders } from "emoji-styles";
import { Emoji } from "../src/Emoji";

describe("Emoji hydration and CSP", () => {
  it("hydrates server markup without mismatch or runtime style injection", async () => {
    const element = <Emoji emoji="🚀" provider={publicProviders.fluent3d} size="lg" />;
    const container = document.createElement("div");
    container.innerHTML = renderToString(element);
    document.body.append(container);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let root: Root | undefined;

    await act(async () => {
      root = hydrateRoot(container, element);
      await Promise.resolve();
    });

    const hydrationErrors = consoleError.mock.calls
      .flatMap((call) => call.map(String))
      .filter((message) => /hydration|did not match|server html/i.test(message));
    expect(hydrationErrors).toEqual([]);
    expect(container.querySelector("img")).toHaveAttribute("alt", "Rocket");
    expect(document.head.querySelector("style")).toBeNull();

    await act(async () => root?.unmount());
    container.remove();
    consoleError.mockRestore();
  });
});
