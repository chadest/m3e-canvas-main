"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Palette, Place } from "@/lib/tokens";
import { IconBtn, TidyButton, TidyState } from "./ui";
import { CanvasToolbar } from "./CanvasToolbar";
import { Icon } from "./M3Node";
import { Popover } from "./Menus";
import { Lang, t, useLang } from "@/lib/i18n";

export type Mode = "select" | "hand";

/** the strip along the top of the canvas: the canvas below it starts this far down */
export const HEADER_H = 52;

const REPO_URL = "https://github.com/lnkiai/m3e-canvas";

export function GitHubLink({ p, size = 40, onClick }: { p: Palette; size?: number; onClick?: () => void }) {
  const mark = (
    <svg width={Math.round(size * 0.55)} height={Math.round(size * 0.55)} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: size / 2,
    display: "grid",
    placeItems: "center",
    color: p.onSurfaceVariant,
    textDecoration: "none",
    flex: "0 0 auto",
  };
  if (onClick)
    return (
      <button onClick={onClick} title="GitHub" aria-label="GitHub" className="m3-press" style={{ ...style, border: "none", background: "transparent", cursor: "pointer" }}>
        {mark}
      </button>
    );
  return (
    <a href={REPO_URL} target="_blank" rel="noreferrer" title="GitHub" aria-label="GitHub" className="m3-press" style={style}>
      {mark}
    </a>
  );
}

function Pill({ p, children }: { p: Palette; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: 6,
        borderRadius: 28,
        userSelect: "none",
        background: p.surfaceContainerLow,
        boxShadow: "0 2px 10px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)",
        pointerEvents: "auto",
      }}
    >
      {children}
    </div>
  );
}

/** A flat button for the canvas header: no floating chrome, a quiet tint on hover. */
function HeaderBtn({
  icon,
  title,
  onClick,
  p,
  disabled,
  active,
  fill,
  size = 40,
  children,
}: {
  icon?: string;
  title: string;
  onClick?: () => void;
  p: Palette;
  disabled?: boolean;
  active?: boolean;
  fill?: boolean;
  size?: number;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      data-on={active ? "1" : undefined}
      className="m3-press m3-header-btn"
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        border: "none",
        color: disabled ? "#B9B4C0" : active ? p.primary : p.onSurfaceVariant,
        cursor: disabled ? "default" : "pointer",
        display: "grid",
        placeItems: "center",
        flex: "0 0 auto",
      }}
    >
      {children ?? <Icon name={icon ?? ""} size={Math.round(size * 0.55)} fill={fill} />}
    </button>
  );
}

/** The design's name, sitting in the middle of the header. A click turns the words
 *  into a field, and a commit hands the new name back to the editor. */
function TitleField({ name, onRename, p }: { name: string; onRename: (name: string) => void; p: Palette }) {
  const lang = useLang();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);
  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
    else setDraft(name);
  };
  if (editing)
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(name);
            setEditing(false);
          }
        }}
        aria-label={t("rename", lang)}
        style={{
          width: "min(280px, 28vw)",
          height: 36,
          padding: "0 12px",
          borderRadius: 10,
          border: `1px solid ${p.primary}`,
          background: "#fff",
          color: p.onSurface,
          fontSize: 14,
          fontWeight: 600,
          outline: "none",
        }}
      />
    );
  return (
    <button
      onClick={() => setEditing(true)}
      title={t("rename", lang)}
      className="m3-press"
      style={{
        height: 36,
        padding: "0 12px",
        maxWidth: "min(320px, 30vw)",
        borderRadius: 10,
        border: "none",
        background: "transparent",
        color: p.onSurface,
        fontSize: 14,
        fontWeight: 600,
        cursor: "text",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        flex: "0 1 auto",
      }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name || t("untitledProject", lang)}</span>
      <Icon name="edit" size={14} color={p.onSurfaceVariant} />
    </button>
  );
}

