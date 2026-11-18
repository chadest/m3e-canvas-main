"use client";

/* Preview-only bodies for the parts that are drawings on the edit canvas. Every component here
 * keeps its own local state; Preview unmounts it when the preview closes, so none of this ever
 * reaches the document. M3Static never passes `preview`, so exports stay deterministic. */

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChartType, GridAspect, GridCell, Item, Palette, chartTypeOf, gridAspectOf, gridCellOf, scaleR } from "@/lib/tokens";
import { CHART_VALUES, DONUT_VALUES, SortDir, formatTime, isPlayableSrc, lottieLayerCount, sortRows, youtubeId } from "@/lib/preview";
import { Icon, qrMatrix } from "./M3Node";

const stopPointer = (e: React.PointerEvent) => e.stopPropagation();
const stopClick = (e: React.MouseEvent) => e.stopPropagation();
const focusRing = (p: Palette, on: boolean): React.CSSProperties => (on ? { boxShadow: `0 0 0 2px ${p.primary}` } : { boxShadow: "none" });

/** a real field: typing, a clear button while it has words, and M3's primary focus ring */
export function PreviewField({ item, p, search }: { item: Item; p: Palette; search?: boolean }) {
  const [value, setValue] = useState("");
  const [focus, setFocus] = useState(false);
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 8, height: "100%", padding: "0 12px", boxSizing: "border-box", borderRadius: 20, transition: "box-shadow 120ms", ...focusRing(p, focus) }}
    >
      {item.icon && <Icon name={item.icon} size={20} color={p.onSurfaceVariant} />}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onPointerDown={stopPointer}
        onClick={stopClick}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder={search ? (item.label || "Search") : ""}
        aria-label={search ? "Search" : item.label}
        style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", color: p.onSurface, fontSize: 15, caretColor: p.primary }}
      />
      {value ? (
        <button onPointerDown={stopPointer} onClick={(e) => { stopClick(e); setValue(""); }} aria-label="Clear" className="m3-press" style={{ width: 28, height: 28, borderRadius: 14, border: "none", background: p.surfaceContainerHighest, color: p.onSurfaceVariant, display: "grid", placeItems: "center", cursor: "pointer" }}>
          <Icon name="close" size={16} />
        </button>
      ) : null}
      {item.icon2 && <Icon name={item.icon2} size={20} color={p.onSurfaceVariant} />}
    </div>
  );
}

