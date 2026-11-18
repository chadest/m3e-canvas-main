"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Palette } from "@/lib/tokens";
import { Icon } from "./M3Node";
import { ConfirmDialog, IconBtn, Select } from "./ui";
import { LangMenu, Popover } from "./Menus";
import { GitHubLink } from "./Toolbar";
import { AboutModal } from "./AboutModal";
import { usePwa } from "./PwaManager";
import { Lang, t, useLang } from "@/lib/i18n";
import {
  SavedProject,
  STORAGE_BUDGET,
  TEMPLATE_TITLE,
  TemplateKey,
  TEMPLATES,
  countNodes,
  deleteProject,
  duplicateProject,
  exportProjectJson,
  importProjectJson,
  loadProjects,
  projectsBytes,
  toggleStarProject,
  upsertProject,
} from "@/lib/projects";

/* The projects dashboard: the shelf every saved sketch sits on. It reads the
 * library itself and asks the editor only for what only the editor can do —
 * open a project, build one from a template, or adopt the canvas on screen. */

type Filter = "all" | "recent" | "starred" | "templates";
type SortKey = "modified" | "name" | "created";
type ViewMode = "grid" | "list";

const relativeTime = (iso: string, lang: Lang) => {
  const seconds = (Date.now() - Date.parse(iso)) / 1000;
  if (!Number.isFinite(seconds)) return "";
  if (seconds < 60) return t("editedJustNow", lang);
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("editedMinutes", lang).replace("{n}", String(minutes));
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("editedHours", lang).replace("{n}", String(hours));
  return t("editedDays", lang).replace("{n}", String(Math.floor(hours / 24)));
};

const DEVICE_ICON: Record<string, string> = { phone: "mobile", tablet: "tablet", desktop: "desktop_windows" };
const DEVICE_TITLE_KEY: Record<string, "phoneFrame" | "deviceTablet" | "desktopFrame"> = { phone: "phoneFrame", tablet: "deviceTablet", desktop: "desktopFrame" };

