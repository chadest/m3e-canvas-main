import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  STORAGE_BUDGET,
  SavedProject,
  countNodes,
  deviceOf,
  duplicateProject,
  exportProjectJson,
  importProjectJson,
  loadProjects,
  makeProject,
  projectFromDoc,
  projectsBytes,
  refreshProject,
  saveProjects,
  templateDoc,
  toggleStarProject,
  upsertProject,
} from "./projects";
import { Doc, Frame, KIND_ORDER } from "./tokens";
import { DevicePreset } from "./projects";

/* a small document the tests keep reshaping */
const doc = (title = "Sketch"): Doc => ({
  title,
  brief: "",
  paletteKey: "purple",
  frame: "phone",
  groups: [],
  frames: [{ id: "f", name: "Home", x: 0, y: 0 }],
});

const project = (patch: Partial<SavedProject> = {}): SavedProject => ({
  id: "p1",
  name: "Sketch",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  devicePreset: "phone",
  screenCount: 1,
  nodeCount: 0,
  themeMode: "light",
  isStarred: false,
  canvasData: doc(),
  ...patch,
});

/* the tests speak to localStorage through a plain object */
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
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("countNodes and deviceOf", () => {
  it("counts every part on every screen", () => {
    const d = doc();
    d.groups = [
      { id: "g1", x: 0, y: 0, axis: "x", items: [{ id: "i1", kind: "button", label: "", icon: null, variant: "filled" }, { id: "i2", kind: "button", label: "", icon: null, variant: "filled" }] },
      { id: "g2", x: 0, y: 0, axis: "y", items: [{ id: "i3", kind: "text", label: "x", icon: null, variant: "filled" }] },
    ];
    expect(countNodes(d)).toBe(3);
  });

  it.each<{ frames: Frame[]; want: DevicePreset }>([
    { frames: [{ id: "f", name: "H", x: 0, y: 0 }], want: "phone" },
    { frames: [{ id: "f", name: "H", x: 0, y: 0, w: 1280, h: 800 }], want: "desktop" },
    { frames: [{ id: "f", name: "H", x: 0, y: 0, w: 600, h: 800 }], want: "tablet" },
  ])("reads the device from the widest screen %#", ({ frames, want }) => {
    expect(deviceOf({ ...doc(), frames })).toBe(want);
  });
});

describe("the shelf in localStorage", () => {
  it("round-trips a project without changing it", () => {
    const p = project();
    upsertProject(p);
    const before = JSON.stringify(p);
    expect(loadProjects()).toEqual([p]);
    expect(JSON.stringify(loadProjects()[0])).toBe(before);
  });

  it("upsert replaces by id and puts the newest first", () => {
    upsertProject(project({ id: "a" }));
    upsertProject(project({ id: "b" }));
    const list = upsertProject(project({ id: "a", name: "New" }));
    expect(list.map((x) => x.id)).toEqual(["a", "b"]);
    expect(list[0].name).toBe("New");
  });

  it("drops a broken shelf rather than losing the whole library", () => {
    store["m3e:projects"] = "{not json";
    expect(loadProjects()).toEqual([]);
    store["m3e:projects"] = JSON.stringify([project(), { id: 42 }, { nope: true }]);
    expect(loadProjects()).toEqual([project()]);
  });

  it("toggleStar flips and persists", () => {
    upsertProject(project());
    expect(toggleStarProject("p1")?.isStarred).toBe(true);
    expect(loadProjects()[0].isStarred).toBe(true);
    expect(toggleStarProject("p1")?.isStarred).toBe(false);
  });

  it("duplicate copies under a new id and unstars it", () => {
    upsertProject(project({ isStarred: true }));
    const copy = duplicateProject("p1");
    expect(copy).not.toBeNull();
    expect(copy!.id).not.toBe("p1");
    expect(copy!.isStarred).toBe(false);
    expect(loadProjects()).toHaveLength(2);
  });

  it("measures what the shelf costs in bytes", () => {
    expect(projectsBytes()).toBe(0);
    upsertProject(project());
    expect(projectsBytes()).toBeGreaterThan(0);
    expect(projectsBytes()).toBeLessThan(STORAGE_BUDGET);
  });
});

