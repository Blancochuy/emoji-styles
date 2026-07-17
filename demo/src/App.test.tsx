import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("free-style Unicode fallback", () => {
  it("updates the editable fallback and generated prompt from the picker", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Create your own/i }));

    fireEvent.click(screen.getByRole("button", { name: "Choose Unicode emoji" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search Unicode emoji" }), {
      target: { value: "banana" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Banana" }));

    expect(screen.getByRole("textbox", { name: "Unicode fallback" })).toHaveValue("🍌");
    expect(screen.getByText(/Unicode fallback: 🍌/)).toBeInTheDocument();
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
