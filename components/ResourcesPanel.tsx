"use client";

import { useMemo, useRef, useState } from "react";
import { Doc, Palette, uid } from "@/lib/tokens";
import { Icon } from "./M3Node";
import { ConfirmDialog, Field, IconBtn, Segmented, readImage } from "./ui";
import { t, useLang } from "@/lib/i18n";
import {
  MAX_RESOURCE_BYTES,
  RESOURCE_BUDGET,
  ResourceKind,
  SavedResource,
  deleteResource,
  formatBytes,
  loadResources,
  projectResources,
  resourceIcon,
  resourceKindOf,
  resourcesBytes,
  upsertResource,
} from "@/lib/resources";

type Scope = "all" | "project" | "library";
type Filter = "all" | "image" | "video" | "lottie" | "other";
type View = "grid" | "list";

type Entry = {
  key: string;
  name: string;
  kind: ResourceKind;
  src: string;
  origin: "project" | "library";
  size?: number;
  count?: number;
  resource?: SavedResource;
};

/** reads a picked file as a data URL; pictures are trimmed to a sketch-sized WebP first */
const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });

async function fileResource(file: File): Promise<SavedResource | null> {
  const kind = resourceKindOf(file.name, file.type);
  let src: string;
  try {
    src = kind === "image" ? await readImage(file).catch(() => readAsDataUrl(file)) : await readAsDataUrl(file);
  } catch {
    return null;
  }
  if (!src || src.length > MAX_RESOURCE_BYTES) return null;
  return {
    id: uid(),
    name: file.name,
    kind,
    mime: file.type || "application/octet-stream",
    src,
    size: src.length,
    createdAt: new Date().toISOString(),
  };
}

/** the left rail's file shelf: a grid of everything the canvas points at plus a small library
 *  of files kept in this browser. Picking one puts it on the canvas or into the selected part. */