describe("makeProject and templates", () => {
  it("names the project after its template", () => {
    const p = makeProject("blankPhone");
    expect(p.name).toBeTruthy();
    expect(p.devicePreset).toBe("phone");
    expect(p.screenCount).toBe(1);
    expect(p.isStarred).toBe(false);
    expect(p.thumbnail).toMatch(/^data:image\/svg\+xml/);
    expect(p.createdAt).toBe(p.updatedAt);
  });

  it("builds a desktop template wide enough to read as one", () => {
    const p = makeProject("analyticsDashboard");
    expect(p.devicePreset).toBe("desktop");
    expect(countNodes(p.canvasData)).toBeGreaterThan(0);
  });

  it.each(["blankPhone", "blankDesktop", "mediaFeed", "analyticsDashboard"] as const)("template %s is a document the editor can open", (key) => {
    const d = templateDoc(key);
    expect(d.frames.length).toBeGreaterThan(0);
    for (const g of d.groups) for (const it of g.items) expect(KIND_ORDER).toContain(it.kind);
  });

  it("refresh recomputes the facts and keeps the name when the title is empty", () => {
    const p = project({ name: "Kept" });
    const next = refreshProject(p, doc(""));
    expect(next.name).toBe("Kept");
    expect(next.canvasData.title).toBe("Kept");
  });

  it("refresh follows a renamed title", () => {
    expect(refreshProject(project(), doc("Renamed")).name).toBe("Renamed");
  });
});

describe("projectFromDoc", () => {
  it("names an untitled document and keeps the name in the canvas", () => {
    const p = projectFromDoc(doc(""));
    expect(p.name).toBeTruthy();
    expect(p.canvasData.title).toBe(p.name);
  });

  it("reads the theme's mode", () => {
    const dark = doc();
    dark.theme = { dark: true, bothModes: false, contrast: "standard", shape: "rounded", font: "roboto", emphasized: false, motion: "standard" };
    expect(projectFromDoc(dark).themeMode).toBe("dark");
    expect(projectFromDoc(doc()).themeMode).toBe("light");
  });
});

describe("importProjectJson", () => {
  it("reads a saved project's own JSON back", async () => {
    const file = new File([JSON.stringify(project())], "p.json", { type: "application/json" });
    const read = await importProjectJson(file);
    expect(read).not.toBeNull();
    expect(read!.id).toBe("p1");
  });

  it("wraps a bare document as a new project", async () => {
    const file = new File([JSON.stringify(doc("Bare"))], "d.json", { type: "application/json" });
    const read = await importProjectJson(file);
    expect(read).not.toBeNull();
    expect(read!.name).toBe("Bare");
    expect(read!.canvasData.title).toBe("Bare");
  });

  it.each(["not json", JSON.stringify({ nope: 1 }), "42"])("rejects junk %s", async (junk) => {
    const file = new File([junk], "x.json", { type: "application/json" });
    expect(await importProjectJson(file)).toBeNull();
  });
});

describe("exportProjectJson", () => {
  it("hands the project to the browser as a download", () => {
    const clicks: string[] = [];
    vi.stubGlobal("document", {
      createElement: () => ({
        download: "",
        href: "",
        click() {
          clicks.push(this.download);
        },
      }),
    });
    const objectURLs: string[] = [];
    vi.stubGlobal("URL", {
      createObjectURL: (blob: Blob) => {
        objectURLs.push(blob.type);
        return "blob:x";
      },
      revokeObjectURL: () => {},
    });
    exportProjectJson(project({ name: "My App" }));
    expect(clicks).toEqual(["m3e-project My App.json"]);
    expect(objectURLs).toEqual(["application/json"]);
  });
});

describe("saveProjects", () => {
  it("writes what loadProjects reads back", () => {
    saveProjects([project({ id: "x" })]);
    expect(loadProjects().map((x) => x.id)).toEqual(["x"]);
  });
});