/** a player that either embeds real media or behaves like one while the sketch is being tried */
export function PreviewPlayer({ item, p, kind }: { item: Item; p: Palette; kind: "youtube" | "video" | "audio" }) {
  const id = kind === "youtube" ? youtubeId(item.src) : null;
  const playable = kind !== "youtube" && isPlayableSrc(item.src, kind);
  const duration = kind === "audio" ? 225 : 204;
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [muted, setMuted] = useState(!!item.muted);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing || playable || id) return;
    const timer = setInterval(() => setPos((v) => {
      const next = v + 1;
      if (next >= duration) {
        setPlaying(false);
        window.dispatchEvent(new CustomEvent("m3e:media-complete", { detail: item.id }));
        return 0;
      }
      return next;
    }), 1000);
    return () => clearInterval(timer);
  }, [playing, playable, id, duration]);

  if (id)
    return (
      <iframe
        title={item.label || "YouTube"}
        src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    );
  if (playable)
    return kind === "audio" ? (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 12, boxSizing: "border-box" }}>
        <span style={{ width: 56, height: 56, borderRadius: 28, background: p.primaryContainer, color: p.onPrimaryContainer, display: "grid", placeItems: "center" }}><Icon name="graphic_eq" size={28} /></span>
        <span style={{ fontSize: 13, fontWeight: 700, color: p.onSurface }}>{item.label}</span>
        <audio controls src={item.src} onEnded={() => window.dispatchEvent(new CustomEvent("m3e:media-complete", { detail: item.id }))} style={{ width: "100%" }} />
      </div>
    ) : (
      <video controls src={item.src} onEnded={() => window.dispatchEvent(new CustomEvent("m3e:media-complete", { detail: item.id }))} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", background: "#000" }} />
    );

  const bar = (
    <input
      type="range"
      className="m3-range"
      min={0}
      max={duration}
      value={pos}
      onPointerDown={stopPointer}
      onClick={stopClick}
      onChange={(e) => setPos(Number(e.target.value))}
      aria-label="Seek"
      style={{ width: "100%", "--track": p.secondaryContainer, "--thumb": p.primary } as React.CSSProperties}
    />
  );
  if (kind === "audio")
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 8, padding: "8px 14px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onPointerDown={stopPointer} onClick={(e) => { stopClick(e); setPlaying(!playing); }} className="m3-press" aria-label={playing ? "Pause" : "Play"} style={{ width: 40, height: 40, borderRadius: 20, border: "none", background: p.primaryContainer, color: p.onPrimaryContainer, display: "grid", placeItems: "center", cursor: "pointer" }}>
            <Icon name={playing ? "pause" : "play_arrow"} size={22} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: p.onSurface }}>{item.label}</div>
            <div style={{ fontSize: 11, color: p.onSurfaceVariant }}>{item.supporting}</div>
          </div>
          <span style={{ fontSize: 11, color: p.onSurfaceVariant }}>{formatTime(pos)} / {formatTime(duration)}</span>
        </div>
        {bar}
      </div>
    );
  return (
    <div ref={box} style={{ position: "relative", height: "100%", background: p.surfaceContainerHighest, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, minHeight: 0, display: "grid", placeItems: "center", position: "relative" }}>
        <span style={{ position: "absolute", fontSize: 12, fontWeight: 700, color: p.onSurfaceVariant }}>{item.label}</span>
        <button onPointerDown={stopPointer} onClick={(e) => { stopClick(e); setPlaying(!playing); }} className="m3-press" aria-label={playing ? "Pause" : "Play"} style={{ width: 56, height: 56, borderRadius: 28, border: "none", background: p.primaryContainer, color: p.onPrimaryContainer, display: "grid", placeItems: "center", cursor: "pointer", zIndex: 1 }}>
          <Icon name={playing ? "pause" : "play_arrow"} size={28} />
        </button>
      </div>
      <div style={{ flex: "0 0 auto", padding: "4px 12px 8px", display: "flex", alignItems: "center", gap: 8 }}>
        <button onPointerDown={stopPointer} onClick={(e) => { stopClick(e); setMuted(!muted); }} className="m3-press" aria-label={muted ? "Unmute" : "Mute"} style={{ border: "none", background: "transparent", color: p.onSurfaceVariant, cursor: "pointer", display: "grid", placeItems: "center" }}>
          <Icon name={muted ? "volume_off" : "volume_up"} size={18} />
        </button>
        <div style={{ flex: 1 }}>{bar}</div>
        <span style={{ fontSize: 10, color: p.onSurfaceVariant }}>{formatTime(pos)}</span>
        <button onPointerDown={stopPointer} onClick={(e) => { stopClick(e); const el = box.current; if (!el) return; if (document.fullscreenElement) void document.exitFullscreen(); else void el.requestFullscreen?.(); }} className="m3-press" aria-label="Fullscreen" style={{ border: "none", background: "transparent", color: p.onSurfaceVariant, cursor: "pointer", display: "grid", placeItems: "center" }}>
          <Icon name="fullscreen" size={18} />
        </button>
      </div>
    </div>
  );
}

/** bound Lottie JSON is read for its layer count; without a player dependency the preview draws
 *  those layers as continuous M3 vector motion, with working play and loop controls. */
