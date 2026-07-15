import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createCdnProvider } from "emoji-styles";
import { EmojiGrid } from "../src/EmojiGrid";

const provider = createCdnProvider({
  id: "grid-test",
  label: "Grid test",
  baseUrl: "https://assets.example.com/grid",
  extension: "png",
  visibility: "custom",
});

describe("EmojiGrid", () => {
  it("renders mapped images and unknown native text", async () => {
    render(
      <EmojiGrid
        emojis={["🚀", "not-an-emoji"]}
        provider={provider}
        size={28}
        gap={8}
      />,
    );

    expect(screen.getByText("not-an-emoji")).toBeInTheDocument();
    await waitFor(() => {
      const image = screen.getByRole("img", { name: "Rocket" });
      expect(image).toHaveAttribute(
        "src",
        "https://assets.example.com/grid/rocket_1f680.png",
      );
      expect(image).toHaveAttribute("width", "28");
    });
  });
});
