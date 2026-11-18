import { BAR_VARIANTS, CAROUSEL_LAYOUTS, DATE_LAYOUTS, Doc, KIND_ORDER, Kind, SCROLL_BEHAVIORS, SCROLL_DIRECTIONS, TIME_LAYOUTS, VARIANTS, isCardAlign, isCardImagePos, isPlace, isTextToken, isPlatform, isTrackThickness } from "./tokens";
import { EVENT_TYPES } from "./logicEngine";

/* A project file is the Doc as JSON, nothing more. Reading one back only checks
 * the shape the editor relies on; the same migrations that run on a saved
 * document then bring an older file up to date. */

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const KINDS = new Set<string>(KIND_ORDER);

const validTabs = (tabs: unknown) =>
  tabs === undefined || (Array.isArray(tabs) && tabs.every((tab) => isRecord(tab) && typeof tab.label === "string" && (typeof tab.icon === "string" || tab.icon === null || tab.icon === undefined) && (tab.src === undefined || typeof tab.src === "string")));

const validCorners = (c: unknown) => c === undefined || (isRecord(c) && ["tl", "tr", "bl", "br"].every((k) => Number.isFinite(c[k])));

/** the layouts a carousel and the two pickers may be saved with */
const LAYOUTS = new Set<string>([...CAROUSEL_LAYOUTS, ...DATE_LAYOUTS, ...TIME_LAYOUTS].map((l) => l.key));
const optionalNumber = (v: unknown) => v === undefined || Number.isFinite(v);
/** the sets the new content widgets' unions may be saved with */
const GRID_CELLS = new Set<string>(["image", "card", "iconTile"]);
const GRID_ASPECTS = new Set<string>(["1:1", "4:3"]);
const CHART_TYPES = new Set<string>(["bar", "line", "donut"]);
const PART_MODES = new Set<string>(["compact", "expanded", "single", "group"]);
const PART_SCALES = new Set<string>(["sm", "md", "lg"]);
/** the sets the scroll view and the collapsing bar's unions may be saved with */
const SCROLL_DIRS = new Set<string>(SCROLL_DIRECTIONS.map((d) => d.key));
const BAR_SIZES = new Set<string>(BAR_VARIANTS.map((v) => v.key));
const SCROLL_RULES = new Set<string>(SCROLL_BEHAVIORS.map((b) => b.key));
const LOGIC_TYPES = new Set<string>(EVENT_TYPES);
/** a saved graph is accepted when it has the three lists and only known node kinds; unknown
 *  legacy types are dropped by migrateLogicGraph when the document is opened */
const validLogic = (v: unknown) =>
  isRecord(v) && Array.isArray(v.nodes) && Array.isArray(v.connections) && Array.isArray(v.variables) &&
  (v.nodes as unknown[]).every((n) => isRecord(n) && typeof n.id === "string" && LOGIC_TYPES.has(String(n.type)));

