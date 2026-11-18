import { Doc, Frame, Group, Item, KIND_SPEC, Kind, Palette, PHONE_H, PHONE_MARGIN, PHONE_W, makeItem, normalizeTheme, paletteOf, uid, layoutOf } from "./tokens";
import { isProject } from "./project";
import { getLang, t } from "./i18n";

/* The projects library: every sketch the author keeps, stored in this browser.
 * A saved project wraps the document the editor already reads and writes — the
 * canvas JSON — with a few facts about it for the dashboard's cards: what it is
 * called, when it last changed, how big it is, and a small picture of it. */

const STORE_KEY = "m3e:projects";
/** id of the project the canvas is currently editing, so auto-save knows where edits land */
export const ACTIVE_KEY = "m3e:projects:active";
/** a generous read on what this browser lets a site keep */
export const STORAGE_BUDGET = 5 * 1024 * 1024;

export type DevicePreset = "phone" | "tablet" | "desktop";

export type SavedProject = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  devicePreset: DevicePreset;
  screenCount: number;
  nodeCount: number;
  /** the scheme the canvas wears, as the color it was grown from, and its mode */
  themeSeed?: string;
  themeMode: "light" | "dark";
  isStarred: boolean;
  /** a small SVG picture of the canvas, as a data URL */
  thumbnail?: string;
  canvasData: Doc;
};

export type TemplateKey = "blankPhone" | "blankDesktop" | "mediaFeed" | "analyticsDashboard";

/* ---------- reading a document back into facts ---------- */

/** how many M3 widgets a document carries */
export const countNodes = (doc: Doc) => doc.groups.reduce((n, g) => n + g.items.length, 0);

/** the device a document is drawn for, from the widest screen it has */
export const deviceOf = (doc: Doc): DevicePreset => {
  const w = doc.frames.reduce((w, f) => Math.max(w, f.w ?? 0), 0);
  if (w > 720) return "desktop";
  if (w > 480) return "tablet";
  return "phone";
};

/** the scheme a document wears, defaults and all */
export const docPalette = (doc: Doc): Palette => paletteOf(doc.paletteKey, doc.customPalette, normalizeTheme(doc.theme));

/** the document as the editor's own save writes it, minus editor-only state */
const docOf = (doc: Doc): Doc => doc;

/* ---------- the library in localStorage ---------- */

const isSavedProject = (v: unknown): v is SavedProject =>
  typeof v === "object" && v !== null &&
  typeof (v as SavedProject).id === "string" &&
  typeof (v as SavedProject).name === "string" &&
  typeof (v as SavedProject).createdAt === "string" &&
  typeof (v as SavedProject).updatedAt === "string" &&
  typeof (v as SavedProject).isStarred === "boolean" &&
  ((v as SavedProject).canvasData === undefined || isProject((v as SavedProject).canvasData));

/** every project this browser keeps, oldest entry lost to a broken file rather than the whole shelf */
export function loadProjects(): SavedProject[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isSavedProject) : [];
  } catch {
    return [];
  }
}

/** writes the whole shelf back */
export function saveProjects(projects: SavedProject[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(projects));
  } catch {}
}

/** the project whose id the canvas is editing, or null when it edits outside the shelf */
export const activeProjectId = (): string | null => (typeof localStorage === "undefined" ? null : localStorage.getItem(ACTIVE_KEY));
export const setActiveProjectId = (id: string | null) => {
  if (typeof localStorage === "undefined") return;
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {}
};

/** one project, put back on the shelf in place of its older self */
export function upsertProject(project: SavedProject): SavedProject[] {
  const list = loadProjects().filter((p) => p.id !== project.id);
  list.unshift(project);
  saveProjects(list);
  return list;
}

export function deleteProject(id: string): SavedProject[] {
  const list = loadProjects().filter((p) => p.id !== id);
  saveProjects(list);
  if (activeProjectId() === id) setActiveProjectId(null);
  return list;
}

/** how much room the shelf takes, in bytes, for the sidebar's gauge */
export const projectsBytes = () => {
  if (typeof localStorage === "undefined") return 0;
  try {
    return (localStorage.getItem(STORE_KEY) ?? "").length;
  } catch {
    return 0;
  }
};

/* ---------- creating, deriving ---------- */

/** a fresh project from a template, named and measured */
export function makeProject(template: TemplateKey): SavedProject {
  const now = new Date().toISOString();
  const canvasData = templateDoc(template);
  const name = t(TEMPLATE_TITLE[template], getLang());
  canvasData.title = name;
  return {
    id: uid(),
    name,
    createdAt: now,
    updatedAt: now,
    devicePreset: deviceOf(canvasData),
    screenCount: canvasData.frames.length,
    nodeCount: countNodes(canvasData),
    themeSeed: docPalette(canvasData).seed,
    themeMode: normalizeTheme(canvasData.theme).dark ? "dark" : "light",
    isStarred: false,
    thumbnail: projectThumbnail(canvasData),
    canvasData,
  };
}

