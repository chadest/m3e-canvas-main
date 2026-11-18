import { describe, expect, it } from "vitest";
import {
  BarVariant,
  Doc,
  ScrollBehavior,
  ScrollDirection,
  actionCountOf,
  barVariantOf,
  baseRadii,
  carryItemSize,
  collapsingBarHeightOf,
  makeItem,
  scrollBehaviorOf,
  scrollDirectionOf,
  scrollGapOf,
  scrollItemCountOf,
  sizeOf,
} from "./tokens";
import { isProject } from "./project";
import { buildPrompt } from "./prompt";
import { tidyFrame } from "./tidy";

const docWith = (...items: ReturnType<typeof makeItem>[]): Doc => ({
  title: "",
  brief: "",
  paletteKey: "purple",
  frame: "phone",
  frames: [{ id: "f", name: "Home", x: 0, y: 0 }],
  groups: items.map((it, i) => ({ id: `g-${i}`, x: 40, y: 300 + i * 40, axis: "x" as const, items: [it] })),
});

describe("scrollView model", () => {
  it("starts with the M3 scroll defaults", () => {
    const it = makeItem("scrollView");
    expect(it.direction).toBe("vertical");
    expect(it.showScrollbar).toBe(true);
    expect(it.itemCount).toBe(4);
    expect(it.gap).toBe(12);
    expect(it.clipContent).toBe(true);
    expect(sizeOf(it, {})).toEqual({ w: 380, h: 320 });
    expect(baseRadii(it)).toEqual({ tl: 16, tr: 16, bl: 16, br: 16 });
  });

  it("keeps its height when its width changes", () => {
    const it = { ...makeItem("scrollView"), size2: 320 };
    const changed = carryItemSize(it, { w: 412, h: 892 }, { w: 380, h: 892 });
    expect(changed.size2).toBe(Math.round((320 * 348) / 380));
  });

  it.each([
    { value: "horizontal", want: "horizontal" },
    { value: "nested", want: "nested" },
    { value: "sideways", want: "vertical" },
    { value: undefined, want: "vertical" },
  ])("reads a saved direction %s as %s", ({ value, want }) => {
    expect(scrollDirectionOf({ ...makeItem("scrollView"), direction: value as ScrollDirection })).toBe(want);
  });

  it("falls back to the 12dp gap and bounds the item count", () => {
    expect(scrollGapOf({ ...makeItem("scrollView"), gap: 7 })).toBe(12);
    expect(scrollGapOf({ ...makeItem("scrollView"), gap: 16 })).toBe(16);
    expect(scrollItemCountOf({ ...makeItem("scrollView"), itemCount: 99 })).toBe(8);
    expect(scrollItemCountOf({ ...makeItem("scrollView"), itemCount: 0 })).toBe(2);
  });
});

describe("collapsingTopBar model", () => {
  it("starts large-on-canvas with the standard scroll answer", () => {
    const it = makeItem("collapsingTopBar");
    expect(it.label).toBeTruthy();
    expect(barVariantOf(it)).toBe("medium");
    expect(scrollBehaviorOf(it)).toBe("exitUntilCollapsed");
    expect(it.isCollapsed).toBe(false);
    expect(it.showNavigationIcon).toBe(true);
    expect(actionCountOf(it)).toBe(1);
    expect(sizeOf(it, {})).toEqual({ w: 380, h: 112 });
  });

  it("folds to 64dp and grows to 152dp for the large bar", () => {
    expect(sizeOf({ ...makeItem("collapsingTopBar"), isCollapsed: true }, {})).toEqual({ w: 380, h: 64 });
    const large = { ...makeItem("collapsingTopBar"), sizeVariant: "large" as BarVariant };
    expect(sizeOf(large, {})).toEqual({ w: 380, h: 152 });
    expect(collapsingBarHeightOf(large)).toBe(152);
  });

  it("has square corners like the other edge bars", () => {
    expect(baseRadii(makeItem("collapsingTopBar"))).toEqual({ tl: 0, tr: 0, bl: 0, br: 0 });
  });

  it.each([
    { value: "pinned", want: "pinned" },
    { value: "enterAlways", want: "enterAlways" },
    { value: "nonsense", want: "exitUntilCollapsed" },
  ])("reads a saved behavior %s as %s", ({ value, want }) => {
    expect(scrollBehaviorOf({ ...makeItem("collapsingTopBar"), scrollBehavior: value as ScrollBehavior })).toBe(want);
  });
});

describe("saved documents", () => {
  it("accepts the new fields on a registered item", () => {
    expect(isProject(docWith(makeItem("scrollView"), makeItem("collapsingTopBar")))).toBe(true);
  });

  it("rejects invalid saved values", () => {
    expect(isProject(docWith({ ...makeItem("scrollView"), direction: "diagonal" as ScrollDirection }))).toBe(false);
    expect(isProject(docWith({ ...makeItem("collapsingTopBar"), scrollBehavior: "bounce" as ScrollBehavior }))).toBe(false);
  });
});

describe("prompt compiler", () => {
  it.each(["vertical", "horizontal", "nested"] as const)("describes the %s scroll axis", (direction) => {
    const it = { ...makeItem("scrollView"), direction };
    const prompt = buildPrompt(docWith(it), {}, undefined, "en");
    const axis = direction === "vertical" ? "vertically" : direction === "horizontal" ? "horizontally" : "nested horizontal row";
    expect(prompt).toContain(axis);
    expect(prompt).toContain("Scroll view:");
    expect(prompt).toContain("scroll view scrolling");
  });

  it("names the collapsing M3 bar and its exact scroll behavior", () => {
    const it = { ...makeItem("collapsingTopBar"), scrollBehavior: "enterAlways" as ScrollBehavior, sizeVariant: "large" as BarVariant };
    const prompt = buildPrompt(docWith(it), {}, undefined, "en");
    expect(prompt).toContain("Collapsing top app bar:");
    expect(prompt).toContain("enterAlways");
    expect(prompt).toContain("NestedScrollConnection");
    expect(prompt).toContain("SliverAppBar");
  });
});

describe("Tidy", () => {
  const frame = { id: "f", name: "Home", x: 0, y: 0 };
  it("pins a collapsing top bar to the top edge", () => {
    const group = { id: "g", x: 40, y: 300, axis: "x" as const, items: [{ ...makeItem("collapsingTopBar"), id: "bar" }] };
    const out = tidyFrame([group], frame, [frame], {});
    const placed = out!.find((g) => g.id === "g")!;
    expect([placed.x, placed.y]).toEqual([0, 0]);
  });

  it("puts a scroll view on the 16dp content margin", () => {
    const group = { id: "g", x: 93, y: 311, axis: "x" as const, items: [{ ...makeItem("scrollView"), id: "scroll" }] };
    const out = tidyFrame([group], frame, [frame], {});
    const placed = out!.find((g) => g.id === "g")!;
    expect(placed.x).toBe(16);
  });
});