export function PreviewLottie({ item, p }: { item: Item; p: Palette }) {
  const layers = Math.min(5, Math.max(2, lottieLayerCount(item.src)));
  const [playing, setPlaying] = useState(item.autoplay ?? true);
  const [loop, setLoop] = useState(item.loop ?? true);
  const colors = [p.primary, p.tertiaryContainer, p.secondaryContainer, p.primaryContainer, p.secondary];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: p.surfaceContainerHigh, overflow: "hidden" }}>
      <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden", display: "grid", placeItems: "center" }}>
        {Array.from({ length: layers }, (_, i) => {
          const size = 96 - i * 14;
          return (
            <motion.span
              key={i}
              animate={playing ? { x: [0, 18 - i * 6, -10 + i * 4, 0], y: [0, -16 + i * 5, 12 - i * 3, 0], rotate: [0, 90, 220, 360], scale: [1, 0.86, 1.08, 1], opacity: [0.9, 0.6, 1, 0.9] } : { rotate: i * 36, opacity: 0.85 }}
              transition={{ duration: 2.4 + i * 0.35, repeat: loop && playing ? Infinity : 0, ease: "easeInOut" }}
              style={{ position: "absolute", width: size, height: size, borderRadius: scaleR(i % 2 ? 20 : size / 2), background: colors[i % colors.length], opacity: 0.8 }}
            />
          );
        })}
      </div>
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "4px 8px 8px" }}>
        <button onPointerDown={stopPointer} onClick={(e) => { stopClick(e); setPlaying(!playing); }} className="m3-press" aria-label={playing ? "Pause" : "Play"} style={{ border: "none", background: "transparent", color: p.onSurfaceVariant, cursor: "pointer" }}><Icon name={playing ? "pause" : "play_arrow"} size={18} /></button>
        <span style={{ fontSize: 11, color: p.onSurfaceVariant, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
        <button onPointerDown={stopPointer} onClick={(e) => { stopClick(e); setLoop(!loop); }} aria-pressed={loop} className="m3-press" style={{ border: "none", background: loop ? p.secondaryContainer : "transparent", color: loop ? p.onSecondaryContainer : p.onSurfaceVariant, borderRadius: 12, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>∞</button>
      </div>
    </div>
  );
}

/** the slider's handle can be scrubbed with a pointer; its value rides above the thumb */
export function PreviewSlider({ item, p }: { item: Item; p: Palette }) {
  const [value, setValue] = useState(Math.min(100, Math.max(0, item.value ?? 40)));
  const width = item.size ?? 280;
  return (
    <div style={{ height: "100%", width, display: "flex", flexDirection: "column", justifyContent: "center", gap: 2, boxSizing: "border-box" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: p.primary, marginLeft: `${Math.max(0, Math.min(88, value - 8))}%` }}>{Math.round(value)}%</span>
      <input
        type="range"
        className="m3-range"
        min={0}
        max={100}
        value={value}
        onPointerDown={stopPointer}
        onClick={stopClick}
        onChange={(e) => setValue(Number(e.target.value))}
        aria-label={item.label || "Value"}
        style={{ width: "100%", "--track": p.secondaryContainer, "--thumb": p.primary } as React.CSSProperties}
      />
    </div>
  );
}

/** stars respond to hover and commit a score on click, live in preview only */
export function PreviewRating({ item, p }: { item: Item; p: Palette }) {
  const [score, setScore] = useState(Math.min(5, Math.max(0, item.value ?? 4.5)));
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? score;
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", gap: 3, padding: "0 4px", boxSizing: "border-box" }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <button
          key={i}
          onPointerDown={stopPointer}
          onMouseEnter={() => setHover(i + 1)}
          onMouseLeave={() => setHover(null)}
          onClick={(e) => { stopClick(e); setScore(i + 1); }}
          aria-label={`${i + 1} stars`}
          className="m3-press"
          style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", color: i < shown ? p.primary : p.outlineVariant, display: "grid", placeItems: "center" }}
        >
          <Icon name="star" size={28} fill={i < shown} />
        </button>
      ))}
      <span style={{ fontSize: 12, fontWeight: 700, color: p.onSurfaceVariant, marginLeft: 4 }}>{shown.toFixed(1)}</span>
    </div>
  );
}

/** a little browser with an editable address bar, a reload that resets the page and a frame
 *  that really scrolls */