/** a project born from a document — an imported file or the canvas being adopted */
export function projectFromDoc(doc: Doc, name?: string): SavedProject {
  const now = new Date().toISOString();
  const trimmed = name ?? doc.title.trim() ?? "";
  const finalName = trimmed || t("untitledProject", getLang());
  return {
    id: uid(),
    name: finalName,
    createdAt: now,
    updatedAt: now,
    devicePreset: deviceOf(doc),
    screenCount: doc.frames.length,
    nodeCount: countNodes(doc),
    themeSeed: docPalette(doc).seed,
    themeMode: normalizeTheme(doc.theme).dark ? "dark" : "light",
    isStarred: false,
    thumbnail: projectThumbnail(doc),
    canvasData: docOf({ ...doc, title: finalName }),
  };
}

/** brings a saved project up to date with the document the canvas now holds: the
 *  facts and the picture are recomputed, the name follows the title when it has one */
export function refreshProject(prev: SavedProject, doc: Doc): SavedProject {
  const name = doc.title.trim() || prev.name;
  return {
    ...prev,
    name,
    updatedAt: new Date().toISOString(),
    devicePreset: deviceOf(doc),
    screenCount: doc.frames.length,
    nodeCount: countNodes(doc),
    themeSeed: docPalette(doc).seed,
    themeMode: normalizeTheme(doc.theme).dark ? "dark" : "light",
    thumbnail: projectThumbnail(doc),
    canvasData: { ...doc, title: name },
  };
}

export function duplicateProject(id: string): SavedProject | null {
  const src = loadProjects().find((p) => p.id === id);
  if (!src) return null;
  const now = new Date().toISOString();
  const copy: SavedProject = {
    ...src,
    id: uid(),
    name: t("copyOf", getLang()).replace("{name}", src.name),
    isStarred: false,
    createdAt: now,
    updatedAt: now,
    canvasData: { ...src.canvasData, title: t("copyOf", getLang()).replace("{name}", src.name) },
  };
  upsertProject(copy);
  return copy;
}

export function toggleStarProject(id: string): SavedProject | null {
  const list = loadProjects();
  const src = list.find((p) => p.id === id);
  if (!src) return null;
  src.isStarred = !src.isStarred;
  saveProjects(list);
  return src;
}

/* ---------- files ---------- */