export function Toolbar({
  p,
  mode,
  onMode,
  zoom,
  onZoom,
  onFit,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onPreview,
  mobile,
  onOpenRight,
  onPrompt,
  onSettings,
  onLangSheet,
  tidy,
  onTidy,
  place,
  onPlace,
  note,
  onSaveProject,
  onOpenProject,
  onProjects,
  onHome,
  showAddScreen,
  onAddScreen,
  captureFrame,
  onCaptureFrame,
  canDelete,
  onDeleteSelected,
  isOnline,
  canInstall,
  onInstall,
  projectName,
  onRenameTitle,
  saveState = "idle",
  shareState = "idle",
  onDraftKeep,
  onDraftUndo,
  onDraftSave,
}: {
  p: Palette;
  mode: Mode;
  onMode: (m: Mode) => void;
  zoom: number;
  onZoom: (z: number) => void;
  onFit: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onPreview: () => void;
  mobile?: boolean;
  /** opens the property panel; absent while it is open */
  onOpenRight?: () => void;
  onPrompt?: () => void;
  onSettings?: () => void;
  /** phone: open the language sheet instead of the menu */
  onLangSheet?: () => void;
  /** the tidy button for the screen being worked on; absent when no screen is in play */
  tidy?: TidyState;
  onTidy?: () => void;
  place?: Place;
  onPlace?: (place: Place) => void;
  /** a short message shown beside the tidy button for a moment */
  note?: { text: string; icon: string } | null;
  onSaveProject?: () => void;
  onOpenProject?: () => void;
  /** opens the projects dashboard */
  onProjects?: () => void;
  /** returns to the landing page */
  onHome?: () => void;
  /** the canvas has no screen: the header offers the way back in */
  showAddScreen?: boolean;
  onAddScreen?: () => void;
  /** a screen is selected, so it can be captured */
  captureFrame?: boolean;
  /** captures the selected screen as a JPG */
  onCaptureFrame?: () => void;
  /** at least one part is selected, so Delete is offered on the canvas toolbar */
  canDelete?: boolean;
  onDeleteSelected?: () => void;
  /** offline badge and native install action */
  isOnline?: boolean;
  canInstall?: boolean;
  onInstall?: () => void;
  /** the project on the canvas, as words in the middle of the header */
  projectName?: string;
  /** the header's words were renamed */
  onRenameTitle?: (name: string) => void;
  /** whether auto-save has caught up with the canvas */
  saveState?: "idle" | "saving" | "saved";
  /** review while the draft waits to be kept or undone */
  shareState?: "idle" | "busy" | "review";
  onDraftKeep?: () => void;
  onDraftUndo?: () => void;
  /** saves the arrived design as a project file, the same as the header's save */
  onDraftSave?: () => void;
}) {
  const lang = useLang();
  /* the site itself, not the design being edited: the header's full-screen switch */
  const [full, setFull] = useState(false);
  useEffect(() => {
    const sync = () => setFull(!!document.fullscreenElement);
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen().catch(() => {});
  };
  if (mobile) {
    const S = 42;
    return (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 10,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
          zIndex: 40,
          padding: "0 8px",
        }}
      >
        <Pill p={p}>
          <IconBtn icon="undo" p={p} onClick={onUndo} disabled={!canUndo} title={t("undo", lang)} size={S} />
          <IconBtn icon="redo" p={p} onClick={onRedo} disabled={!canRedo} title={t("redo", lang)} size={S} />
          <IconBtn icon="translate" p={p} onClick={onLangSheet} title={t("language", lang)} size={S} />
          <IconBtn icon="palette" p={p} onClick={onSettings} title={t("settings", lang)} size={S} />
          <GitHubLink p={p} size={S} />
          <button
            onClick={onPrompt}
            title={t("copyPrompt", lang)}
            className="m3-press"
            style={{
              height: S,
              padding: "0 14px 0 10px",
              borderRadius: S / 2,
              border: "none",
              background: p.primary,
              color: p.onPrimary,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            <Icon name="auto_awesome" size={22} />
            {t("prompt", lang)}
          </button>
        </Pill>
      </div>
    );
  }
  return (
    <>
      {/* notices sit just under the header pills so they are seen where the eye already is */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: HEADER_H + 12,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
          zIndex: 40,
        }}
      >
        <div role="status" aria-live="polite" style={{ display: "contents" }}>
          <AnimatePresence>
            {note && (
            <motion.div
              key="note"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
              style={{
                height: 40,
                padding: "0 16px",
                borderRadius: 20,
                background: p.inverseSurface,
                color: p.inverseOnSurface,
                fontSize: 13,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                whiteSpace: "nowrap",
                boxShadow: "0 2px 10px rgba(0,0,0,0.10)",
                pointerEvents: "none",
              }}
            >
              <Icon name={note.icon} size={18} />
              {note.text}
            </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* the canvas tools sit centred at the foot of the canvas */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 22,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
          zIndex: 40,
        }}
      >
        <CanvasToolbar
          p={p}
          mode={mode}
          onMode={onMode}
          onZoomIn={() => onZoom(zoom * 1.2)}
          onZoomOut={() => onZoom(zoom / 1.2)}
          onFit={onFit}
          onPreview={onPreview}
          canDelete={canDelete}
          onDelete={onDeleteSelected}
        />
      </div>
      {shareState === "review" && onDraftUndo && onDraftKeep && (
        <div style={{ position: "absolute", left: 22, bottom: 22, zIndex: 40, pointerEvents: "none" }}>
          <Pill p={p}>
            {/* the draft waits for a verdict: undo sits quietly, keep is the primary action */}
            {[
              { icon: "undo", title: t("draftUndo", lang), onClick: onDraftUndo, primary: false },
              { icon: "check", title: t("draftKeep", lang), onClick: onDraftKeep, primary: true },
              ...(onDraftSave ? [{ icon: "download", title: t("saveProject", lang), onClick: onDraftSave, primary: false }] : []),
            ].map((b) => (
              <button
                key={b.icon}
                onClick={b.onClick}
                title={b.title}
                aria-label={b.title}
                className="m3-press"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  border: "none",
                  background: b.primary ? p.primary : p.surfaceContainerHigh,
                  color: b.primary ? p.onPrimary : p.onSurfaceVariant,
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icon name={b.icon} size={22} />
              </button>
            ))}
          </Pill>
        </div>
      )}
      {/* a standard header across the top of the canvas: flat, white, one hairline below it */}
      <header
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: HEADER_H,
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "0 10px 0 14px",
          background: "#fff",
          borderBottom: "1px solid #E5E7EB",
          zIndex: 41,
          pointerEvents: "auto",
          userSelect: "none",
        }}
      >
        <HeaderBtn icon="undo" p={p} onClick={onUndo} disabled={!canUndo} title={t("undo", lang)} />
        <HeaderBtn icon="redo" p={p} onClick={onRedo} disabled={!canRedo} title={t("redo", lang)} />
        <div aria-hidden style={{ width: 1, height: 24, margin: "0 6px", background: "#E5E7EB" }} />
        {tidy && onTidy && (
          <TidyButton state={tidy} onClick={onTidy} p={p} iconOnly place={place} onPlace={onPlace} />
        )}
        <HeaderBtn icon="delete_sweep" p={p} onClick={onClear} title={t("clearAll", lang)} />
        {onSaveProject && onOpenProject && (
          <Popover p={p} icon="folder_open" title={t("project", lang)} size={40}>
            {(close) => (
              <div style={{ display: "flex", gap: 2 }}>
                <IconBtn
                  icon="download"
                  p={p}
                  size={44}
                  title={t("saveProject", lang)}
                  onClick={() => {
                    close();
                    onSaveProject();
                  }}
                />
                <IconBtn
                  icon="upload"
                  p={p}
                  size={44}
                  title={t("openProject", lang)}
                  onClick={() => {
                    close();
                    onOpenProject();
                  }}
                />
              </div>
            )}
          </Popover>
        )}
        {onHome && <HeaderBtn icon="home" p={p} onClick={onHome} title={t("home", lang)} />}
        {onProjects && <HeaderBtn icon="dashboard" p={p} onClick={onProjects} title={t("projects", lang)} />}
        {showAddScreen && onAddScreen && <HeaderBtn icon="add" p={p} onClick={onAddScreen} title={t("addFrame", lang)} />}
        {captureFrame && onCaptureFrame && <HeaderBtn icon="photo_camera" p={p} onClick={onCaptureFrame} title={t("captureScreen", lang)} />}
        {isOnline === false && (
          <span
            role="status"
            title={t("savedLocally", lang)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 12px", borderRadius: 14, background: p.secondaryContainer, color: p.onSecondaryContainer, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", flex: "0 0 auto" }}
          >
            <Icon name="wifi_off" size={14} />
            {t("offlineMode", lang)} · {t("savedLocally", lang)}
          </span>
        )}
        {canInstall && onInstall && <HeaderBtn icon="download" p={p} onClick={onInstall} title={t("installApp", lang)} />}
        {onRenameTitle && projectName !== undefined && <TitleField name={projectName} onRename={onRenameTitle} p={p} />}
        {saveState !== "idle" && projectName !== undefined && (
          <span
            role="status"
            title={t(saveState === "saving" ? "savingBadge" : "savedBadge", lang)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              height: 26,
              padding: "0 10px",
              borderRadius: 13,
              background: p.surfaceContainerLow,
              color: p.onSurfaceVariant,
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: "nowrap",
              flex: "0 0 auto",
            }}
          >
            <Icon name={saveState === "saving" ? "progress_activity" : "cloud_done"} size={14} />
            {t(saveState === "saving" ? "savingBadge" : "savedBadge", lang)}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <HeaderBtn
          icon={full ? "fullscreen_exit" : "fullscreen"}
          p={p}
          onClick={toggleFull}
          active={full}
          title={t(full ? "exitFullscreenSite" : "fullscreenSite", lang)}
        />
        {onOpenRight && (
          <HeaderBtn icon="right_panel_open" p={p} onClick={onOpenRight} active title={t("edit", lang)} />
        )}
      </header>
    </>
  );
}