/** a project card's picture, or a quiet placeholder where one has not grown yet */
function Thumb({ project, p, lang, list }: { project: SavedProject; p: Palette; lang: Lang; list?: boolean }) {
  return (
    <div
      style={{
        position: "relative",
        height: list ? 64 : 150,
        background: p.surfaceContainer,
        borderRadius: list ? 12 : "16px 16px 0 0",
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
        color: p.outline,
        flex: list ? "0 0 auto" : undefined,
      }}
    >
      {project.thumbnail ? (
        <img
          src={project.thumbnail}
          alt=""
          style={list ? { width: 100, height: 56, borderRadius: 8, objectFit: "cover" } : { width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <Icon name="dashboard" size={list ? 26 : 40} />
      )}
      {!list && (
        <>
          <span title={t(DEVICE_TITLE_KEY[project.devicePreset], lang)} style={{ position: "absolute", left: 10, top: 10, display: "inline-flex", alignItems: "center", gap: 4, height: 24, padding: "0 9px", borderRadius: 12, background: p.inverseSurface, color: p.inverseOnSurface, fontSize: 11, fontWeight: 600 }}>
            <Icon name={DEVICE_ICON[project.devicePreset]} size={13} />
          </span>
          <span style={{ position: "absolute", right: 10, top: 10, display: "inline-flex", alignItems: "center", gap: 4, height: 24, padding: "0 9px", borderRadius: 12, background: p.inverseSurface, color: p.inverseOnSurface, fontSize: 11, fontWeight: 600 }}>
            <Icon name="view_carousel" size={13} />
            {project.screenCount}
          </span>
        </>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  p,
  lang,
  active,
  view,
  editing,
  onEdit,
  onCommit,
  onOpen,
  onRename,
  onDuplicate,
  onExport,
  onDelete,
  onStar,
}: {
  project: SavedProject;
  p: Palette;
  lang: Lang;
  active: boolean;
  view: ViewMode;
  editing: boolean;
  onEdit: (id: string | null) => void;
  onCommit: (id: string, name: string) => void;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
  onStar: () => void;
}) {
  const menu = (close: () => void) => (
    <div role="menu" style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 170 }}>
      {[
        { key: "open", icon: "open_in_new", label: t("openProject", lang), danger: false, onClick: () => { close(); onOpen(); } },
        { key: "rename", icon: "edit", label: t("rename", lang), danger: false, onClick: () => { close(); onRename(); } },
        { key: "duplicate", icon: "content_copy", label: t("duplicate", lang), danger: false, onClick: () => { close(); onDuplicate(); } },
        { key: "export", icon: "download", label: t("exportJson", lang), danger: false, onClick: () => { close(); onExport(); } },
        { key: "delete", icon: "delete", label: t("delete", lang), danger: true, onClick: () => { close(); onDelete(); } },
      ].map((it) => (
        <button
          key={it.key}
          role="menuitem"
          onClick={it.onClick}
          className="m3-press"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 12px",
            borderRadius: 12,
            border: "none",
            background: "transparent",
            color: it.danger ? p.error : p.onSurface,
            fontSize: 13,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <Icon name={it.icon} size={20} />
          {it.label}
        </button>
      ))}
    </div>
  );

  const star = (
    <button
      onClick={onStar}
      title={t("starredProjects", lang)}
      aria-pressed={project.isStarred}
      aria-label={t("starredProjects", lang)}
      className="m3-press"
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        border: "none",
        background: "transparent",
        color: project.isStarred ? p.primary : p.onSurfaceVariant,
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        flex: "0 0 auto",
      }}
    >
      <Icon name="star" size={20} fill={project.isStarred} />
    </button>
  );

  const titleBlock = editing ? (
    <input
      autoFocus
      defaultValue={project.name}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={(e) => onCommit(project.id, e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        if (e.key === "Escape") onEdit(null);
      }}
      aria-label={t("rename", lang)}
      style={{
        flex: 1,
        minWidth: 0,
        height: 34,
        padding: "0 10px",
        borderRadius: 10,
        border: `1px solid ${p.primary}`,
        background: p.surface,
        color: p.onSurface,
        fontSize: 13,
        fontWeight: 600,
        outline: "none",
      }}
    />
  ) : (
    <span
      onDoubleClick={onRename}
      title={project.name}
      style={{
        flex: 1,
        minWidth: 0,
        fontSize: 14,
        fontWeight: 600,
        color: p.onSurface,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        cursor: "text",
      }}
    >
      {project.name}
    </span>
  );

  const meta = (
    <span style={{ fontSize: 11, color: p.onSurfaceVariant, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      {relativeTime(project.updatedAt, lang)} · {countNodes(project.canvasData)} {t("widgets", lang)}
    </span>
  );

  /* the words are their own stopper, so a click renaming or editing a title never opens the project */
  const titleArea = <div onClick={(e) => e.stopPropagation()} style={{ flex: 1, minWidth: 0, display: "flex" }}>{titleBlock}</div>;

  if (view === "list") {
    return (
      <div
        onClick={onOpen}
        className="m3-press"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 10,
          borderRadius: 16,
          border: `1px solid ${active ? p.primary : p.outlineVariant}`,
          background: active ? p.surfaceContainer : p.surfaceContainerLow,
          cursor: "pointer",
        }}
      >
        <Thumb project={project} p={p} lang={lang} list />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {titleArea}
          {meta}
        </div>
        <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 2, flex: "0 0 auto" }}>
          {star}
          <Popover p={p} icon="more_vert" title={t("moreActions", lang)} size={32}>
            {menu}
          </Popover>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onOpen}
      className="m3-press"
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 20,
        border: `1px solid ${active ? p.primary : p.outlineVariant}`,
        background: active ? p.surfaceContainer : p.surfaceContainerLow,
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      <Thumb project={project} p={p} lang={lang} />
      <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {titleArea}
          <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 0, flex: "0 0 auto" }}>
            {star}
            <Popover p={p} icon="more_vert" title={t("moreActions", lang)} size={32}>
              {menu}
            </Popover>
          </div>
        </div>
        {meta}
      </div>
    </div>
  );
}