/** hands a project to the browser as a JSON download */
export function exportProjectJson(project: SavedProject) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `m3e-project ${project.name.replace(/[\\/:*?"<>|]+/g, " ").trim() || "untitled"}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** reads a chosen file back into a project: either a saved project's own JSON or a
 *  bare document the editor used to hand out; null when it is neither */
export async function importProjectJson(file: File): Promise<SavedProject | null> {
  try {
    const value: unknown = JSON.parse(await file.text());
    if (isSavedProject(value) && isProject(value.canvasData)) return value;
    if (isProject(value)) return projectFromDoc(value, typeof (value as Doc).title === "string" ? (value as Doc).title : undefined);
    return null;
  } catch {
    return null;
  }
}

/* ---------- templates ---------- */

export const TEMPLATES: { key: TemplateKey; icon: string; w: number; h: number }[] = [
  { key: "blankPhone", icon: "mobile", w: PHONE_W, h: PHONE_H },
  { key: "blankDesktop", icon: "desktop_windows", w: 1280, h: 800 },
  { key: "mediaFeed", icon: "photo_library", w: PHONE_W, h: PHONE_H },
  { key: "analyticsDashboard", icon: "insert_chart", w: 1280, h: 800 },
];

export const TEMPLATE_TITLE: Record<TemplateKey, Parameters<typeof t>[0]> = {
  blankPhone: "templateBlankPhone",
  blankDesktop: "templateBlankDesktop",
  mediaFeed: "templateMediaFeed",
  analyticsDashboard: "templateAnalytics",
};

const frame = (id: string, name: string, w?: number, h?: number, x = 0, y = 0): Frame => ({ id, name, x, y, ...(w ? { w, h } : {}) });

/** a fresh document for a template, in the language the app speaks */
export function templateDoc(key: TemplateKey): Doc {
  const mk = (k: Kind): Item => makeItem(k);
  const run = (id: string, x: number, y: number, axis: "x" | "y", items: Item[]): Group => ({ id, x, y, axis, items });
  if (key === "blankPhone")
    return { title: "", brief: "", paletteKey: "purple", frame: "phone", groups: [], frames: [frame(uid(), t("home", getLang()))] };
  if (key === "blankDesktop")
    return { title: "", brief: "", paletteKey: "purple", frame: "blank", groups: [], frames: [frame(uid(), t("home", getLang()), 1280, 800)] };
  if (key === "mediaFeed") {
    const bar = mk("topAppBar");
    const strip = mk("carousel");
    const cards = [mk("listItem"), mk("listItem"), mk("listItem")];
    const nav = mk("bottomNav");
    return {
      title: "", brief: "", paletteKey: "purple", frame: "phone",
      groups: [
        run(uid(), 0, 0, "x", [bar]),
        run(uid(), PHONE_MARGIN, 96, "x", [strip]),
        run(uid(), PHONE_MARGIN, 300, "y", cards),
        run(uid(), 0, PHONE_H - KIND_SPEC.bottomNav.h, "x", [nav]),
      ],
      frames: [frame(uid(), t("home", getLang()))],
    };
  }
  /* the analytics dashboard: a wide screen with a header row of charts and a table under them */
  const bar = mk("topAppBar");
  const charts = [mk("chart"), mk("chart"), mk("chart")];
  const big = mk("chart");
  const table = mk("table");
  return {
    title: "", brief: "", paletteKey: "purple", frame: "blank",
    groups: [
      run(uid(), 0, 0, "x", [bar]),
      run(uid(), 24, 96, "x", charts),
      run(uid(), 24, 356, "x", [big]),
      run(uid(), 24, 620, "x", [table]),
    ],
    frames: [frame(uid(), t("home", getLang()), 1280, 800)],
  };
}

/* ---------- the picture a card shows ---------- */

/** a small SVG of the canvas: its screens as rounded cards and every part a quiet
 *  shape in the scheme's own colors. Drawn from the document, so it survives a reload. */
export function projectThumbnail(doc: Doc, w = 320, h = 200): string {
  const p = docPalette(doc);
  const pad = 12;
  /* the world the screens live in */
  let l = Infinity, r = -Infinity, t2 = Infinity, b = -Infinity;
  for (const f of doc.frames) {
    const fw = f.w ?? PHONE_W;
    const fh = f.h ?? PHONE_H;
    l = Math.min(l, f.x);
    t2 = Math.min(t2, f.y);
    r = Math.max(r, f.x + fw);
    b = Math.max(b, f.y + fh);
  }
  if (!Number.isFinite(l)) {
    l = 0; r = PHONE_W; t2 = 0; b = PHONE_H;
  }
  const worldW = Math.max(1, r - l);
  const worldH = Math.max(1, b - t2);
  const scale = Math.min((w - pad * 2) / worldW, (h - pad * 2) / worldH);
  const ox = (w - worldW * scale) / 2;
  const oy = (h - worldH * scale) / 2;
  const X = (x: number) => (x - l) * scale + ox;
  const Y = (y: number) => (y - t2) * scale + oy;

  /** the color a part reads as, from what it does on the screen */
  const tone = (kind: Kind): string => {
    if (kind === "button" || kind === "fab" || kind === "extendedFab" || kind === "splitButton" || kind === "iconButton" || kind === "chart") return p.primary;
    if (kind === "switch" || kind === "chip" || kind === "checkbox" || kind === "radio" || kind === "slider" || kind === "avatar") return p.secondaryContainer;
    return p.surfaceContainerHigh;
  };

  const parts: string[] = [];
  for (const f of doc.frames) {
    const fw = (f.w ?? PHONE_W) * scale;
    const fh = (f.h ?? PHONE_H) * scale;
    parts.push(`<rect x="${X(f.x).toFixed(1)}" y="${Y(f.y).toFixed(1)}" width="${Math.max(2, fw).toFixed(1)}" height="${Math.max(2, fh).toFixed(1)}" rx="${Math.min(12, fw / 8).toFixed(1)}" fill="${p.surfaceContainer}" stroke="${p.outlineVariant}" stroke-width="1"/>`);
  }
  const widths: Record<string, number> = {};
  for (const g of doc.groups)
    for (const pl of layoutOf(g, widths)) {
      const wpx = Math.max(2, pl.w * scale);
      const hpx = Math.max(2, pl.h * scale);
      const fill = tone(pl.item.kind);
      parts.push(`<rect x="${X(pl.x).toFixed(1)}" y="${Y(pl.y).toFixed(1)}" width="${wpx.toFixed(1)}" height="${hpx.toFixed(1)}" rx="${Math.min(4, hpx / 2).toFixed(1)}" fill="${fill}" opacity="${pl.item.kind === "text" ? 0.55 : 1}"/>`);
    }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img"><rect width="${w}" height="${h}" fill="${p.surface}"/>${parts.join("")}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