export function PreviewWebView({ item, p }: { item: Item; p: Palette }) {
  const [url, setUrl] = useState(item.src?.trim() || "example.com");
  const [revision, setRevision] = useState(0);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: p.surface, overflow: "hidden" }}>
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: p.surfaceContainerHigh, borderBottom: `1px solid ${p.outlineVariant}` }}>
        <Icon name="lock" size={14} color={p.onSurfaceVariant} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} onPointerDown={stopPointer} onClick={stopClick} aria-label="Address" style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", color: p.onSurface, fontSize: 11 }} />
        <button onPointerDown={stopPointer} onClick={(e) => { stopClick(e); setRevision((n) => n + 1); }} aria-label="Reload" className="m3-press" style={{ border: "none", background: "transparent", color: p.primary, cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="refresh" size={16} /></button>
      </div>
      <div key={revision} className="m3-hidden-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", touchAction: "pan-y", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: p.onSurface }}>{item.label}</span>
        <div style={{ height: 64, borderRadius: scaleR(12), background: p.surfaceContainerHighest, display: "grid", placeItems: "center", color: p.outline }}><Icon name="language" size={24} /></div>
        {Array.from({ length: 12 }, (_, i) => <span key={i} style={{ display: "block", width: ["70%", "88%", "62%", "80%"][i % 4], height: 6, borderRadius: 3, background: p.onSurfaceVariant, opacity: 0.28 }} />)}
      </div>
    </div>
  );
}

