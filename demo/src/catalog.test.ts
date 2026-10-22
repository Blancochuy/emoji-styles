import { describe, expect, it } from "vitest";
import { createCatalogIndex, filterCatalog } from "./catalog";

const entries = createCatalogIndex();
const ROCKET = String.fromCodePoint(0x1f680);

describe("catalog filtering", () => {
  it.each(["  ROCKET  ", ROCKET, "1f680", "U+1F680", "transport-air", "Travel & Places"])("finds a rocket using %s", (query) => {
    expect(filterCatalog(entries, query, "").some((entry) => entry.emoji === ROCKET)).toBe(true);
  });

  it("intersects category and text filters and keeps Unicode ordering", () => {
    const matching = filterCatalog(entries, "face", "Smileys & Emotion");
    expect(matching.length).toBeGreaterThan(0);
    expect(matching.every((entry) => entry.category === "Smileys & Emotion")).toBe(true);
    expect(filterCatalog(entries, "rocket", "Food & Drink")).toEqual([]);
    expect(filterCatalog(entries, "  ", "")).toEqual(entries);
  });
});
