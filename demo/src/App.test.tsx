import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

const BANANA = String.fromCodePoint(0x1f34c);

describe("free-style Unicode fallback", () => {
  it("updates the editable fallback and generated prompt from the picker", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Create your own/i }));

    fireEvent.click(screen.getByRole("button", { name: "Choose Unicode emoji" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search Unicode emoji" }), {
      target: { value: "banana" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Banana" }));

    expect(screen.getByLabelText("Unicode fallback", { selector: "#free-style-unicode-fallback" })).toHaveValue(BANANA);
    expect(screen.getByText(new RegExp(`Unicode fallback: ${BANANA}`))).toBeInTheDocument();
  });

  it("selects and renders the independent Chinese Dragon provider", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Chinese Dragon/i }));

    expect(screen.getAllByText("dragon.emoji").length).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole("img", { name: "Fierce Chinese flying dragon" })
        .some((image) => image.getAttribute("data-provider") === "custom-dragon"),
    ).toBe(true);
    expect(screen.getAllByText(/customDragonProvider/).length).toBeGreaterThan(0);
  });
});

describe("provider explorer", () => {
  it("shares the selected provider between the comparison board and explorer", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Preview Fluent 3D" }));

    expect(screen.getByRole("button", { name: "Preview Fluent 3D" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Sparkles Fluent 3D" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Preview Custom Emoji" })).toHaveAttribute("aria-pressed", "false");
  });

  it("labels collection search and exposes the filtered result count", () => {
    render(<App />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search emoji collection" }), {
      target: { value: "no-such-emoji-12345" },
    });

    expect(screen.getByText("0 results")).toHaveAttribute("role", "status");
    expect(screen.getByText("No matching emojis")).toBeInTheDocument();
  });
});

describe("collection controls", () => {
  it("filters locally, selects a result, and clears both filters", () => {
    render(<App />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Filter emoji collection" }), { target: { value: "  U+1F680  " } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Travel & Places" } });
    const rocket = screen.getByRole("button", { name: "Select Rocket" });
    expect(rocket.tagName).toBe("BUTTON");
    fireEvent.click(rocket);
    expect(rocket).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: /^Preview: Rocket/ })).toHaveAttribute("href", "#playground");

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("searchbox", { name: "Filter emoji collection" })).toHaveValue("");
    expect(screen.getByLabelText("Category")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Select Grinning face" })).toBeInTheDocument();
  });

  it("explains Custom provider fallback and updates the note for SerenityOS", () => {
    render(<App />);
    expect(screen.getAllByText(/Custom artwork covers the robot emoji only/)).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Preview SerenityOS Pixel Art" }));
    expect(screen.queryByText(/Custom artwork covers the robot emoji only/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Partial catalog/)).toHaveLength(2);
  });
});
