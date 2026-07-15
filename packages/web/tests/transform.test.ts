import { beforeEach, describe, expect, it } from "vitest";
import { transformEmojiText, undoEmojiTextTransform } from "../src";

describe("DOM transformer", () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it("transforms complete emoji graphemes without using innerHTML", () => {
    const paragraph = document.createElement("p");
    paragraph.textContent = "Ship 👩🏽‍🚀 safely 🚀.";
    document.body.append(paragraph);

    const metrics = transformEmojiText(paragraph, { provider: "fluent-3d", size: 24 });
    const elements = paragraph.querySelectorAll("styled-emoji");
    expect(metrics.emojiCount).toBe(2);
    expect(elements).toHaveLength(2);
    expect(elements[0]?.getAttribute("emoji")).toBe("👩🏽‍🚀");
    expect(paragraph.textContent).toBe("Ship  safely .");
  });

  it("skips unsafe or editable contexts and avoids duplicate transforms", () => {
    const container = document.createElement("div");
    const paragraph = document.createElement("p");
    paragraph.textContent = "Visible 🚀";
    const code = document.createElement("code");
    code.textContent = "const icon = '🚀'";
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "");
    editable.textContent = "Draft 🚀";
    container.append(paragraph, code, editable);

    expect(transformEmojiText(container).emojiCount).toBe(1);
    expect(transformEmojiText(container).emojiCount).toBe(0);
    expect(code.querySelector("styled-emoji")).toBeNull();
    expect(editable.querySelector("styled-emoji")).toBeNull();
  });

  it("undoes transformations and restores the original Unicode", () => {
    const paragraph = document.createElement("p");
    paragraph.textContent = "Ready 🚀 and 🎉";
    transformEmojiText(paragraph);
    expect(undoEmojiTextTransform(paragraph)).toBe(2);
    expect(paragraph.textContent).toBe("Ready 🚀 and 🎉");
  });
});
