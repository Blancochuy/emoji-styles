import { fireEvent, render, screen, within } from "@testing-library/react";
import { compileEmojiTheme, parseEmojiTheme } from "emoji-styles";
import { describe, expect, it } from "vitest";
import runtimeBundle from "../../benchmarks/runtime-bundle/published.json";
import webBundle from "../../benchmarks/web-bundle/published.json";
import App from "./App";
import { compiledEmojiTheme } from "../generated/demo-theme.compiled";
import demoTheme from "./compiled/demo-theme.json";

describe("compiled themes showcase", () => {
  it("ships a compiled module that matches its source theme", async () => {
    expect(await compileEmojiTheme(parseEmojiTheme(JSON.stringify(demoTheme)))).toEqual(compiledEmojiTheme);
  });

  it("shows the committed benchmark records instead of hand-typed sizes", () => {
    render(<App />);
    const card = screen.getByRole("article", { name: "Measured bundle weight" });
    const kB = (bytes: number) => `${(bytes / 1000).toFixed(1)} kB`;
    const gzip = (record: typeof webBundle | typeof runtimeBundle, variant: string) => record.variants.find((item) => item.variant === variant)!.js.gzipBytes;
    expect(within(card).getByText(kB(gzip(webBundle, "web-compiled")))).toBeInTheDocument();
    fireEvent.click(within(card).getByRole("button", { name: "React" }));
    expect(within(card).getByText(kB(gzip(runtimeBundle, "theme-12-compiled")))).toBeInTheDocument();
    expect(within(card).getByText(`−${kB(gzip(runtimeBundle, "theme-12") - gzip(runtimeBundle, "theme-12-compiled"))}`)).toBeInTheDocument();
  });

  it("breaks real source URLs per outage scenario and localizes labels", () => {
    render(<App />);
    const card = screen.getByRole("article", { name: "Fallback chain simulator" });
    const sources = () => within(card).getAllByRole("img").map((image) => image.getAttribute("src") ?? "");
    expect(sources().every((url) => url.includes("__simulated-outage__/fluent-3d"))).toBe(true);
    fireEvent.click(within(card).getByRole("button", { name: /All healthy/ }));
    expect(sources().every((url) => url.startsWith("https://cdn.jsdelivr.net/"))).toBe(true);
    fireEvent.click(within(card).getByRole("button", { name: "ES" }));
    expect(within(card).getByRole("img", { name: "Lanzar proyecto" })).toBeInTheDocument();
  });

  it("presents the three published skills", () => {
    render(<App />);
    for (const name of ["/emoji-styles", "/emoji-asset-creator", "/emoji-isometric-style"]) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(/not generated artwork/)).toBeInTheDocument();
  });
});
