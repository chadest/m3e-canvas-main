/* Small, pure helpers behind the preview-only widgets. They keep the parts deterministic in
 * edit mode and let the same sketch behave like a real component once Preview is running. */

/** the video id inside a YouTube watch, short, embed or bare link; null when there is none */
export function youtubeId(src?: string): string | null {
  const value = src?.trim();
  if (!value) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (/youtube\.com$/i.test(url.hostname.replace(/^www\./, ""))) {
      const id = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)?.[1] ?? null;
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (/youtu\.be$/i.test(url.hostname)) {
      const id = url.pathname.split("/").filter(Boolean)[0] ?? null;
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
  } catch {
    /* a bare id is still worth trying */
  }
  return /^[\w-]{11}$/.test(value) ? value : null;
}

/** a media source the browser can actually play (an uploaded data URL or a direct address) */
export function isPlayableSrc(src: string | undefined, kind: "video" | "audio"): boolean {
  const value = src?.trim();
  if (!value) return false;
  if (new RegExp(`^data:${kind}/`, "i").test(value)) return true;
  if (!/^https?:\/\//i.test(value)) return false;
  return new RegExp(`\\.(?:${kind === "video" ? "mp4|webm|ogg|mov|m4v" : "mp3|wav|ogg|m4a|aac|flac"})(?:[?#]|$)`, "i").test(value);
}

/** seconds as m:ss, the way a player's counter reads */
export function formatTime(seconds: number): string {
  const n = Math.max(0, Math.floor(seconds));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}

/** how many vector layers a bound Lottie JSON carries; 0 means it is only a name */
export function lottieLayerCount(src?: string): number {
  const value = src?.trim();
  if (!value) return 0;
  try {
    const json = value.startsWith("data:") ? decodeURIComponent(value.slice(value.indexOf(",") + 1)) : value;
    const data: unknown = JSON.parse(json);
    if (typeof data === "object" && data !== null && Array.isArray((data as { layers?: unknown }).layers))
      return Math.min(8, (data as { layers: unknown[] }).layers.length);
  } catch {
    /* a plain name or URL is the common case: the preview draws its own motion */
  }
  return 0;
}

/** the fixed numbers the chart and the table draw, stable so a sketch never reshuffles */
export const CHART_VALUES = [35, 62, 45, 78, 55, 90] as const;
export const DONUT_VALUES = [55, 25, 20] as const;

export type SortDir = "asc" | "desc";
/** rows ordered by the column the author just tapped */
export function sortRows<T>(rows: T[], dir: SortDir, key: (row: T) => string | number): T[] {
  return [...rows].sort((a, b) => {
    const av = key(a);
    const bv = key(b);
    const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
    return dir === "asc" ? cmp : -cmp;
  });
}
