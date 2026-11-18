import { describe, expect, it } from "vitest";
import { CHART_VALUES, DONUT_VALUES, formatTime, isPlayableSrc, lottieLayerCount, sortRows, youtubeId } from "./preview";

describe("youtubeId", () => {
  it.each([
    { src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", want: "dQw4w9WgXcQ" },
    { src: "https://youtu.be/dQw4w9WgXcQ", want: "dQw4w9WgXcQ" },
    { src: "https://www.youtube.com/embed/dQw4w9WgXcQ", want: "dQw4w9WgXcQ" },
    { src: "dQw4w9WgXcQ", want: "dQw4w9WgXcQ" },
  ])("finds the id in $src", ({ src, want }) => {
    expect(youtubeId(src)).toBe(want);
  });

  it.each(["", "https://example.com/watch?v=abc", "not-a-video-id", "https://www.youtube.com/"] )("ignores %s", (src) => {
    expect(youtubeId(src)).toBeNull();
  });
});

describe("isPlayableSrc", () => {
  it("accepts uploaded data URLs", () => {
    expect(isPlayableSrc("data:video/mp4;base64,AAAA", "video")).toBe(true);
    expect(isPlayableSrc("data:audio/mpeg;base64,AAAA", "audio")).toBe(true);
  });

  it("accepts direct media addresses", () => {
    expect(isPlayableSrc("https://cdn.site/clip.mp4", "video")).toBe(true);
    expect(isPlayableSrc("https://cdn.site/track.mp3?x=1", "audio")).toBe(true);
  });

  it("refuses pages, names and the wrong kind", () => {
    expect(isPlayableSrc("https://example.com/clip", "video")).toBe(false);
    expect(isPlayableSrc("dQw4w9WgXcQ", "video")).toBe(false);
    expect(isPlayableSrc("https://cdn.site/track.mp3", "video")).toBe(false);
    expect(isPlayableSrc(undefined, "audio")).toBe(false);
  });
});

describe("formatTime", () => {
  it.each([
    { s: 0, want: "0:00" },
    { s: 9, want: "0:09" },
    { s: 65, want: "1:05" },
    { s: 204, want: "3:24" },
  ])("writes $s seconds as $want", ({ s, want }) => {
    expect(formatTime(s)).toBe(want);
  });
});

describe("lottieLayerCount", () => {
  it("counts the layers of a bound JSON animation", () => {
    expect(lottieLayerCount(JSON.stringify({ layers: [{}, {}, {}] }))).toBe(3);
    expect(lottieLayerCount("data:application/json,%7B%22layers%22%3A%5B%7B%7D%2C%7B%7D%5D%7D")).toBe(2);
  });

  it("falls back to zero for a name or broken JSON", () => {
    expect(lottieLayerCount("bouncing.json")).toBe(0);
    expect(lottieLayerCount("{oops")).toBe(0);
  });
});

describe("preview data", () => {
  it("keeps chart and table values stable", () => {
    expect(CHART_VALUES).toEqual([35, 62, 45, 78, 55, 90]);
    expect(DONUT_VALUES).toEqual([55, 25, 20]);
  });

  it("sorts rows without changing the original", () => {
    const rows = [{ n: "B" }, { n: "A" }];
    expect(sortRows(rows, "asc", (r) => r.n).map((r) => r.n)).toEqual(["A", "B"]);
    expect(sortRows(rows, "desc", (r) => r.n).map((r) => r.n)).toEqual(["B", "A"]);
    expect(rows.map((r) => r.n)).toEqual(["B", "A"]);
  });
});
