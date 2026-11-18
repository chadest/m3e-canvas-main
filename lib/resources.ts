import { Doc, uid } from "./tokens";

/* The shelf of files a design leans on. A resource is kept in this browser as a
 * data URL next to its name and size, so it survives a reload and can be dropped
 * onto the canvas again. The canvas's own media references are read back out of
 * the document instead of stored twice. */

const RESOURCE_KEY = "m3e:resources";
/** a cautious share of the browser's local storage, the projects shelf has its own */
export const RESOURCE_BUDGET = 4 * 1024 * 1024;
/** a file larger than this would crowd out the projects, so it is turned away */
export const MAX_RESOURCE_BYTES = 1.5 * 1024 * 1024;

export type ResourceKind = "image" | "video" | "lottie" | "audio" | "file";

export type SavedResource = {
  id: string;
  name: string;
  kind: ResourceKind;
  mime: string;
  /** a data URL the canvas and the card can both show */
  src: string;
  size: number;
  createdAt: string;
};

/** a media reference already in the canvas, with how many parts use it */
export type ProjectResource = {
  id: string;
  name: string;
  kind: ResourceKind;
  src: string;
  count: number;
};

const isResource = (v: unknown): v is SavedResource => {
  if (typeof v !== "object" || v === null) return false;
  const r = v as SavedResource;
  return typeof r.id === "string" && typeof r.name === "string" && typeof r.src === "string" &&
    typeof r.size === "number" && typeof r.createdAt === "string" &&
    (r.kind === "image" || r.kind === "video" || r.kind === "lottie" || r.kind === "audio" || r.kind === "file");
};

/** everything this browser keeps, with a damaged entry dropped rather than the whole shelf */
export function loadResources(): SavedResource[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(RESOURCE_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isResource) : [];
  } catch {
    return [];
  }
}

export function saveResources(list: SavedResource[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(RESOURCE_KEY, JSON.stringify(list));
  } catch {}
}

export function upsertResource(resource: SavedResource): SavedResource[] {
  const list = loadResources().filter((r) => r.id !== resource.id);
  list.unshift(resource);
  saveResources(list);
  return list;
}

export function deleteResource(id: string): SavedResource[] {
  const list = loadResources().filter((r) => r.id !== id);
  saveResources(list);
  return list;
}

/** how much room the shelf takes, in bytes */
export const resourcesBytes = () => {
  if (typeof localStorage === "undefined") return 0;
  try {
    return (localStorage.getItem(RESOURCE_KEY) ?? "").length;
  } catch {
    return 0;
  }
};

/* ---------- naming what a file is ---------- */

const EXT_KIND: Record<string, ResourceKind> = {
  png: "image", jpg: "image", jpeg: "image", webp: "image", gif: "image", svg: "image", avif: "image", bmp: "image",
  mp4: "video", webm: "video", mov: "video", m4v: "video", ogv: "video",
  json: "lottie", lottie: "lottie",
  mp3: "audio", wav: "audio", ogg: "audio", m4a: "audio", aac: "audio", flac: "audio",
};

/** the shelf's own category for a file, from what the browser says it is and its extension */
export function resourceKindOf(name: string, mime = ""): ResourceKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (/lottie|anim/.test(name.toLowerCase()) && ext === "json") return "lottie";
  return EXT_KIND[ext] ?? "file";
}

/** the icon that speaks for a resource kind */
export const resourceIcon = (kind: ResourceKind): string =>
  ({ image: "image", video: "movie", lottie: "animation", audio: "audio_file", file: "attach_file" })[kind];

/** the part a resource becomes when it is placed on the canvas */
export const resourcePartKind = (kind: ResourceKind): "image" | "video" | "lottie" | "audioPlayer" | "webView" => {
  const parts = { image: "image", video: "video", lottie: "lottie", audio: "audioPlayer", file: "webView" } as const;
  return parts[kind];
};

/** a size people can read */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ---------- what the canvas already uses ---------- */

const kindOfSrc = (src: string): ResourceKind => {
  if (/^data:image\//i.test(src)) return "image";
  if (/^data:video\//i.test(src)) return "video";
  if (/^data:audio\//i.test(src)) return "audio";
  if (/youtube|youtu\.be|vimeo/i.test(src)) return "video";
  return resourceKindOf(src.split(/[?#]/)[0]);
};

/** the last piece of an address or a path, readable as a name */
const nameOfSrc = (src: string): string => {
  if (src.startsWith("data:")) return src.slice(0, 24).replace(/[;,].*$/, "") + "…";
  try {
    const url = /^https?:\/\//.test(src) ? new URL(src) : null;
    /* a video page has no file name: the site and the clip id say more than "watch" */
    if (url && /youtube|youtu\.be|vimeo/i.test(src)) {
      const id = url.searchParams.get("v") ?? url.pathname.split("/").filter(Boolean).pop() ?? "";
      return `${url.host}${id ? " · " + id.slice(0, 12) : ""}`;
    }
    const path = url ? url.pathname : src;
    const last = path.split("/").filter(Boolean).pop() ?? src;
    return decodeURIComponent(last).slice(0, 60) || src.slice(0, 40);
  } catch {
    return src.slice(0, 40);
  }
};

/** every distinct media reference the document holds, with the number of parts using it */
export function projectResources(doc: Doc): ProjectResource[] {
  const found = new Map<string, ProjectResource>();
  const add = (src: string | undefined) => {
    if (typeof src !== "string" || !src.trim()) return;
    const key = src.trim();
    const existing = found.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }
    found.set(key, { id: key, src: key, name: nameOfSrc(key), kind: kindOfSrc(key), count: 1 });
  };
  for (const group of doc.groups)
    for (const item of group.items) {
      add(item.src);
      for (const tab of item.tabs ?? []) add(tab.src);
    }
  return [...found.values()];
}