export function ResourcesPanel({
  p,
  project,
  onUse,
  onToast,
}: {
  p: Palette;
  project: Doc;
  onUse: (resource: { src: string; kind: ResourceKind; name: string }) => void;
  onToast: (text: string) => void;
}) {
  const lang = useLang();
  const [list, setList] = useState<SavedResource[]>(() => loadResources());
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<View>("grid");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const projectRefs = useMemo(() => projectResources(project), [project]);
  const entries = useMemo<Entry[]>(
    () => [
      ...projectRefs.map((r) => ({ key: `project:${r.id}`, name: r.name, kind: r.kind, src: r.src, origin: "project" as const, count: r.count })),
      ...list.map((r) => ({ key: `library:${r.id}`, name: r.name, kind: r.kind, src: r.src, origin: "library" as const, size: r.size, resource: r })),
    ],
    [projectRefs, list],
  );
  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return entries.filter((r) => {
      if (scope !== "all" && r.origin !== scope) return false;
      if (filter === "other" ? r.kind === "image" || r.kind === "video" || r.kind === "lottie" : filter !== "all" && r.kind !== filter) return false;
      return !s || r.name.toLowerCase().includes(s);
    });
  }, [entries, q, scope, filter]);

  const bytes = resourcesBytes();
  const usedPct = Math.min(100, Math.round((bytes / RESOURCE_BUDGET) * 100));

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    let room = RESOURCE_BUDGET - resourcesBytes();
    const next: SavedResource[] = [];
    for (const file of Array.from(files)) {
      const resource = await fileResource(file);
      if (!resource) {
        onToast(t("resourceTooLarge", lang).replace("{name}", file.name));
        continue;
      }
      if (resource.size > room) {
        onToast(t("resourceStorageFull", lang));
        break;
      }
      room -= resource.size;
      next.push(resource);
    }
    if (next.length) {
      for (const r of next) upsertResource(r);
      setList(loadResources());
      onToast(t("resourceAdded", lang).replace("{n}", String(next.length)));
    }
  };

  const use = (r: Entry) => onUse({ src: r.src, kind: r.kind, name: r.name });

  const thumbnail = (r: Entry, size: "card" | "row") =>
    r.kind === "image" ? (
      <img src={r.src} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    ) : (
      <Icon name={resourceIcon(r.kind)} size={size === "card" ? 28 : 20} />
    );

  const origin = (r: Entry) => (
    <span
      title={t(r.origin === "project" ? "resScopeProject" : "resScopeLibrary", lang)}
      style={{ fontSize: 10, color: p.onSurfaceVariant, whiteSpace: "nowrap" }}
    >
      {r.origin === "project" ? (r.count ? `${r.count}×` : "") : formatBytes(r.size ?? 0)}
    </span>
  );

  const actions = (r: Entry) =>
    r.resource ? (
      <>
        <IconBtn icon="download" p={p} size={26} title={t("resourceDownload", lang)} onClick={() => { const a = document.createElement("a"); a.href = r.src; a.download = r.name; a.click(); }} />
        <IconBtn icon="delete" p={p} size={26} title={t("delete", lang)} onClick={() => setConfirmId(r.resource!.id)} />
      </>
    ) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      {/* navigation: search, where the files come from, what they are, and grid/list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 12px 8px" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Field value={q} onChange={setQ} placeholder={t("resourceSearch", lang)} p={p} icon="search" height={40} />
          </div>
          <IconBtn icon="upload_file" p={p} onClick={() => fileRef.current?.click()} title={t("addResource", lang)} size={40} />
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Segmented<Scope>
              p={p}
              height={36}
              tight
              label={t("resourceScope", lang)}
              value={scope}
              onChange={setScope}
              options={[
                { key: "all", icon: "apps", label: t("resFilterAll", lang) },
                { key: "project", icon: "description", label: t("resScopeProject", lang) },
                { key: "library", icon: "inventory_2", label: t("resScopeLibrary", lang) },
              ]}
            />
          </div>
          <IconBtn
            icon={view === "grid" ? "grid_view" : "view_list"}
            p={p}
            size={36}
            title={t(view === "grid" ? "resourceViewList" : "resourceViewGrid", lang)}
            onClick={() => setView(view === "grid" ? "list" : "grid")}
          />
        </div>
        <Segmented<Filter>
          p={p}
          height={32}
          tight
          label={t("resourceFilter", lang)}
          value={filter}
          onChange={setFilter}
          options={[
            { key: "all", icon: "apps", title: t("resFilterAll", lang) },
            { key: "image", icon: "image", title: t("resFilterImages", lang) },
            { key: "video", icon: "movie", title: t("resFilterVideo", lang) },
            { key: "lottie", icon: "animation", title: t("resFilterLottie", lang) },
            { key: "other", icon: "attach_file", title: t("resFilterOther", lang) },
          ]}
        />
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            const files = e.target.files;
            e.target.value = "";
            void addFiles(files);
          }}
        />
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "0 8px 12px" }}>
        {visible.length === 0 ? (
          <div role="status" style={{ display: "grid", placeItems: "center", gap: 6, padding: "40px 8px", color: p.outline, fontSize: 12, textAlign: "center" }}>
            <Icon name={q || scope !== "all" || filter !== "all" ? "search_off" : "folder_open"} size={32} />
            <span>{q || scope !== "all" || filter !== "all" ? t("noMatch", lang) : t("resourceEmpty", lang)}</span>
          </div>
        ) : view === "grid" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))", gap: 6 }}>
            {visible.map((r) => (
              <div key={r.key} style={{ borderRadius: 14, border: `1px solid ${p.outlineVariant}`, background: p.surfaceContainerLow, overflow: "hidden" }}>
                <div
                  onClick={() => use(r)}
                  title={`${r.name} — ${t("resourceUse", lang)}`}
                  className="m3-press"
                  style={{ width: "100%", height: 64, background: p.surfaceContainer, cursor: "pointer", display: "grid", placeItems: "center", overflow: "hidden" }}
                >
                  {thumbnail(r, "card")}
                </div>
                <div style={{ padding: "4px 6px 6px", display: "flex", flexDirection: "column", gap: 2 }}>
                  <span title={r.name} style={{ fontSize: 11, color: p.onSurface, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 0, minHeight: 26 }}>
                    <span style={{ flex: 1, minWidth: 0 }}>{origin(r)}</span>
                    {actions(r)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {visible.map((r) => (
              <div
                key={r.key}
                onClick={() => use(r)}
                className="m3-press"
                style={{ display: "flex", alignItems: "center", gap: 8, padding: 6, borderRadius: 12, border: `1px solid ${p.outlineVariant}`, background: p.surfaceContainerLow, cursor: "pointer" }}
              >
                <span style={{ width: 40, height: 40, borderRadius: 8, background: p.surfaceContainer, display: "grid", placeItems: "center", flex: "0 0 auto", overflow: "hidden", color: p.onSurfaceVariant }}>
                  {thumbnail(r, "row")}
                </span>
                <span title={r.name} style={{ flex: 1, minWidth: 0, fontSize: 12, color: p.onSurface, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                {origin(r)}
                <span onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", flex: "0 0 auto" }}>
                  {actions(r)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: "0 0 auto", padding: "8px 14px 12px", borderTop: `1px solid ${p.outlineVariant}`, display: "flex", flexDirection: "column", gap: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: p.onSurfaceVariant }}>{t("resourceStorage", lang)}</span>
        <div role="progressbar" aria-valuenow={usedPct} aria-valuemin={0} aria-valuemax={100} style={{ height: 5, borderRadius: 3, background: p.surfaceContainerHighest, overflow: "hidden" }}>
          <div style={{ width: `${Math.max(usedPct, bytes > 0 ? 2 : 0)}%`, height: "100%", background: p.primary }} />
        </div>
        <span style={{ fontSize: 10, color: p.onSurfaceVariant }}>{formatBytes(bytes)} / {formatBytes(RESOURCE_BUDGET)}</span>
      </div>

      <ConfirmDialog
        open={confirmId !== null}
        title={t("resourceDeleteTitle", lang)}
        body={t("resourceDeleteBody", lang).replace("{name}", list.find((r) => r.id === confirmId)?.name ?? "")}
        icon="delete"
        p={p}
        onCancel={() => setConfirmId(null)}
        onConfirm={() => {
          if (confirmId) {
            deleteResource(confirmId);
            setList(loadResources());
          }
          setConfirmId(null);
        }}
      />
    </div>
  );
}
