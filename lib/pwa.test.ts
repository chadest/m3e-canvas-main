import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MIT_TEXT, MODIFIED_REPO_URL, NOTICES_TEXT, ORIGINAL_REPO_URL } from "./legal";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("legal disclosures", () => {
  it("carries both copyright lines in the MIT text", () => {
    expect(MIT_TEXT).toContain("Copyright (c) 2026 lnkiai");
    expect(MIT_TEXT).toContain("Copyright (c) 2026 Chades't creative - Modified and extended edition");
    expect(MIT_TEXT).toContain("THE SOFTWARE IS PROVIDED \"AS IS\"");
  });

  it("keeps the third-party attributions and the derivative credit", () => {
    expect(NOTICES_TEXT).toContain("material-components-android");
    expect(NOTICES_TEXT).toContain("Material Symbols");
    expect(NOTICES_TEXT).toContain("Chades't creative");
    expect(ORIGINAL_REPO_URL).toBe("https://github.com/lnkiai/m3e-canvas");
    expect(MODIFIED_REPO_URL).toBe("https://github.com/chadest");
  });

  it("ships the same two copyright lines in LICENSE", () => {
    const license = read("LICENSE");
    expect(license).toContain("Copyright (c) 2026 lnkiai");
    expect(license).toContain("Copyright (c) 2026 Chades't creative - Modified and extended edition");
  });
});

describe("progressive web app", () => {
  it("declares a standalone, offline-capable manifest with three icons", () => {
    const manifest = JSON.parse(read("public/manifest.webmanifest"));
    expect(manifest.name).toContain("M3E Canvas");
    expect(manifest.description).toBe("Offline-capable Material 3 Expressive UI prototyping studio and procedural code generator.");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.orientation).toBe("any");
    expect(manifest.icons).toHaveLength(3);
    expect(manifest.icons.some((i: { purpose: string }) => i.purpose === "maskable")).toBe(true);
  });

  it("versions its cache and precaches the core shell", () => {
    const sw = read("public/sw.js");
    expect(sw).toContain('const CACHE = "m3e-studio-cache-v1"');
    expect(sw).toContain('"/manifest.webmanifest"');
    expect(sw).toContain('"/icons/icon-192.png"');
    expect(sw).toContain("skipWaiting()");
    expect(sw).toContain("clients.claim()");
    expect(sw).toContain('event.data === "SKIP_WAITING"');
  });

  it("uses the three caching strategies", () => {
    const sw = read("public/sw.js");
    expect(sw).toContain("request.mode === \"navigate\"");
    expect(sw).toContain("/_next/static/");
    expect(sw).toContain("url.origin !== self.location.origin");
  });
});
