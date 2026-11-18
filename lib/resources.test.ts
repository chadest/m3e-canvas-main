import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Doc } from "./tokens";
import {
  RESOURCE_BUDGET,
  SavedResource,
  deleteResource,
  formatBytes,
  loadResources,
  projectResources,
  resourceIcon,
  resourceKindOf,
  resourcePartKind,
  resourcesBytes,
  saveResources,
  upsertResource,
} from "./resources";

let store: Record<string, string> = {};
beforeEach(() => {
  store = {};
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

const resource = (patch: Partial<SavedResource> = {}): SavedResource => ({
  id: "r1",
  name: "photo.png",
  kind: "image",
  mime: "image/png",
  src: "data:image/webp;base64,AAAA",
  size: 1200,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...patch,
});

const doc = (srcs: (string | undefined)[]): Doc => ({
  title: "",
  brief: "",
  paletteKey: "purple",
  frame: "phone",
  frames: [{ id: "f", name: "Home", x: 0, y: 0 }],
  groups: [
    {
      id: "g",
      x: 0,
      y: 0,
      axis: "y",
      items: srcs.map((src, i) => ({ id: `i${i}`, kind: "image" as const, label: "", icon: null, variant: "filled" as const, ...(src ? { src } : {}) })),
    },
  ],
});

describe("resourceKindOf", () => {
  it.each([
    { name: "picture.bin", mime: "image/png", want: "image" },
    { name: "clip.bin", mime: "video/mp4", want: "video" },
    { name: "song.bin", mime: "audio/mpeg", want: "audio" },
    { name: "clip.mov", mime: "", want: "video" },
    { name: "bouncing.json", mime: "", want: "lottie" },
    { name: "animation.json", mime: "application/json", want: "lottie" },
    { name: "data.json", mime: "application/json", want: "lottie" },
    { name: "notes.txt", mime: "text/plain", want: "file" },
    { name: "README", mime: "", want: "file" },
  ])("classifies $name ($mime) as $want", ({ name, mime, want }) => {
    expect(resourceKindOf(name, mime)).toBe(want);
  });
});

describe("resource icons and canvas parts", () => {
  it("maps every kind to an icon and a part", () => {
    for (const kind of ["image", "video", "lottie", "audio", "file"] as const) {
      expect(resourceIcon(kind)).toBeTruthy();
      expect(resourcePartKind(kind)).toBeTruthy();
    }
    expect(resourcePartKind("audio")).toBe("audioPlayer");
    expect(resourcePartKind("file")).toBe("webView");
  });
});

describe("formatBytes", () => {
  it.each([
    { bytes: 0, want: "0 KB" },
    { bytes: 512, want: "512 B" },
    { bytes: 2048, want: "2 KB" },
    { bytes: 2 * 1024 * 1024, want: "2.0 MB" },
  ])("writes $bytes as $want", ({ bytes, want }) => {
    expect(formatBytes(bytes)).toBe(want);
  });
});

describe("the resource shelf", () => {
  it("starts empty and persists what it is given", () => {
    expect(loadResources()).toEqual([]);
    const list = upsertResource(resource());
    expect(list).toEqual([resource()]);
    expect(loadResources()).toEqual([resource()]);
    expect(resourcesBytes()).toBeGreaterThan(0);
    expect(resourcesBytes()).toBeLessThan(RESOURCE_BUDGET);
  });

  it("replaces a file of the same id and keeps the newest first", () => {
    upsertResource(resource({ id: "a" }));
    upsertResource(resource({ id: "b" }));
    const list = upsertResource(resource({ id: "a", name: "new.png" }));
    expect(list.map((r) => r.id)).toEqual(["a", "b"]);
    expect(list[0].name).toBe("new.png");
  });

  it("deletes only the resource asked for", () => {
    upsertResource(resource({ id: "a" }));
    upsertResource(resource({ id: "b" }));
    expect(deleteResource("a").map((r) => r.id)).toEqual(["b"]);
  });

  it("reads a damaged shelf as empty", () => {
    store["m3e:resources"] = "{oops";
    expect(loadResources()).toEqual([]);
    store["m3e:resources"] = JSON.stringify([resource(), { id: 7 }, { bad: true }]);
    expect(loadResources()).toEqual([resource()]);
  });

  it("writes back what loadResources reads", () => {
    saveResources([resource({ id: "x", kind: "video" })]);
    expect(loadResources()[0].kind).toBe("video");
  });
});

describe("projectResources", () => {
  it("collects distinct media references from parts and carousel cards", () => {
    const d = doc([
      "https://example.com/photos/hero.png",
      "https://example.com/photos/hero.png",
      "https://www.youtube.com/watch?v=abc",
      undefined,
    ]);
    const tabs = d.groups[0].items[1];
    tabs.tabs = [{ icon: "", label: "Clip", src: "https://cdn.site/movie.mp4" }];
    const found = projectResources(d);
    expect(found).toHaveLength(3);
    expect(found[0]).toMatchObject({ name: "hero.png", kind: "image", count: 2 });
    expect(found.find((r) => r.src.includes("youtube"))).toMatchObject({ kind: "video", count: 1 });
    expect(found.find((r) => r.name === "movie.mp4")).toMatchObject({ kind: "video", count: 1 });
  });

  it("names a data URL and reads its kind", () => {
    const found = projectResources(doc(["data:image/webp;base64,AAAA"]));
    expect(found).toHaveLength(1);
    expect(found[0].kind).toBe("image");
    expect(found[0].name).toContain("data:image");
  });

  it("has nothing to say about a document without media", () => {
    expect(projectResources(doc([undefined]))).toEqual([]);
  });
});