/** headers sort their column; a row highlights while hovered and stays selected after a tap */
export function PreviewTable({ item, p }: { item: Item; p: Palette }) {
  const heads = (item.tabs ?? []).map((t) => t.label.trim() || "…");
  const cols = Math.max(1, heads.length);
  const rows = Array.from({ length: Math.min(8, Math.max(2, item.rows ?? 4)) }, (_, r) => Array.from({ length: cols }, (_, c) => ({ label: `Row ${r + 1} · ${heads[c] ?? c}`, width: `${62 - ((r * 13 + c * 29) % 30)}%` })));
  const [sort, setSort] = useState<{ col: number; dir: SortDir } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const ordered = sort ? sortRows(rows, sort.dir, (row) => row[sort.col].label) : rows;
  return (
    <div style={{ height: "100%", background: p.surfaceContainerLow, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", flex: "0 0 auto", borderBottom: `1px solid ${p.outlineVariant}` }}>
        {heads.map((head, c) => (
          <button key={c} onPointerDown={stopPointer} onClick={(e) => { stopClick(e); setSort((s) => ({ col: c, dir: s?.col === c && s.dir === "asc" ? "desc" : "asc" })); }} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, padding: "8px 10px", border: "none", background: "transparent", color: sort?.col === c ? p.primary : p.onSurfaceVariant, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{head}</span>
            {sort?.col === c && <Icon name={sort.dir === "asc" ? "arrow_upward" : "arrow_downward"} size={12} />}
          </button>
        ))}
      </div>
      <div className="m3-hidden-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: "auto", touchAction: "pan-y" }}>
        {ordered.map((row, r) => (
          <button key={r} onPointerDown={stopPointer} onClick={(e) => { stopClick(e); setSelected(r); }} style={{ width: "100%", display: "flex", gap: 8, padding: "10px", border: "none", borderBottom: `1px solid ${p.outlineVariant}`, background: selected === r ? p.secondaryContainer : "transparent", color: p.onSurface, textAlign: "left", cursor: "pointer", transition: "background 120ms" }}>
            {row.map((cell, c) => <span key={c} style={{ flex: 1, minWidth: 0, height: 6, borderRadius: 3, background: p.onSurfaceVariant, opacity: c === 0 ? 0.5 : 0.3, maxWidth: cell.width }} />)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** data points answer a hover with their value; the drawing itself stays the sketch's own */
export function PreviewChart({ item, p }: { item: Item; p: Palette }) {
  const [hover, setHover] = useState<number | null>(null);
  const type: ChartType = chartTypeOf(item);
  const tooltip = (value: number) => (
    <span style={{ position: "absolute", left: "50%", top: 4, transform: "translateX(-50%)", padding: "3px 8px", borderRadius: 8, background: p.inverseSurface, color: p.inverseOnSurface, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", pointerEvents: "none" }}>{value}</span>
  );
  return (
    <div style={{ position: "relative", height: "100%", background: p.surfaceContainerLow, padding: "12px 14px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 8 }}>
      {item.label && <span style={{ fontSize: 13, fontWeight: 700, color: p.onSurface }}>{item.label}</span>}
      {type === "donut" ? (
        <div style={{ flex: 1, display: "grid", placeItems: "center", position: "relative" }}>
          <svg viewBox="0 0 100 100" style={{ width: "min(100%, 160px)", height: "min(100%, 160px)", transform: "rotate(-90deg)" }} aria-hidden>
            {DONUT_VALUES.map((v, i) => {
              const offset = DONUT_VALUES.slice(0, i).reduce((n, x) => n + x, 0);
              return <circle key={i} cx="50" cy="50" r="34" fill="none" stroke={[p.primary, p.tertiaryContainer, p.secondaryContainer][i]} strokeWidth="14" strokeDasharray={`${v} ${100 - v}`} strokeDashoffset={-offset} pathLength="100" opacity={hover === i ? 1 : 0.85} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }} />;
            })}
          </svg>
          <span style={{ position: "absolute", fontSize: 20, fontWeight: 800, color: p.onSurface }}>{hover === null ? "64%" : `${DONUT_VALUES[hover]}%`}</span>
          {hover !== null && tooltip(DONUT_VALUES[hover])}
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "flex-end", gap: 6, position: "relative" }}>
          {CHART_VALUES.map((v, i) => (
            <div key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ flex: 1, position: "relative", height: "100%", display: "flex", alignItems: "flex-end", cursor: "pointer" }}>
              <div style={{ width: "100%", height: `${v}%`, borderRadius: `${scaleR(6)}px ${scaleR(6)}px 0 0`, background: type === "bar" ? (i === CHART_VALUES.length - 1 ? p.tertiaryContainer : p.primary) : p.primary, opacity: hover === i ? 1 : 0.82 }} />
              {hover === i && tooltip(v)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** tiles lift on hover and press like real M3 surfaces */
export function PreviewGrid({ item, p }: { item: Item; p: Palette }) {
  const cells = Math.min(12, Math.max(2, item.count ?? 4));
  const cols = Math.min(4, Math.max(2, item.columns ?? 2));
  const gap = item.gap ?? 12;
  const aspect: GridAspect = gridAspectOf(item);
  const cell: GridCell = gridCellOf(item);
  const icons = ["home", "favorite", "search", "settings", "person", "star"];
  const [pressed, setPressed] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div style={{ height: "100%", background: p.surfaceContainerLow, padding: 12, boxSizing: "border-box", display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: aspect === "1:1" ? "1fr" : "1.33fr", gap, overflow: "hidden" }}>
      {Array.from({ length: cells }, (_, i) => (
        <button
          key={i}
          onPointerDown={(e) => { stopPointer(e); setPressed(i); }}
          onPointerUp={() => setPressed(null)}
          onPointerLeave={() => { setPressed(null); setHover(null); }}
          onMouseEnter={() => setHover(i)}
          onClick={(e) => { stopClick(e); setPressed(i); }}
          className="m3-press"
          style={{ border: `1px solid ${p.outlineVariant}`, borderRadius: scaleR(16), background: cell === "image" ? p.primaryContainer : p.surface, color: p.onPrimaryContainer, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", overflow: "hidden", boxShadow: hover === i ? "0 4px 14px rgba(0,0,0,0.16)" : "none", transform: pressed === i ? "scale(0.96)" : "none", transition: "box-shadow 160ms, transform 120ms" }}
        >
          <Icon name={icons[i % icons.length]} size={24} />
          <span style={{ width: "80%", height: 5, borderRadius: 3, background: p.onSurfaceVariant, opacity: 0.35 }} />
          <span style={{ width: "55%", height: 5, borderRadius: 3, background: p.onSurfaceVariant, opacity: 0.25 }} />
        </button>
      ))}
    </div>
  );
}

/** a tap opens an inspect sheet inside the part, showing the same matrix large and its payload */
export function PreviewQr({ item, p }: { item: Item; p: Palette }) {
  const payload = item.src?.trim() || "https://example.com";
  const [open, setOpen] = useState(false);
  const matrix = qrMatrix(payload);
  const draw = (n: number) => (
    <svg viewBox="0 0 21 21" width={n} height={n} aria-hidden shapeRendering="crispEdges">
      {matrix.flatMap((row, r) => row.map((on, c) => (on ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={p.onSurface} /> : null)))}
    </svg>
  );
  return (
    <div style={{ position: "relative", height: "100%", background: p.surface, display: "grid", placeItems: "center", overflow: "hidden" }}>
      <button onPointerDown={stopPointer} onClick={(e) => { stopClick(e); setOpen(true); }} aria-label="Inspect QR code" className="m3-press" style={{ border: "none", background: "transparent", cursor: "zoom-in", display: "grid", placeItems: "center", padding: 8 }}>
        {draw(120)}
      </button>
      {item.supporting && <span style={{ position: "absolute", bottom: 4, fontSize: 10, color: p.onSurfaceVariant }}>{item.supporting}</span>}
      {open && (
        <div onPointerDown={stopPointer} onClick={(e) => { stopClick(e); setOpen(false); }} style={{ position: "absolute", inset: 0, zIndex: 3, background: p.surface, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 8, boxSizing: "border-box", cursor: "zoom-out" }}>
          {draw(Math.min(148, 148))}
          <span style={{ maxWidth: "100%", fontSize: 10, color: p.onSurfaceVariant, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{payload}</span>
        </div>
      )}
    </div>
  );
}

/** dialogs, sheets and snackbars can be answered or dismissed in preview */
export function PreviewDismiss({ item, p, mode }: { item: Item; p: Palette; mode: "dialog" | "sheet" | "snack" }) {
  const [gone, setGone] = useState(false);
  if (gone) return null;
  if (mode === "snack")
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", gap: 16, padding: "0 16px", boxSizing: "border-box", background: p.inverseSurface, color: p.inverseOnSurface, borderRadius: scaleR(16) }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
        <button onPointerDown={stopPointer} onClick={(e) => { stopClick(e); setGone(true); }} className="m3-press" style={{ border: "none", background: "transparent", color: p.primaryContainer, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{item.supporting || "Dismiss"}</button>
        <button onPointerDown={stopPointer} onClick={(e) => { stopClick(e); setGone(true); }} aria-label="Dismiss" className="m3-press" style={{ border: "none", background: "transparent", color: p.inverseOnSurface, cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="close" size={16} /></button>
      </div>
    );
  return (
    <div onClick={(e) => { stopClick(e); setGone(true); }} style={{ position: "relative", height: "100%", boxSizing: "border-box", padding: mode === "sheet" ? "16px 16px 0" : 16, display: "flex", alignItems: mode === "sheet" ? "flex-end" : "center", justifyContent: "center", background: "rgba(0,0,0,0.32)", borderRadius: scaleR(mode === "sheet" ? 28 : 24) }}>
      <div onClick={stopClick} onPointerDown={stopPointer} style={{ width: "100%", background: mode === "sheet" ? p.surfaceContainerLow : p.surfaceContainerHigh, borderRadius: scaleR(28), padding: 20, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 12, color: p.onSurface }}>
        {mode === "sheet" && <span style={{ width: 32, height: 4, borderRadius: 2, background: p.outlineVariant, margin: "0 auto" }} />}
        <span style={{ fontSize: 18, fontWeight: 700 }}>{item.label}</span>
        {item.supporting && <span style={{ fontSize: 13, color: p.onSurfaceVariant }}>{item.supporting}</span>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button onPointerDown={stopPointer} onClick={(e) => { stopClick(e); setGone(true); }} className="m3-press" style={{ height: 36, padding: "0 14px", borderRadius: 18, border: "none", background: "transparent", color: p.primary, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onPointerDown={stopPointer} onClick={(e) => { stopClick(e); setGone(true); }} className="m3-press" style={{ height: 36, padding: "0 16px", borderRadius: 18, border: "none", background: p.primary, color: p.onPrimary, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>OK</button>
        </div>
      </div>
    </div>
  );
}