export function ProjectsDashboard({
  p,
  open,
  activeId,
  hasCurrent,
  onOpen,
  onCreate,
  onAdopt,
  onImport,
  onDeleted,
  onBack,
  onLang,
  onToast,
}: {
  p: Palette;
  open: boolean;
  /** the project the canvas is currently editing, if it edits one from the shelf */
  activeId: string | null;
  /** the canvas holds a design that could be adopted into the shelf */
  hasCurrent: boolean;
  onOpen: (project: SavedProject) => void;
  onCreate: (template: TemplateKey) => void;
  onAdopt: () => void;
  onImport: (project: SavedProject) => void;
  /** a project left the shelf; the editor forgets it when it was the one on the canvas */
  onDeleted?: (id: string) => void;
  onBack: () => void;
  /** the language picker moved here from the editor's top bar */
  onLang?: (lang: Lang) => void;
  onToast: (text: string) => void;
}) {
  const lang = useLang();
  const pwa = usePwa();
  const [projects, setProjects] = useState<SavedProject[]>(() => loadProjects());
  /* a tick keeps the "Edited 5m ago" words honest without touching the library */
  const [, tick] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortKey>("modified");
  const [view, setView] = useState<ViewMode>("grid");
  const [stripOpen, setStripOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setProjects(loadProjects());
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [open]);

  const counts = useMemo(() => {
    const now = Date.now();
    return {
      all: projects.length,
      recent: projects.filter((x) => now - Date.parse(x.updatedAt) < 7 * 24 * 3600 * 1000).length,
      starred: projects.filter((x) => x.isStarred).length,
    };
  }, [projects]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = projects.filter((x) => {
      if (filter === "starred" && !x.isStarred) return false;
      if (filter === "recent" && Date.now() - Date.parse(x.updatedAt) >= 7 * 24 * 3600 * 1000) return false;
      if (q && !(`${x.name}\n${x.description ?? ""}`.toLowerCase().includes(q))) return false;
      return true;
    });
    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name, lang));
    else if (sort === "created") list = [...list].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    else list = [...list].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    return list;
  }, [projects, query, filter, sort, lang]);

  const bytes = projectsBytes();
  const usedPct = Math.min(100, Math.round((bytes / STORAGE_BUDGET) * 100));

  const filters: { key: Filter; icon: string; label: string; count?: number }[] = [
    { key: "all", icon: "apps", label: t("allProjects", lang), count: counts.all },
    { key: "recent", icon: "schedule", label: t("recentProjects", lang), count: counts.recent },
    { key: "starred", icon: "star", label: t("starredProjects", lang), count: counts.starred },
    { key: "templates", icon: "dashboard_customize", label: t("templatesNav", lang) },
  ];

  const commitRename = (id: string, name: string) => {
    setEditingId(null);
    const trimmed = name.trim();
    const list = loadProjects();
    const src = list.find((x) => x.id === id);
    if (!src) return;
    const next = { ...src, name: trimmed || t("untitledProject", lang), canvasData: { ...src.canvasData, title: trimmed || src.canvasData.title } };
    setProjects(upsertProject(next));
  };

  const importFile = async (file: File) => {
    const project = await importProjectJson(file);
    if (!project) {
      onToast(t("importFailed", lang));
      return;
    }
    setProjects(upsertProject(project));
    onImport(project);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="dashboard"
          role="dialog"
          aria-modal
          aria-label={t("projects", lang)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{ position: "fixed", inset: 0, zIndex: 500, background: p.surface, display: "flex", flexDirection: "column" }}
        >
          {/* ---------- the header: back, words, search, sort, view ---------- */}
          <header style={{ display: "flex", alignItems: "center", flexWrap: "wrap", rowGap: 6, gap: 8, padding: "8px 16px", borderBottom: `1px solid ${p.outlineVariant}`, flex: "0 0 auto" }}>
            <IconBtn icon="arrow_back" p={p} onClick={onBack} title={t("backToEditor", lang)} />
            <span style={{ fontSize: 16, fontWeight: 700, color: p.onSurface, whiteSpace: "nowrap" }}>{t("projects", lang)}</span>
            {/* the page name stays left; every control gathers on the right edge */}
            <span style={{ flex: 1, minWidth: 8 }} />
            <div style={{ flex: "0 1 300px", minWidth: 0 }}>
              <label
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  height: 44,
                  padding: "0 16px",
                  borderRadius: 22,
                  background: p.surfaceContainerHigh,
                  color: p.onSurfaceVariant,
                }}
              >
                <Icon name="search" size={20} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("searchProjects", lang)}
                  aria-label={t("searchProjects", lang)}
                  style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", outline: "none", color: p.onSurface, fontSize: 14 }}
                />
                {query && (
                  <button onClick={() => setQuery("")} title={t("delete", lang)} style={{ border: "none", background: "transparent", color: p.onSurfaceVariant, cursor: "pointer", display: "grid", placeItems: "center" }}>
                    <Icon name="close" size={18} />
                  </button>
                )}
              </label>
            </div>
            <Select
              p={p}
              label={t("sortBy", lang)}
              value={sort}
              onChange={(k) => setSort(k as SortKey)}
              options={[
                { key: "modified", label: t("sortModified", lang) },
                { key: "name", label: t("sortName", lang) },
                { key: "created", label: t("sortCreated", lang) },
              ]}
            />
            <IconBtn icon={view === "grid" ? "grid_view" : "view_list"} p={p} onClick={() => setView(view === "grid" ? "list" : "grid")} title={t(view === "grid" ? "viewGrid" : "viewList", lang)} on={view === "grid"} />
            {pwa.isOnline === false && (
              <span role="status" title={t("savedLocally", lang)} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 12px", borderRadius: 15, background: p.secondaryContainer, color: p.onSecondaryContainer, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
                <Icon name="wifi_off" size={14} />
                {t("offlineMode", lang)} · {t("savedLocally", lang)}
              </span>
            )}
            <GitHubLink p={p} size={40} onClick={() => setAboutOpen(true)} />
            {onLang && <LangMenu p={p} onLang={onLang} side="down" size={40} />}
            {pwa.canInstall && !pwa.isStandalone && <IconBtn icon="download" p={p} onClick={() => void pwa.install()} title={t("installApp", lang)} />}
          </header>

          <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
            {/* ---------- the rail: create, filters, storage, import ---------- */}
            <nav aria-label={t("projects", lang)} style={{ width: 248, flex: "0 0 auto", background: p.surfaceContainerLow, borderRight: `1px solid ${p.outlineVariant}`, padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
              <button
                onClick={() => onCreate("blankPhone")}
                className="m3-press"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  height: 56,
                  padding: "0 20px 0 14px",
                  borderRadius: 16,
                  border: "none",
                  background: p.primaryContainer,
                  color: p.onPrimaryContainer,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  alignSelf: "flex-start",
                }}
              >
                <Icon name="add" size={24} />
                {t("newProject", lang)}
              </button>

              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                {filters.map((f) => {
                  const on = filter === f.key;
                  return (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      aria-pressed={on}
                      className="m3-press"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        height: 40,
                        padding: "0 14px",
                        borderRadius: 20,
                        border: "none",
                        background: on ? p.secondaryContainer : "transparent",
                        color: on ? p.onSecondaryContainer : p.onSurfaceVariant,
                        fontSize: 13,
                        fontWeight: on ? 700 : 500,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <Icon name={f.icon} size={20} fill={on} />
                      <span style={{ flex: 1 }}>{f.label}</span>
                      {f.count !== undefined && <span style={{ fontSize: 12, opacity: 0.8 }}>{f.count}</span>}
                    </button>
                  );
                })}
              </div>

              {hasCurrent && !activeId && (
                <button
                  onClick={onAdopt}
                  className="m3-press"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 16,
                    border: `1px dashed ${p.outlineVariant}`,
                    background: p.surfaceContainer,
                    color: p.onSurfaceVariant,
                    fontSize: 12,
                    lineHeight: "16px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <Icon name="library_add" size={20} />
                  <span>
                    <b style={{ color: p.onSurface, display: "block", fontSize: 13 }}>{t("adoptCurrent", lang)}</b>
                    {t("adoptHint", lang)}
                  </span>
                </button>
              )}

              <div style={{ flex: 1 }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: p.onSurfaceVariant, letterSpacing: 0.4, textTransform: "uppercase" }}>{t("storageUsed", lang)}</span>
                <div
                  role="progressbar"
                  aria-valuenow={usedPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  title={`${(bytes / 1024).toFixed(0)} KB`}
                  style={{ height: 6, borderRadius: 3, background: p.surfaceContainerHighest, overflow: "hidden" }}
                >
                  <div style={{ width: `${Math.max(usedPct, bytes > 0 ? 2 : 0)}%`, height: "100%", borderRadius: 3, background: p.primary }} />
                </div>
                <span style={{ fontSize: 11, color: p.onSurfaceVariant }}>{(bytes / 1024).toFixed(0)} KB</span>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="m3-press"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    height: 40,
                    padding: "0 16px",
                    borderRadius: 20,
                    border: `1px solid ${p.outlineVariant}`,
                    background: "transparent",
                    color: p.primary,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    alignSelf: "flex-start",
                  }}
                >
                  <Icon name="upload" size={18} />
                  {t("importJson", lang)}
                </button>
                <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void importFile(f); }} />
              </div>
            </nav>

            {/* ---------- the shelf ---------- */}
            <main style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "16px 20px 32px" }}>
              {/* templates: a strip of quick starts, shown while browsing everything or the templates */}
              {!query && (filter === "all" || filter === "templates") && (
                <section style={{ marginBottom: 20 }}>
                  <button
                    onClick={() => setStripOpen((o) => !o)}
                    aria-expanded={stripOpen}
                    style={{ display: "flex", alignItems: "center", gap: 6, border: "none", background: "transparent", color: p.onSurfaceVariant, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", cursor: "pointer", padding: "0 0 8px" }}
                  >
                    <Icon name={stripOpen ? "keyboard_arrow_up" : "keyboard_arrow_down"} size={18} />
                    {t("templateHint", lang)}
                  </button>
                  {stripOpen && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                      {TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.key}
                          onClick={() => onCreate(tpl.key)}
                          className="m3-press"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: 12,
                            borderRadius: 16,
                            border: `1px solid ${p.outlineVariant}`,
                            background: p.surfaceContainerLow,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span style={{ width: 40, height: 40, borderRadius: 20, background: p.primaryContainer, color: p.onPrimaryContainer, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
                            <Icon name={tpl.icon} size={22} />
                          </span>
                          <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: p.onSurface, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {t(TEMPLATE_TITLE[tpl.key], lang)}
                            </span>
                            <span style={{ fontSize: 11, color: p.onSurfaceVariant }}>{tpl.w} × {tpl.h}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {shown.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "72px 24px", textAlign: "center" }}>
                  <span style={{ width: 96, height: 96, borderRadius: 48, background: p.surfaceContainer, display: "grid", placeItems: "center", color: p.onSurfaceVariant }}>
                    <Icon name={query || filter !== "all" ? "search_off" : "folder_open"} size={44} />
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: p.onSurface }}>{query || filter !== "all" ? t("emptySearchTitle", lang) : t("emptyProjectsTitle", lang)}</span>
                  <span style={{ fontSize: 13, color: p.onSurfaceVariant, maxWidth: 380 }}>{query || filter !== "all" ? t("emptySearchHint", lang) : t("emptyProjectsHint", lang)}</span>
                  {(query || filter !== "all") && (
                    <button
                      onClick={() => { setQuery(""); setFilter("all"); }}
                      className="m3-press"
                      style={{ height: 40, padding: "0 20px", borderRadius: 20, border: `1px solid ${p.outlineVariant}`, background: "transparent", color: p.primary, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      {t("allProjects", lang)}
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: view === "grid" ? "repeat(auto-fill, minmax(248px, 1fr))" : "1fr", gap: 16, alignContent: "start" }}>
                  {shown.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      p={p}
                      lang={lang}
                      view={view}
                      active={project.id === activeId}
                      editing={editingId === project.id}
                      onEdit={setEditingId}
                      onCommit={commitRename}
                      onOpen={() => onOpen(project)}
                      onRename={() => setEditingId(project.id)}
                      onDuplicate={() => {
                        if (duplicateProject(project.id)) setProjects(loadProjects());
                      }}
                      onExport={() => exportProjectJson(project)}
                      onDelete={() => setConfirmId(project.id)}
                      onStar={() => {
                        if (toggleStarProject(project.id)) setProjects(loadProjects());
                      }}
                    />
                  ))}
                </div>
              )}
            </main>
          </div>

          <ConfirmDialog
            open={confirmId !== null}
            title={t("deleteProjectTitle", lang)}
            body={t("deleteProjectBody", lang).replace("{name}", projects.find((x) => x.id === confirmId)?.name ?? "")}
            icon="delete"
            p={p}
            onCancel={() => setConfirmId(null)}
            onConfirm={() => {
              if (confirmId) {
                deleteProject(confirmId);
                setProjects(loadProjects());
                onDeleted?.(confirmId);
              }
              setConfirmId(null);
            }}
          />
          <AboutModal open={aboutOpen} p={p} onClose={() => setAboutOpen(false)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
