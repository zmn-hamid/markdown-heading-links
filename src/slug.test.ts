import { describe, expect, it } from "vitest";
import { allocateUniqueSlug, gfmSlugify } from "./slug";

describe("GFM heading slugs", () => {
  it("normalizes text using Markdown anchor rules", () => {
    expect(gfmSlugify("My Heading: Part 1")).toBe("my-heading-part-1");
    expect(gfmSlugify("Café & Crème")).toBe("café-crème");
  });

  it("allocates duplicate suffixes", () => {
    const used = new Set<string>();
    const first = allocateUniqueSlug("intro", used);
    used.add(first);
    const second = allocateUniqueSlug("intro", used);
    used.add(second);
    expect([first, second, allocateUniqueSlug("intro", used)]).toEqual([
      "intro",
      "intro-1",
      "intro-2"
    ]);
  });
});

