// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { publicProviders } from "emoji-styles";
import { Emoji } from "../src/Emoji";

describe("Emoji SSR", () => {
  it("renders a complete image on the server without browser globals", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    const html = renderToString(
      <Emoji emoji="🚀" provider={publicProviders.fluent3d} size="lg" loading="lazy" />,
    );
    expect(html).toContain("rocket_3d.png");
    expect(html).toContain("alt=\"Rocket\"");
    expect(html).toContain("width=\"24\"");
    expect(html).toContain("loading=\"lazy\"");
    expect(html).not.toContain("style=");
  });

  it("renders accessible native and decorative states deterministically", () => {
    const native = renderToString(<Emoji emoji="🚀" provider="native" label="Launch" size={96} />);
    const decorative = renderToString(<Emoji emoji="🎉" decorative loading="eager" />);
    expect(native).toContain("role=\"img\"");
    expect(native).toContain("aria-label=\"Launch\"");
    expect(native).toContain("width=\"96\"");
    expect(native).not.toContain("style=");
    expect(decorative).toContain("aria-hidden=\"true\"");
    expect(decorative).toContain("alt=\"\"");
  });
});