const validItem = (item: unknown) =>
  isRecord(item) &&
  validCorners(item.corners) &&
  (item.railExpanded === undefined || typeof item.railExpanded === "boolean") &&
  (item.railModal === undefined || typeof item.railModal === "boolean") &&
  (item.collapseOnScroll === undefined || typeof item.collapseOnScroll === "boolean") &&
  (item.trackThickness === undefined || isTrackThickness(item.trackThickness)) &&
  (item.imagePos === undefined || isCardImagePos(item.imagePos)) &&
  (item.imageSize === undefined || (Number.isFinite(item.imageSize) && (item.imageSize as number) > 0)) &&
  (item.contentAlign === undefined || isCardAlign(item.contentAlign)) &&
  (item.textAlign === undefined || isCardAlign(item.textAlign)) &&
  (item.textColor === undefined || isTextToken(item.textColor)) &&
  typeof item.id === "string" &&
  typeof item.kind === "string" &&
  KINDS.has(item.kind as Kind) &&
  typeof item.label === "string" &&
  (typeof item.icon === "string" || item.icon === null) &&
  VARIANTS.some((variant) => variant.key === item.variant) &&
  (item.supporting === undefined || typeof item.supporting === "string") &&
  (item.selected === undefined || Number.isFinite(item.selected)) &&
  (item.note === undefined || typeof item.note === "string") &&
  (item.layout === undefined || (typeof item.layout === "string" && LAYOUTS.has(item.layout))) &&
  optionalNumber(item.count) &&
  optionalNumber(item.size) &&
  optionalNumber(item.size2) &&
  optionalNumber(item.radiusTop) &&
  optionalNumber(item.radiusBottom) &&
  optionalNumber(item.value) &&
  (item.src === undefined || typeof item.src === "string") &&
  (item.autoplay === undefined || typeof item.autoplay === "boolean") &&
  (item.loop === undefined || typeof item.loop === "boolean") &&
  (item.muted === undefined || typeof item.muted === "boolean") &&
  (item.showControls === undefined || typeof item.showControls === "boolean") &&
  optionalNumber(item.columns) &&
  optionalNumber(item.rows) &&
  optionalNumber(item.gap) &&
  (item.cellVariant === undefined || GRID_CELLS.has(item.cellVariant as string)) &&
  (item.aspectRatio === undefined || GRID_ASPECTS.has(item.aspectRatio as string)) &&
  (item.chartType === undefined || CHART_TYPES.has(item.chartType as string)) &&
  (item.mode === undefined || PART_MODES.has(item.mode as string)) &&
  (item.scale === undefined || PART_SCALES.has(item.scale as string)) &&
  (item.duration === undefined || typeof item.duration === "string") &&
  (item.showHeader === undefined || typeof item.showHeader === "boolean") &&
  (item.striped === undefined || typeof item.striped === "boolean") &&
  (item.showLabel === undefined || typeof item.showLabel === "boolean") &&
  (item.interactive === undefined || typeof item.interactive === "boolean") &&
  (item.showFrame === undefined || typeof item.showFrame === "boolean") &&
  (item.showLegend === undefined || typeof item.showLegend === "boolean") &&
  (item.showGrid === undefined || typeof item.showGrid === "boolean") &&
  (item.showAddressBar === undefined || typeof item.showAddressBar === "boolean") &&
  (item.showStatus === undefined || typeof item.showStatus === "boolean") &&
  (item.isPlaying === undefined || typeof item.isPlaying === "boolean") &&
  (item.direction === undefined || SCROLL_DIRS.has(item.direction as string)) &&
  (item.showScrollbar === undefined || typeof item.showScrollbar === "boolean") &&
  optionalNumber(item.itemCount) &&
  (item.clipContent === undefined || typeof item.clipContent === "boolean") &&
  (item.sizeVariant === undefined || BAR_SIZES.has(item.sizeVariant as string)) &&
  (item.scrollBehavior === undefined || SCROLL_RULES.has(item.scrollBehavior as string)) &&
  (item.isCollapsed === undefined || typeof item.isCollapsed === "boolean") &&
  (item.showNavigationIcon === undefined || typeof item.showNavigationIcon === "boolean") &&
  optionalNumber(item.actionCount) &&
  validTabs(item.tabs);

const validGroup = (group: unknown) =>
  isRecord(group) &&
  typeof group.id === "string" &&
  Number.isFinite(group.x) &&
  Number.isFinite(group.y) &&
  (group.axis === "x" || group.axis === "y") &&
  (group.locked === undefined || typeof group.locked === "boolean") &&
  Array.isArray(group.items) &&
  group.items.length > 0 &&
  group.items.every(validItem);

const validFrame = (frame: unknown) =>
  isRecord(frame) &&
  typeof frame.id === "string" &&
  typeof frame.name === "string" &&
  Number.isFinite(frame.x) &&
  Number.isFinite(frame.y) &&
  (frame.w === undefined || (Number.isFinite(frame.w) && (frame.w as number) > 0)) &&
  (frame.h === undefined || (Number.isFinite(frame.h) && (frame.h as number) > 0)) &&
  (frame.note === undefined || typeof frame.note === "string") &&
  (frame.place === undefined || isPlace(frame.place)) &&
  (frame.length === undefined || (Number.isFinite(frame.length) && (frame.length as number) > 0));

/** whether a parsed file has the shape of a document the editor can open */
export const isProject = (value: unknown): value is Doc =>
  isRecord(value) && Array.isArray(value.groups) && Array.isArray(value.frames) && value.groups.every(validGroup) && value.frames.every(validFrame) && (value.platform === undefined || isPlatform(value.platform)) && (value.promptOptions === undefined || (Array.isArray(value.promptOptions) && value.promptOptions.every((o) => typeof o === "string"))) && (value.logic === undefined || validLogic(value.logic));

/** the file name a project is saved under: m3e-canvas, followed by the app's name when it has one */
export const projectFileName = (doc: Doc) => {
  const name = doc.title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return name ? `m3e-canvas ${name}.json` : "m3e-canvas.json";
};

/** hands the document to the browser as a JSON download */
export function saveProject(doc: Doc) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = projectFileName(doc);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** reads a chosen file back into a document, or null when it is not one */
export async function readProject(file: File): Promise<Doc | null> {
  try {
    const next: unknown = JSON.parse(await file.text());
    return isProject(next) ? next : null;
  } catch {
    return null;
  }
}
