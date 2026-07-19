import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmojiPicker } from "./EmojiPicker";

const BANANA = String.fromCodePoint(0x1f34c);
const UNICORN = String.fromCodePoint(0x1f984);
const THUMBS_UP = String.fromCodePoint(0x1f44d);

describe("EmojiPicker", () => {
  it("opens with a compact selection of 24 Unicode emoji", () => {
    render(<EmojiPicker value={BANANA} onSelect={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "Choose Unicode emoji" });
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Choose a Unicode fallback" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(within(dialog).getAllByRole("button")).toHaveLength(24);
  });

  it("searches the complete catalog by CLDR name, character, and codepoint", () => {
    render(<EmojiPicker value="" onSelect={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Choose Unicode emoji" }));

    const search = screen.getByRole("searchbox", { name: "Search Unicode emoji" });
    fireEvent.change(search, { target: { value: "sushi" } });
    expect(screen.getByRole("button", { name: "Sushi" })).toBeInTheDocument();

    fireEvent.change(search, { target: { value: UNICORN } });
    expect(screen.getByRole("button", { name: "Unicorn" })).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "1f984" } });
    expect(screen.getByRole("button", { name: "Unicorn" })).toBeInTheDocument();
  });

  it("selects an emoji, closes the popover, and restores trigger focus", () => {
    const onSelect = vi.fn();
    render(<EmojiPicker value="" onSelect={onSelect} />);
    const trigger = screen.getByRole("button", { name: "Choose Unicode emoji" });
    fireEvent.click(trigger);

    fireEvent.click(screen.getByRole("button", { name: "Banana" }));

    expect(onSelect).toHaveBeenCalledWith(BANANA);
    expect(screen.queryByRole("dialog", { name: "Choose a Unicode fallback" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("dismisses with Escape or an outside pointer interaction", () => {
    render(<EmojiPicker value={BANANA} onSelect={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "Choose Unicode emoji" });

    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Choose a Unicode fallback" }), { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Choose a Unicode fallback" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog", { name: "Choose a Unicode fallback" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("navigates the emoji grid with arrows and selects with Enter", () => {
    const onSelect = vi.fn();
    render(<EmojiPicker value="" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Choose Unicode emoji" }));
    const dialog = screen.getByRole("dialog", { name: "Choose a Unicode fallback" });
    const options = within(dialog).getAllByRole("button");
    options[0].focus();

    fireEvent.keyDown(options[0], { key: "ArrowRight" });
    expect(options[1]).toHaveFocus();
    fireEvent.keyDown(options[1], { key: "ArrowDown" });
    expect(options[7]).toHaveFocus();
    fireEvent.keyDown(options[7], { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith(THUMBS_UP);
  });
});
