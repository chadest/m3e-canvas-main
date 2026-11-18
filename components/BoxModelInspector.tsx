"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./M3Node";
import { Palette } from "@/lib/tokens";
import { Section } from "./ui";
import { t, useLang } from "@/lib/i18n";

export type BoxSides = { top: number; right: number; bottom: number; left: number };
export type BoxLayer = "margin" | "border" | "padding" | "content";
export type BoxModelValue = {
  margin: BoxSides;
  border: BoxSides;
  padding: BoxSides;
  content: { width: number; height: number };
};

const COLORS = {
  margin: "#f9cc9d",
  border: "#fddd9b",
  padding: "#c3d08b",
  content: "#8cb6c0",
} as const;

const SIDE_KEYS: (keyof BoxSides)[] = ["top", "right", "bottom", "left"];

function parseNum(raw: string, fallback: number) {
  const n = Number(raw.replace(",", ".").trim());
  return Number.isFinite(n) ? n : fallback;
}

function formatNum(n: number) {
  if (!Number.isFinite(n)) return "0";
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : String(r);
}

function EditableNum({
  value,
  onCommit,
  ariaLabel,
  style,
}: {
  value: number;
  onCommit: (v: number) => void;
  ariaLabel: string;
  style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(formatNum(value));
  }, [value, editing]);

  useEffect(() => {
    if (editing) ref.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const n = parseNum(draft, value);
    if (n !== value) onCommit(n);
    else setDraft(formatNum(value));
  };

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setDraft(formatNum(value));
            setEditing(false);
          }
        }}
        style={{
          width: 34,
          background: "rgba(255,255,255,0.45)",
          border: "1px solid rgba(0,0,0,0.25)",
          borderRadius: 2,
          font: "inherit",
          fontSize: 11,
          lineHeight: 1.2,
          textAlign: "center",
          color: "#1f1f1f",
          padding: "1px 2px",
          outline: "none",
          ...style,
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={ariaLabel}
      title={ariaLabel}
      style={{
        minWidth: 24,
        background: "transparent",
        border: "none",
        padding: "1px 3px",
        margin: 0,
        font: "inherit",
        fontSize: 11,
        lineHeight: 1.2,
        color: "#1f1f1f",
        cursor: "text",
        borderRadius: 2,
        ...style,
      }}
    >
      {formatNum(value)}
    </button>
  );
}

function SideValues({
  sides,
  onChange,
  prefix,
}: {
  sides: BoxSides;
  onChange: (s: BoxSides) => void;
  prefix: string;
}) {
  const pos: Record<keyof BoxSides, React.CSSProperties> = {
    top: { position: "absolute", top: 2, left: "50%", transform: "translateX(-50%)" },
    right: { position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)" },
    bottom: { position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)" },
    left: { position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)" },
  };
  return (
    <>
      {SIDE_KEYS.map((k) => (
        <span key={k} style={pos[k]}>
          <EditableNum
            value={sides[k]}
            ariaLabel={`${prefix} ${k}`}
            onCommit={(v) => onChange({ ...sides, [k]: Math.max(0, v) })}
          />
        </span>
      ))}
    </>
  );
}

