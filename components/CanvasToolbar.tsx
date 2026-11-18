"use client";

import { Hand, Maximize2, MousePointer2, Play, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { Palette } from "@/lib/tokens";
import { t, useLang } from "@/lib/i18n";

export type CanvasTool = "select" | "hand";

/** The canvas tools at the foot of the workspace: select / hand, then zoom out, zoom in and fit.
 *  A compact white pill centred under the canvas, as the reference design. */
export function CanvasToolbar({
  p,
  mode,
  onMode,
  onZoomIn,
  onZoomOut,
  onFit,
  onPreview,
  canDelete,
  onDelete,
}: {
  p: Palette;
  mode: CanvasTool;
  onMode: (mode: CanvasTool) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onPreview: () => void;
  /** the selected parts can be removed from the canvas */
  canDelete?: boolean;
  onDelete?: () => void;
}) {
  const lang = useLang();
  return (
    <div
      role="toolbar"
      aria-label="Canvas tools"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px 6px 6px",
        borderRadius: 999,
        background: p.surface,
        border: `1px solid ${p.outlineVariant}`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        pointerEvents: "auto",
        userSelect: "none",
      }}
    >
      <ToolButton
        title={t("select", lang)}
        active={mode === "select"}
        onClick={() => onMode("select")}
        p={p}
      >
        <MousePointer2 size={18} strokeWidth={2} />
      </ToolButton>
      <ToolButton
        title={t("hand", lang)}
        active={mode === "hand"}
        onClick={() => onMode("hand")}
        p={p}
      >
        <Hand size={18} strokeWidth={1.85} />
      </ToolButton>
      <div aria-hidden style={{ width: 1, height: 20, margin: "0 4px", background: p.outlineVariant }} />
      <ToolButton title={t("zoomIn", lang)} onClick={onZoomIn} p={p}>
        <ZoomIn size={18} strokeWidth={1.85} />
      </ToolButton>
      <ToolButton title={t("zoomOut", lang)} onClick={onZoomOut} p={p}>
        <ZoomOut size={18} strokeWidth={1.85} />
      </ToolButton>
      <ToolButton title={t("fit", lang)} onClick={onFit} p={p}>
        <Maximize2 size={18} strokeWidth={1.85} />
      </ToolButton>
      <div aria-hidden style={{ width: 1, height: 20, margin: "0 4px", background: p.outlineVariant }} />
      <ToolButton title={t("preview", lang)} onClick={onPreview} p={p}>
        <Play size={18} strokeWidth={1.85} fill="currentColor" />
      </ToolButton>
      {onDelete && (
        <>
          <div aria-hidden style={{ width: 1, height: 20, margin: "0 4px", background: p.outlineVariant }} />
          <ToolButton title={t("deleteSelection", lang)} onClick={onDelete} p={p} disabled={!canDelete} danger>
            <Trash2 size={18} strokeWidth={1.85} />
          </ToolButton>
        </>
      )}
    </div>
  );
}

function ToolButton({
  title,
  active,
  onClick,
  p,
  disabled,
  danger,
  children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  p: Palette;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className="m3-press m3-tool-btn"
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        border: "none",
        background: active ? p.primary : "transparent",
        color: danger ? p.error : active ? p.onPrimary : p.onSurfaceVariant,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.38 : 1,
        display: "grid",
        placeItems: "center",
        flex: "0 0 auto",
        transition: "background-color 150ms, color 150ms",
      }}
    >
      {children}
    </button>
  );
}