export function BoxModelInspector({
  value,
  onChange,
  onHoverLayer,
}: {
  value: BoxModelValue;
  onChange: (next: BoxModelValue) => void;
  /** called with the hovered layer, or null when pointer leaves; for canvas highlight */
  onHoverLayer?: (layer: BoxLayer | null) => void;
}) {
  const [hover, setHover] = useState<BoxLayer | null>(null);

  const setHoverLayer = (layer: BoxLayer | null) => {
    setHover(layer);
    onHoverLayer?.(layer);
  };

  const layerStyle = (layer: BoxLayer, borderStyle: "solid" | "dashed"): React.CSSProperties => ({
    position: "relative",
    background: COLORS[layer],
    border: `1px ${borderStyle} rgba(0,0,0,0.55)`,
    boxSizing: "border-box",
    transition: "filter 120ms ease, box-shadow 120ms ease",
    filter: hover && hover !== layer ? "saturate(0.85) brightness(0.98)" : "none",
    boxShadow: hover === layer ? "inset 0 0 0 2px rgba(255,255,255,0.55), 0 0 0 1px rgba(0,0,0,0.08)" : "none",
  });

  const labelStyle: React.CSSProperties = {
    position: "absolute",
    top: 2,
    left: 4,
    fontSize: 10,
    color: "#2b2b2b",
    lineHeight: 1,
    pointerEvents: "none",
    userSelect: "none",
  };

  const enter = (layer: BoxLayer) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setHoverLayer(layer);
  };
  const leave = (e: React.MouseEvent) => {
    e.stopPropagation();
    // let parent layer reclaim hover if pointer moved into it
    const related = e.relatedTarget as HTMLElement | null;
    if (!related) {
      setHoverLayer(null);
      return;
    }
  };

  const cellPad = { margin: 18, border: 18, padding: 18 } as const;

  return (
    <div
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 11,
        color: "#1f1f1f",
        userSelect: "none",
      }}
      onMouseLeave={() => setHoverLayer(null)}
    >
      {/* margin */}
      <div
        onMouseEnter={enter("margin")}
        onMouseMove={enter("margin")}
        style={{ ...layerStyle("margin", "dashed"), padding: cellPad.margin, minWidth: 220 }}
      >
        <span style={labelStyle}>margin</span>
        <SideValues
          prefix="margin"
          sides={value.margin}
          onChange={(margin) => onChange({ ...value, margin })}
        />

        {/* border */}
        <div
          onMouseEnter={enter("border")}
          onMouseMove={enter("border")}
          style={{ ...layerStyle("border", "solid"), padding: cellPad.border }}
        >
          <span style={labelStyle}>border</span>
          <SideValues
            prefix="border"
            sides={value.border}
            onChange={(border) => onChange({ ...value, border })}
          />

          {/* padding */}
          <div
            onMouseEnter={enter("padding")}
            onMouseMove={enter("padding")}
            style={{ ...layerStyle("padding", "dashed"), padding: cellPad.padding }}
          >
            <span style={labelStyle}>padding</span>
            <SideValues
              prefix="padding"
              sides={value.padding}
              onChange={(padding) => onChange({ ...value, padding })}
            />

            {/* content */}
            <div
              onMouseEnter={enter("content")}
              onMouseMove={enter("content")}
              style={{
                ...layerStyle("content", "solid"),
                minHeight: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "8px 6px",
              }}
            >
              <EditableNum
                value={value.content.width}
                ariaLabel="content width"
                onCommit={(width) => onChange({ ...value, content: { ...value.content, width: Math.max(0, width) } })}
              />
              <span style={{ fontSize: 11, color: "#1f1f1f" }}>×</span>
              <EditableNum
                value={value.content.height}
                ariaLabel="content height"
                onCommit={(height) => onChange({ ...value, content: { ...value.content, height: Math.max(0, height) } })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BoxModelSection({
  p,
  value,
  onChange,
  onHoverLayer,
}: {
  p: Palette;
  value: BoxModelValue;
  onChange: (next: BoxModelValue) => void;
  onHoverLayer?: (layer: BoxLayer | null) => void;
}) {
  const lang = useLang();
  return (
    <Section id="part-boxmodel" icon="select_all" title={lang === "fr" ? "Modèle de boîte" : lang === "es" ? "Modelo de caja" : lang === "de" ? "Box-Modell" : lang === "ja" ? "ボックスモデル" : lang === "zh" ? "盒模型" : lang === "ko" ? "박스 모델" : "Box model"} p={p}>
      <BoxModelInspector value={value} onChange={onChange} onHoverLayer={onHoverLayer} />
    </Section>
  );
}
