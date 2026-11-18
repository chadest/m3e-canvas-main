"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  FAB_MENU_CLOSE,
  FAB_MENU_GAP,
  FAB_MENU_ITEM_H,
  H,
  Item,
  Kind,
  MEASURED,
  NAV_BAR_H,
  Palette,
  Radii,
  R_INNER,
  SPLIT_GAP,
  SPLIT_MAIN_SLOT,
  SPLIT_MENU_ITEM_H,
  SPLIT_MENU_PAD,
  SPLIT_MENU_SHEET_GAP,
  SPLIT_MENU_SLOT,
  STATUS_BAR_H,
  baseRadii,
  buttonHeightOf,
  chipHeightOf,
  chipMetrics,
  extendedFabHeight,
  extendedFabMetrics,
  fabOpen,
  isMeasured,
  menuOpen,
  buttonMetrics,
  CARD_MEDIA_GAP,
  CARD_PADDING,
  CARD_TEXT_GAP,
  cardContentAlignOf,
  cardTextAlignOf,
  cardFillOf,
  cardImagePosOf,
  cardImageSizeOf,
  cardBodyColorOf,
  cardScrimOf,
  cardTextColorOf,
  dateLayoutOf,
  onToken,
  scaleR,
  menuRises,
  sizeOf,
  splitMetrics,
  variantShadow,
  variantStyle,
  SETTLE_MS,
  progressThickness,
  RAIL_TOP,
  RAIL_W,
  RAIL_ITEM_H,
  RAIL_GAP,
  isWideRail,
  railMetrics,
  isScrollableTabs,
  tabScrollOffset,
  SCROLL_TAB_W,
  RIPPLE_KINDS,
  TOP_BAR_SIZES,
  topBarHeightOf,
  topBarFontOf,
  gridAspectOf,
  gridCellOf,
  chartTypeOf,
  modeOf,
  scaleOf,
  scrollDirectionOf,
  scrollGapOf,
  scrollItemCountOf,
  barVariantOf,
  scrollBehaviorOf,
  actionCountOf,
  collapsingBarHeightOf,
} from "@/lib/tokens";
import { CircularProgress, LinearProgress, LoadingIndicator } from "./Loading";
import { CarouselBody, DatePickerBody, TimePickerBody } from "./Pickers";
import { Lang, t, useLang } from "@/lib/i18n";
import {
  PreviewChart,
  PreviewDismiss,
  PreviewField,
  PreviewGrid,
  PreviewLottie,
  PreviewPlayer,
  PreviewQr,
  PreviewRating,
  PreviewSlider,
  PreviewTable,
  PreviewWebView,
} from "./PreviewWidgets";
import { useTheme } from "@/lib/theme";
import { railSelectedLabelColor } from "@/lib/color";

/** weight of a heading or label: heavier under the emphasized type setting */
const useWeight = () => {
  const emphasized = useTheme().emphasized;
  return (normal: number, strong: number) => (emphasized ? strong : normal);
};

export function Icon({
  name,
  size = 24,
  color,
  fill,
  weight,
}: {
  name: string;
  size?: number;
  color?: string;
  fill?: boolean;
  weight?: number;
}) {
  return (
    <span
      className="msr"
      /* the ligature is a picture, not words: a screen reader should not spell out its name */
      aria-hidden
      data-fill={fill ? "1" : "0"}
      style={{
        fontSize: size,
        color,
        fontVariationSettings: weight
          ? `"FILL" ${fill ? 1 : 0}, "wght" ${weight}, "GRAD" 0, "opsz" 24`
          : undefined,
      }}
    >
      {name}
    </span>
  );
}

/** One touch of a part: where it landed, how far the circle has to travel to cover the shape it
 *  landed in, and which shape that was -- a split button's two halves light up one at a time. */
export type Ripple = {
  id: number;
  part: string | null;
  /** the finger or pointer that made it, so lifting one finger leaves another's light alone */
  pointer?: number;
  x: number;
  y: number;
  d: number;
  /** the size it starts at, as a part of the whole: a light handed from one drawing of a part to
   *  another carries on from where the first one had got to rather than starting over */
  from?: number;
  /** how long it has left to finish growing, in seconds */
  dur?: number;
};

/** how long a ripple takes to cover what it was started in */
export const RIPPLE_GROW = 0.42;

/** how far out of the point touched a circle must grow to cover the whole of an element */
export function rippleSize(r: { width: number; height: number }, x: number, y: number): number {
  return 2 * Math.max(Math.hypot(x, y), Math.hypot(r.width - x, y), Math.hypot(x, r.height - y), Math.hypot(r.width - x, r.height - y));
}

/** The circles themselves: they spread out of the point touched at the colour of whatever is
 *  written on the part -- white over a filled button -- and fade once the finger is off it.
 *  M3's pressed state layer is a tenth of that colour; the ripple arrives a shade stronger and
 *  settles onto it. The caller gives them something to be clipped by. */
export function Ripples({ list, color }: { list: Ripple[]; color: string }) {
  const reducedMotion = useReducedMotion();
  return (
    <AnimatePresence>
      {list.map((r) => (
        <motion.span
          key={r.id}
          aria-hidden
          initial={{ opacity: 0.16, scale: r.from ?? 0 }}
          animate={{ opacity: 0.12, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={reducedMotion ? { duration: 0 } : { scale: { duration: r.dur ?? RIPPLE_GROW, ease: MENU_EASE }, opacity: { duration: 0.3, ease: MENU_EASE } }}
          style={{
            position: "absolute",
            left: r.x - r.d / 2,
            top: r.y - r.d / 2,
            width: r.d,
            height: r.d,
            borderRadius: "50%",
            background: color,
            pointerEvents: "none",
          }}
        />
      ))}
    </AnimatePresence>
  );
}

/** what a part being pressed is lighting up, for the shapes drawn deep inside it to read */
const RippleCtx = createContext<{ list: Ripple[]; color: string } | null>(null);

/** the light of a press, inside one shape of a part: the shape clips it and keeps its corners */
function RippleShape({ part }: { part: string | null }) {
  const ctx = useContext(RippleCtx);
  if (!ctx) return null;
  return (
    <span aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit", pointerEvents: "none" }}>
      <Ripples list={ctx.list.filter((r) => r.part === part)} color={ctx.color} />
    </span>
  );
}

/** the touches a part is holding, and where each of them landed */
function useRipples(on: boolean) {
  const [list, setList] = useState<Ripple[]>([]);
  const next = useRef(0);
  /* the light stays for as long as the finger is down, wherever it travels: a part being dragged
   * across the canvas keeps it, and it fades once the finger is lifted rather than at the edge
   * of the part. The release is watched on the window, because that is where a drag ends. */
  const waiting = useRef<(() => void) | null>(null);
  const end = () => {
    waiting.current?.();
    setList((rs) => (rs.length ? [] : rs));
  };
  const add = (e: React.PointerEvent) => {
    if (!on) return;
    /* only the main button of a mouse is a press: a right or a middle click opens nothing here */
    if (e.pointerType === "mouse" && e.button !== 0) return;
    /* a part made of more than one shape says which one was touched */
    const seg = (e.target as HTMLElement | null)?.closest?.("[data-part-shape]") as HTMLElement | null;
    const el = seg ?? (e.currentTarget as HTMLElement);
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    setList((rs) => [...rs, { id: ++next.current, part: seg?.dataset.partShape ?? null, x, y, d: rippleSize(r, x, y) }]);
    waiting.current?.();
    const done = () => {
      waiting.current = null;
      window.removeEventListener("pointerup", done);
      window.removeEventListener("pointercancel", done);
      setList((rs) => (rs.length ? [] : rs));
    };
    waiting.current = done;
    window.addEventListener("pointerup", done);
    window.addEventListener("pointercancel", done);
  };
  /* a part taken off the canvas mid-press leaves no listener behind */
  useEffect(() => () => waiting.current?.(), []);
  return { list, add, end };
}

const ellipsis = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;

const NO_BOX: Kind[] = [
  "circularProgress",
  "linearProgress",
  "loadingIndicator",
  "switch",
  "checkbox",
  "radio",
  "slider",
  "text",
  "divider",
  "rating",
  "avatar",
  "splitButton",
  "fabMenu",
  "carousel",
];

/** Padding follows M3: icon+label is tighter than label alone. */
export function ButtonContent({ item }: { item: Item }) {
  const w = useWeight();
  const hasIcon = !!item.icon;
  const hasLabel = item.label.trim().length > 0;
  /* padding, gap, icon and label all come from the M3 size the height lands on;
   * with no label the icon is centred instead, which makes the button a circle */
  const m = buttonMetrics(buttonHeightOf(item));
  const padX = hasLabel ? m.padX : Math.round((m.h - m.icon) / 2);
  return (
    <span
      className="m3-size-ease"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: item.size ? "100%" : undefined,
        boxSizing: "border-box",
        gap: hasIcon && hasLabel ? m.gap : 0,
        paddingLeft: padX,
        paddingRight: padX,
        height: m.h,
        fontSize: m.font,
        fontWeight: w(500, 700),
        letterSpacing: 0.1,
        whiteSpace: "nowrap",
      }}
    >
      {hasIcon && <Icon name={item.icon!} size={m.icon} fill={item.variant === "filled"} />}
      {hasLabel && <span>{item.label}</span>}
    </span>
  );
}

function ExtendedFabContent({ item }: { item: Item }) {
  const w = useWeight();
  const hasIcon = !!item.icon;
  const hasLabel = item.label.trim().length > 0;
  /* the padding, the icon and the label are the ones the height it was given asks for */
  const m = extendedFabMetrics(extendedFabHeight(item));
  return (
    <span
      className="m3-size-ease"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: hasIcon && hasLabel ? m.gap : 0,
        paddingLeft: m.padX,
        paddingRight: m.padX,
        height: m.h,
        fontSize: m.font,
        fontWeight: w(500, 700),
        whiteSpace: "nowrap",
      }}
    >
      {hasIcon && <Icon name={item.icon!} size={m.icon} />}
      {hasLabel && <span>{item.label}</span>}
    </span>
  );
}

function ChipContent({ item, p }: { item: Item; p: Palette }) {
  const on = !!item.checked;
  const lead = on ? "check" : item.icon;
  /* the padding, the icon and the label are the ones the height it was given asks for */
  const m = chipMetrics(chipHeightOf(item));
  return (
    <span
      className="m3-size-ease"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: m.gap,
        paddingLeft: lead ? m.lead : m.padX,
        paddingRight: m.padX,
        height: m.h,
        fontSize: m.font,
        fontWeight: 500,
        whiteSpace: "nowrap",
        color: on ? p.onSecondaryContainer : undefined,
      }}
    >
      {lead && <Icon name={lead} size={m.icon} />}
      <span>{item.label}</span>
    </span>
  );
}

function SwitchContent({ item, p }: { item: Item; p: Palette }) {
  const hasLabel = item.label.trim().length > 0;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 14, height: H - 8, whiteSpace: "nowrap", width: item.size ? "100%" : undefined, justifyContent: item.size ? "space-between" : undefined }}>
      {hasLabel && <span style={{ fontSize: 16, color: p.onSurface, overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
      <SwitchControl on={!!item.checked} p={p} />
    </span>
  );
}

/** the M3 switch track and handle, 52 × 32 */
function SwitchControl({ on, p }: { on: boolean; p: Palette }) {
  return (
    <span
        style={{
          position: "relative",
          width: 52,
          height: 32,
          borderRadius: 16,
          background: on ? p.primary : p.surfaceContainerHighest,
          border: on ? "2px solid transparent" : `2px solid ${p.outline}`,
          boxSizing: "border-box",
          flex: "0 0 auto",
          transition: "background 160ms",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "50%",
            left: on ? 22 : 4,
            width: on ? 24 : 16,
            height: on ? 24 : 16,
            marginTop: on ? -12 : -8,
            borderRadius: 12,
            background: on ? p.onPrimary : p.outline,
            display: "grid",
            placeItems: "center",
            color: p.onPrimaryContainer,
            transition: "left 160ms, width 160ms, height 160ms",
          }}
        >
          {on && <Icon name="check" size={16} weight={600} />}
        </span>
      </span>
  );
}

function CheckboxContent({ item, p }: { item: Item; p: Palette }) {
  const on = !!item.checked;
  const hasLabel = item.label.trim().length > 0;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 40, whiteSpace: "nowrap" }}>
      <span style={{ width: 40, height: 40, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: 3,
            boxSizing: "border-box",
            border: on ? "none" : `2px solid ${p.onSurfaceVariant}`,
            background: on ? p.primary : "transparent",
            color: p.onPrimary,
            display: "grid",
            placeItems: "center",
          }}
        >
          {on && <Icon name="check" size={16} weight={700} />}
        </span>
      </span>
      {hasLabel && <span style={{ fontSize: 16, color: p.onSurface, paddingRight: 8 }}>{item.label}</span>}
    </span>
  );
}

function TextContent({ item, p }: { item: Item; p: Palette }) {
  const w = useWeight();
  const fs = item.size ?? 28;
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: fs,
        lineHeight: 1.3,
        fontWeight: item.bold ? w(700, 800) : w(400, fs >= 22 ? 600 : 500),
        letterSpacing: fs >= 28 ? -0.25 : 0,
        color: p.onSurface,
        whiteSpace: "nowrap",
        padding: "0 2px",
      }}
    >
      {item.label || " "}
    </span>
  );
}

/** A split button: the labeled action and, after a hairline gap, the arrow that opens its menu.
 *  Both segments are read off the button scale the height lands on, and they keep their own
 *  corners, so the box around them stays plain. */
function SplitButtonContent({ item, p, open }: { item: Item; p: Palette; open?: boolean }) {
  const w = useWeight();
  const reducedMotion = useReducedMotion();
  const st = variantStyle(item.variant, p);
  const h = buttonHeightOf(item);
  const m = splitMetrics(h);
  const outer = scaleR(h / 2);
  const inner = scaleR(R_INNER);
  const hasLabel = item.label.trim().length > 0;
  /* with no label the icon is centred instead, the way a button with none is */
  const padX = hasLabel ? m.padX : Math.round((m.h - m.icon) / 2);
  const shadow = variantShadow(item.variant);
  return (
    <span className="m3-size-ease" style={{ display: "inline-flex", alignItems: "center", gap: SPLIT_GAP, height: m.h }}>
      <span
        className="m3-size-ease"
        data-part-shape={SPLIT_MAIN_SLOT}
        style={{
          ...st,
          display: "inline-flex",
          alignItems: "center",
          gap: hasLabel && item.icon ? m.gap : 0,
          height: m.h,
          paddingLeft: padX,
          paddingRight: padX,
          borderTopLeftRadius: outer,
          borderBottomLeftRadius: outer,
          borderTopRightRadius: inner,
          borderBottomRightRadius: inner,
          fontSize: m.font,
          fontWeight: w(500, 700),
          whiteSpace: "nowrap",
          boxSizing: "border-box",
          boxShadow: shadow,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {item.icon && <Icon name={item.icon} size={m.icon} fill={item.variant === "filled"} />}
        {hasLabel && <span>{item.label}</span>}
        <RippleShape part={SPLIT_MAIN_SLOT} />
      </span>
      <span
        className="m3-size-ease"
        data-part-shape={SPLIT_MENU_SLOT}
        style={{
          ...st,
          display: "inline-grid",
          placeItems: "center",
          position: "relative",
          overflow: "hidden",
          /* the segment is as wide as its arrow with its own padding, so it eases like the other one */
          height: m.h,
          paddingLeft: m.trailPadX,
          paddingRight: m.trailPadX,
          /* opening the menu rounds this segment right off, the way M3 does it; the segment with
             the words keeps the shape it had */
          borderTopLeftRadius: open ? outer : inner,
          borderBottomLeftRadius: open ? outer : inner,
          borderTopRightRadius: outer,
          borderBottomRightRadius: outer,
          boxSizing: "border-box",
          boxShadow: shadow,
        }}
      >
        {/* the arrow turns over while the menu it opened is showing */}
        <span style={{ display: "inline-flex", transform: open ? "rotate(180deg)" : "none", transition: reducedMotion ? "none" : "transform 200ms cubic-bezier(0.2, 0, 0, 1)" }}>
          <Icon name="keyboard_arrow_down" size={m.icon} />
        </span>
        <RippleShape part={SPLIT_MENU_SLOT} />
      </span>
    </span>
  );
}

/** Whether a menu is drawn open, on its way out, or not yet. The preview draws its screens
 *  inside an AnimatePresence that blocks animations on mount, so a menu is drawn shut for one
 *  frame and told to open on the next, where nothing blocks it. A menu that has never been open
 *  starts rolled up; one on its way out only gives way a little, because what carries it off is
 *  the fade. */
function useOpenPhase(shown: boolean): "shut" | "open" | "closing" {
  const [phase, setPhase] = useState<"shut" | "open" | "closing">("shut");
  useEffect(() => {
    if (!shown) {
      setPhase((was) => (was === "shut" ? "shut" : "closing"));
      return;
    }
    const id = requestAnimationFrame(() => setPhase("open"));
    return () => cancelAnimationFrame(id);
  }, [shown]);
  return phase;
}

/** A split button with its menu open: the button where the author put it, and the sheet of
 *  entries beside it -- below the button where the screen has room, above it where it does not.
 *  The sheet grows out of the edge nearest the button, so the two read as one gesture. */
function SplitMenuContent({ item, p, shown = true }: { item: Item; p: Palette; shown?: boolean }) {
  const w = useWeight();
  const reducedMotion = useReducedMotion();
  const up = menuRises(item);
  const tabs = item.tabs ?? [];
  const phase = useOpenPhase(shown);
  const open = phase === "open";
  const sheet = (
    <motion.div
      initial={false}
      animate={{ opacity: open ? 1 : 0, scaleY: open ? 1 : 0.7 }}
      transition={reducedMotion ? { duration: 0 } : { duration: open ? MENU_ROLL : MENU_SHUT, ease: MENU_EASE }}
      style={{
        /* it unrolls out of the edge the button is on */
        transformOrigin: up ? "50% 100%" : "50% 0%",
        background: p.surfaceContainer,
        color: p.onSurface,
        borderRadius: scaleR(12),
        padding: `${SPLIT_MENU_PAD}px 0`,
        boxShadow: "0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.10)",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {tabs.map((tab, i) => (
        <motion.div
          key={i}
          initial={false}
          /* the entry nearest the button is read first, so it is the first to arrive */
          animate={{ opacity: open ? 1 : 0 }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : open
                ? { duration: 0.12, delay: (up ? tabs.length - 1 - i : i) * MENU_STAGGER }
                : { duration: 0.06 }
          }
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            height: SPLIT_MENU_ITEM_H,
            padding: "0 12px",
            fontSize: 14,
            fontWeight: w(500, 700),
            whiteSpace: "nowrap",
            boxSizing: "border-box",
          }}
        >
          {tab.icon && <Icon name={tab.icon} size={24} />}
          <span style={ellipsis}>{tab.label}</span>
        </motion.div>
      ))}
    </motion.div>
  );
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: up ? "flex-end" : "flex-start",
        gap: SPLIT_MENU_SHEET_GAP,
        height: "100%",
      }}
    >
      {up && sheet}
      {/* the button keeps its own width whatever the sheet under it comes to */}
      <span style={{ alignSelf: "flex-start" }}>
        <SplitButtonContent item={item} p={p} open={open} />
      </span>
      {!up && sheet}
    </div>
  );
}

function RadioContent({ item, p }: { item: Item; p: Palette }) {
  const on = !!item.checked;
  const hasLabel = item.label.trim().length > 0;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 40, whiteSpace: "nowrap" }}>
      <span style={{ width: 40, height: 40, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            boxSizing: "border-box",
            border: `2px solid ${on ? p.primary : p.onSurfaceVariant}`,
            display: "grid",
            placeItems: "center",
          }}
        >
          {on && <span style={{ width: 10, height: 10, borderRadius: 5, background: p.primary }} />}
        </span>
      </span>
      {hasLabel && <span style={{ fontSize: 16, color: p.onSurface, paddingRight: 8 }}>{item.label}</span>}
    </span>
  );
}

/** Content for kinds that size to their text; rendered again offscreen to measure. */
export function MeasuredContent({ item, p }: { item: Item; p: Palette }) {
  if (menuOpen(item)) return item.kind === "splitButton" ? <SplitMenuContent item={item} p={p} /> : <FabMenuContent item={item} p={p} />;
  switch (item.kind) {
    case "button":
      return <ButtonContent item={item} />;
    case "extendedFab":
      return <ExtendedFabContent item={item} />;
    case "chip":
      return <ChipContent item={item} p={p} />;
    case "switch":
      return <SwitchContent item={item} p={p} />;
    case "checkbox":
      return <CheckboxContent item={item} p={p} />;
    case "text":
      return <TextContent item={item} p={p} />;
    case "splitButton":
      return <SplitButtonContent item={item} p={p} />;
    case "radio":
      return <RadioContent item={item} p={p} />;
    case "fabMenu":
      return <FabMenuContent item={item} p={p} />;
    default:
      return null;
  }
}

/** how long one entry takes to unroll, and how far apart the entries start */
const MENU_ROLL = 0.28;
const MENU_STAGGER = 0.045;
/** how long the button takes to reach the M size. A FAB taller than that reaches up into the row
 *  the nearest entry stands in, so the two are never on screen together: opening, the entries wait
 *  for the button to come down to size; shutting, the button waits for the entries to go. */
const MENU_BUTTON_ROLL = 0.16;
/** shutting is not the unrolling backwards: the entries give way a little and fade, from the far
 *  end down, so the menu is gone long before a full reverse run would have finished */
const MENU_SHUT = 0.16;
/** the one frame the drawing is swapped on, held long enough for the box not to ease across it */
const MENU_SNAP_MS = 60;
const MENU_SHUT_FADE = 0.1;
const MENU_SHUT_STAGGER = 0.025;
const MENU_SHUT_SCALE = 0.72;
const MENU_BUTTON_SHUT = 0.16;
const MENU_EASE = [0.2, 0, 0, 1] as const;

/** how long the whole reverse run takes, in milliseconds */
export const menuShutMs = (it: Item) => {
  const entries = menuEntriesShut(it);
  return Math.round(Math.max(entries, menuButtonWait(it) + MENU_BUTTON_SHUT) * 1000);
};

/** how long every entry takes to fade away */
const menuEntriesShut = (it: Item) => MENU_SHUT_FADE + Math.max(0, (it.tabs?.length ?? 1) - 1) * MENU_SHUT_STAGGER;
/** a FAB that reaches above the close button takes its turn; one that does not never waits */
const overTall = (it: Item) => (it.size ?? FAB_MENU_CLOSE) > FAB_MENU_CLOSE;
/** what the button waits for before growing back: every entry gone */
const menuButtonWait = (it: Item) => (overTall(it) ? menuEntriesShut(it) : 0);
/** what the entries wait for before unrolling: the button down to the close size */
const menuEntriesWait = (it: Item) => (overTall(it) ? MENU_BUTTON_ROLL : 0);

/** Whether the menu is drawn at all, and whether it is drawn open. The two part ways while the
 *  menu shuts: the node keeps its open shape, transparent and as tall as the entries, until they
 *  have rolled back into the button, and only then becomes the FAB again. */
function useMenuPhase(item: Item) {
  const open = menuOpen(item);
  const [drawn, setDrawn] = useState(open);
  /* read by the effect without restarting it: only the menu opening or closing may do that */
  const drawnRef = useRef(open);
  /** the frame the drawing is swapped on: the box must not ease its height across the swap */
  const [snap, setSnap] = useState(false);
  const shutMs = menuShutMs(item);
  useEffect(() => {
    if (open) {
      drawnRef.current = true;
      setDrawn(true);
      return;
    }
    if (!drawnRef.current) return;
    const id = setTimeout(() => {
      drawnRef.current = false;
      setDrawn(false);
      setSnap(true);
    }, shutMs);
    return () => clearTimeout(id);
  }, [open, shutMs]);
  useEffect(() => {
    if (!snap) return;
    const id = setTimeout(() => setSnap(false), MENU_SNAP_MS);
    return () => clearTimeout(id);
  }, [snap]);
  return { drawn, open, snap };
}

/** A FAB with its menu open: the entries it offers, and the button itself showing the close
 *  icon under them. The button stays where the author put it and grows or shrinks into the M-size
 *  close button; the entries unroll out of its right edge, the one nearest the button first.
 *  Nothing here changes the drawing's size, so the editor can measure it while it moves, and the
 *  menu is exactly as wide as its widest entry. */
function FabMenuContent({ item, p, shown = true }: { item: Item; p: Palette; shown?: boolean }) {
  const w = useWeight();
  const reducedMotion = useReducedMotion();
  const tabs = item.tabs ?? [];
  const filled = item.variant === "filled";
  const itemStyle = filled
    ? { background: p.primaryContainer, color: p.onPrimaryContainer }
    : { background: p.secondaryContainer, color: p.onSecondaryContainer };
  const extended = item.kind === "extendedFab";
  /* the close button is the M size: a small or a large FAB eases into it rather than jumping */
  const grow = (item.size ?? FAB_MENU_CLOSE) / FAB_MENU_CLOSE;
  /* opening, the entry nearest the button leads; shutting, the run plays back from the far end */
  const wait = menuEntriesWait(item);
  const after = (i: number) => wait + (tabs.length - 1 - i) * MENU_STAGGER;
  const before = (i: number) => i * MENU_SHUT_STAGGER;
  const phase = useOpenPhase(shown);
  const open = phase === "open";
  const closing = phase === "closing";
  const roll = (i: number) =>
    reducedMotion
      ? { duration: 0 }
      : open
        ? { duration: MENU_ROLL, ease: MENU_EASE, delay: after(i) }
        : { duration: MENU_SHUT, ease: MENU_EASE, delay: before(i) };
  const fade = (i: number) =>
    reducedMotion
      ? { duration: 0 }
      : open
        ? { duration: 0.12, delay: after(i) + MENU_ROLL * 0.55 }
        : { duration: 0.06, delay: before(i) };
  /* an entry is not there at all until its own roll begins, so a menu waiting its turn shows no
     slivers stacked over the button; on the way out it is the fade that takes it */
  const show = (i: number) =>
    reducedMotion
      ? { duration: 0 }
      : open
        ? { duration: 0, delay: after(i) }
        : closing
          ? { duration: MENU_SHUT_FADE, ease: MENU_EASE, delay: before(i) }
          : { duration: 0 };
  return (
    /* the column hangs from the bottom: the button keeps its place while the box above it grows */
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "flex-end", gap: FAB_MENU_GAP, height: "100%" }}>
      {tabs.map((tab, i) => (
        <motion.span
          key={i}
          /* the entry arrives with its roll and leaves by fading, part way through a roll it
             never finishes */
          initial={false}
          animate={{ opacity: open ? 1 : 0 }}
          transition={show(i)}
          style={{
            position: "relative",
            color: itemStyle.color,
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            height: FAB_MENU_ITEM_H,
            padding: "0 24px 0 20px",
            fontSize: 16,
            fontWeight: w(500, 700),
            whiteSpace: "nowrap",
            maxWidth: "100%",
            boxSizing: "border-box",
            flex: "0 0 auto",
          }}
        >
          {/* the pill itself unrolls from its right edge, so the entry opens towards the text */}
          <motion.span
            aria-hidden
            initial={false}
            animate={{ scaleX: open ? 1 : closing ? MENU_SHUT_SCALE : 0.06 }}
            transition={roll(i)}
            style={{
              ...itemStyle,
              position: "absolute",
              inset: 0,
              transformOrigin: "100% 50%",
              borderRadius: scaleR(28),
              boxShadow: "0 1px 3px rgba(0,0,0,0.16)",
            }}
          />
          {/* the icon and the label arrive once there is a pill wide enough to hold them */}
          <motion.span
            initial={false}
            animate={{ opacity: open ? 1 : 0 }}
            transition={fade(i)}
            style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 12, minWidth: 0 }}
          >
            {tab.icon && <Icon name={tab.icon} size={22} />}
            <span style={ellipsis}>{tab.label}</span>
          </motion.span>
        </motion.span>
      ))}
      <motion.span
        /* scaled rather than resized: the button, its icon and its corners all land on the M size
           together, and the drawing the editor measures never changes width */
        initial={false}
        animate={extended ? undefined : { scale: open ? 1 : grow }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : open
              ? { duration: MENU_BUTTON_ROLL, ease: MENU_EASE }
              : { duration: MENU_BUTTON_SHUT, ease: MENU_EASE, delay: menuButtonWait(item) }
        }
        style={{
          /* the button the menu hangs off is the FAB itself, wearing the icon that shuts it */
          ...variantStyle(item.variant, p),
          transformOrigin: "100% 100%",
          width: extended ? undefined : FAB_MENU_CLOSE,
          height: extended ? extendedFabHeight(item) : FAB_MENU_CLOSE,
          padding: extended ? "0 20px" : undefined,
          gap: 12,
          fontSize: 16,
          fontWeight: w(500, 700),
          whiteSpace: "nowrap",
          borderRadius: scaleR(extended ? extendedFabMetrics(extendedFabHeight(item)).radius : Math.round(FAB_MENU_CLOSE * 0.28)),
          display: "grid",
          placeItems: "center",
          boxShadow: "0 3px 8px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.12)",
          flex: "0 0 auto",
        }}
      >
        {/* the cross and the button's own icon trade places, so the swap at either end is
            between two drawings that already match */}
        <span style={{ display: "grid", placeItems: "center", gridArea: "1 / 1" }}>
          <motion.span
            initial={false}
            animate={{ opacity: open ? 1 : 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.1, delay: open ? 0.04 : 0 }}
            style={{ gridArea: "1 / 1", display: "grid", placeItems: "center" }}
          >
            <Icon name="close" size={24} />
          </motion.span>
          {item.icon && (
            <motion.span
              initial={false}
              animate={{ opacity: open ? 0 : 1 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.1, delay: open ? 0 : menuButtonWait(item) + 0.04 }}
              style={{ gridArea: "1 / 1", display: "grid", placeItems: "center" }}
            >
              <Icon name={item.icon} size={24} />
            </motion.span>
          )}
        </span>
        {extended && item.label.trim() && <span style={{ gridArea: "1 / 2" }}>{item.label}</span>}
      </motion.span>
    </div>
  );
}

/* ---------- the eight content widgets ---------- */

/** the icons an icon-tile grid cell cycles through */
const GRID_TILE_ICONS = ["home", "favorite", "search", "settings", "person", "star"];
/** the runs a chart is born drawing: the same numbers every time, so a sketch is stable */
const CHART_DATA = [35, 62, 45, 78, 55, 90];

/** a skeleton line: the little bar that stands for words not written yet */
function SkeletonLine({ w, p, strong }: { w: string; p: Palette; strong?: boolean }) {
  return <span style={{ display: "block", width: w, height: 5, borderRadius: 3, background: p.onSurfaceVariant, opacity: strong ? 0.5 : 0.3 }} />;
}

/** the scroll view's placeholder tracks, drawn inside a surfaceContainerLow frame. The edit
 *  canvas shows a still wireframe with its scrollbar and fade; the preview hands the same frame
 *  a real overflow container so a finger or wheel can move through it. */
function ScrollViewBody({
  item,
  p,
  lang,
  preview,
  onScroll,
}: {
  item: Item;
  p: Palette;
  lang: Lang;
  preview: boolean;
  onScroll?: (top: number) => void;
}) {
  const dir = scrollDirectionOf(item);
  const count = scrollItemCountOf(item);
  const gap = scrollGapOf(item);
  const nested = dir === "nested";
  const horizontal = dir === "horizontal";
  const thumb = item.showScrollbar ?? true;
  const card = (i: number, width?: number) => (
    <div
      key={i}
      style={{
        flex: "0 0 auto",
        width: width ?? "100%",
        height: 72,
        borderRadius: scaleR(12),
        background: p.surfaceContainer,
        border: `1px solid ${p.outlineVariant}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 12px",
        boxSizing: "border-box",
      }}
    >
      <span style={{ width: 32, height: 32, borderRadius: 16, background: p.primaryContainer, color: p.onPrimaryContainer, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
        <Icon name="image" size={18} />
      </span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <SkeletonLine w="74%" p={p} strong />
        <SkeletonLine w="48%" p={p} />
      </span>
    </div>
  );
  const row = (length: number) => <div style={{ display: "flex", flexDirection: "row", gap, flex: "0 0 auto", width: "max-content" }}>{Array.from({ length }, (_, i) => card(i, 148))}</div>;
  const list = (length: number) => <div style={{ display: "flex", flexDirection: "column", gap }}>{Array.from({ length }, (_, i) => card(i))}</div>;
  const content = nested ? (
    <div style={{ display: "flex", flexDirection: "column", gap, width: "max-content" }}>
      {row(3)}
      {list(Math.max(1, count - 2))}
    </div>
  ) : horizontal ? row(count) : list(count);
  return (
    <div style={{ position: "relative", height: "100%", background: p.surfaceContainerLow, overflow: "hidden", transform: "translateZ(0)", boxSizing: "border-box" }}>
      <div
        data-scroll-view={preview ? "preview" : "edit"}
        onScroll={(e) => {
          if (preview) onScroll?.(e.currentTarget.scrollTop);
        }}
        style={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          padding: 12,
          overflowY: preview && !horizontal ? "auto" : "hidden",
          overflowX: preview && (horizontal || nested) ? "auto" : "hidden",
          overscrollBehavior: "contain",
          touchAction: preview ? (horizontal ? "pan-x" : nested ? "pan-x pan-y" : "pan-y") : undefined,
        }}
      >
        {content}
      </div>
      {thumb && !horizontal && (
        <span style={{ position: "absolute", right: 4, top: 14, width: 4, height: "32%", borderRadius: 2, background: p.outlineVariant, opacity: 0.8, pointerEvents: "none" }} />
      )}
      {thumb && (horizontal || nested) && (
        <span style={{ position: "absolute", left: 14, bottom: 4, width: "32%", height: 4, borderRadius: 2, background: p.outlineVariant, opacity: 0.8, pointerEvents: "none" }} />
      )}
      {!horizontal && (
        <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 28, background: `linear-gradient(to top, ${p.surfaceContainerLow}, ${p.surfaceContainerLow}00)`, pointerEvents: "none" }} />
      )}
      {(horizontal || nested) && (
        <span style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 28, background: `linear-gradient(to left, ${p.surfaceContainerLow}, ${p.surfaceContainerLow}00)`, pointerEvents: "none" }} />
      )}
      {!preview && nested && (
        <span style={{ position: "absolute", left: 10, bottom: 8, padding: "2px 8px", borderRadius: 10, background: p.inverseSurface, color: p.inverseOnSurface, fontSize: 9, fontWeight: 700, pointerEvents: "none" }}>
          {t("nestedScrollBadge", lang)}
        </span>
      )}
    </div>
  );
}

/** the matrix a QR sketch is drawn from: the payload seeds a deterministic bit grid, with the
 *  three finder squares in their corners, so the same address always draws the same code */
export function qrMatrix(payload: string): boolean[][] {
  const n = 21;
  const m: boolean[][] = Array.from({ length: n }, () => Array<boolean>(n).fill(false));
  let seed = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    seed ^= payload.charCodeAt(i);
    seed = Math.imul(seed, 16777619) >>> 0;
  }
  const rand = () => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return (seed >>> 16) / 65536;
  };
  const inFinder = (r: number, c: number) => (r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!inFinder(r, c)) m[r][c] = rand() < 0.45;
  for (const [r0, c0] of [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ] as const)
    for (let r = 0; r < 7; r++)
      for (let c = 0; c < 7; c++) {
        const ring = r === 0 || r === 6 || c === 0 || c === 6;
        const dot = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        m[r0 + r][c0 + c] = ring || dot;
      }
  return m;
}

/** a chart's drawing: bars with rounded tops, a smooth line over its shaded area, or a donut
 *  with a metric in the hole. Drawn on the roles of the theme, no axes, no words. */
function ChartDrawing({ type, p, grid }: { type: "bar" | "line" | "donut"; p: Palette; grid: boolean }) {
  if (type === "donut") {
    const segs: [number, string][] = [
      [55, p.primary],
      [25, p.tertiaryContainer],
      [20, p.secondaryContainer],
    ];
    const C = 2 * Math.PI * 36;
    let off = 0;
    return (
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }} aria-hidden>
        {segs.map(([v, color], i) => {
          const dash = (v / 100) * C;
          const el = (
            <circle
              key={i}
              cx="50"
              cy="50"
              r="36"
              fill="none"
              stroke={color}
              strokeWidth={14}
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-off}
              transform="rotate(-90 50 50)"
            />
          );
          off += dash;
          return el;
        })}
        <text x="50" y="55" textAnchor="middle" fontSize="15" fontWeight="700" fill={p.onSurface}>
          64%
        </text>
      </svg>
    );
  }
  if (type === "bar") {
    return (
      <div style={{ position: "relative", height: "100%" }}>
        {grid &&
          [0, 1, 2].map((i) => (
            <div key={i} style={{ position: "absolute", left: 0, right: 0, bottom: `${(i * 2 + 1) * 25}%`, height: 1, background: p.outlineVariant, opacity: 0.7 }} />
          ))}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", gap: 10 }}>
          {CHART_DATA.map((v, i) => (
            <div key={i} style={{ flex: 1, minWidth: 0, height: `${v}%`, background: i === CHART_DATA.length - 1 ? p.tertiaryContainer : p.primary, borderRadius: "8px 8px 2px 2px" }} />
          ))}
        </div>
      </div>
    );
  }
  /* the line: a smooth run through the points, the area beneath it shaded */
  const pts = CHART_DATA.map((v, i) => [10 + (i * 180) / (CHART_DATA.length - 1), 95 - (v / 100) * 85]);
  const seg = (a: number[], b: number[]) => {
    const mx = (a[0] + b[0]) / 2;
    return `C ${mx} ${a[1]}, ${mx} ${b[1]}, ${b[0]} ${b[1]}`;
  };
  const d = `M ${pts[0][0]} ${pts[0][1]} ${pts.slice(1).map((pt, i) => seg(pts[i], pt)).join(" ")}`;
  const area = `${d} L ${pts[pts.length - 1][0]} 100 L ${pts[0][0]} 100 Z`;
  return (
    <svg width="100%" height="100%" viewBox="0 0 200 100" preserveAspectRatio="none" style={{ display: "block" }} aria-hidden>
      {grid && [0, 1, 2].map((i) => <line key={i} x1="0" x2="200" y1={25 * (i + 1)} y2={25 * (i + 1)} stroke={p.outlineVariant} strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
      <path d={area} fill={p.primary} opacity={0.15} />
      <path d={d} fill="none" stroke={p.primary} strokeWidth={2.5} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.5} fill={p.primary} />
      ))}
    </svg>
  );
}

function Body({ item, p, tabScroll, menuShown, preview, barCollapsed, onScroll }: { item: Item; p: Palette; tabScroll?: number; menuShown?: boolean; preview?: boolean; barCollapsed?: boolean; onScroll?: (top: number) => void }) {
  const lang = useLang();
  const w = useWeight();
  const hasLabel = item.label.trim().length > 0;
  const hasSupporting = !!item.supporting?.trim();

  if (menuOpen(item)) return item.kind === "splitButton" ? <SplitMenuContent item={item} p={p} shown={menuShown} /> : <FabMenuContent item={item} p={p} shown={menuShown} />;
  if (MEASURED.includes(item.kind)) return <MeasuredContent item={item} p={p} />;

  switch (item.kind) {
    case "bottomSheet":
      if (preview) return <PreviewDismiss item={item} p={p} mode="sheet" />;
      return (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 16 }}>
          <div
            style={{
              width: 32,
              height: 4,
              borderRadius: 2,
              background: onToken(item.fill ?? "surfaceContainerLow", p),
              opacity: 0.4,
            }}
          />
        </div>
      );

    case "iconButton":
      /* the icon is the one the M3 size the circle lands on asks for */
      return (
        <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
          {item.icon && <Icon name={item.icon} size={buttonMetrics(buttonHeightOf(item)).icon} fill={item.variant === "filled"} />}
        </div>
      );

    case "fab": {
      const s = item.size ?? 56;
      return (
        <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
          {item.icon && <Icon name={item.icon} size={Math.round(s * 0.42)} />}
        </div>
      );
    }

    case "topAppBar": {
      /* the small bar keeps its title between the icons; the medium and large ones let it down
         onto a line of its own at the foot, the way M3's flexible bars do */
      const barH = topBarHeightOf(item);
      const tall = barH > TOP_BAR_SIZES[0].h;
      const font = topBarFontOf(item);
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            /* the inset the bar has, if any (see sizeOf) */
            padding: `${sizeOf(item, {}).h - barH}px 0 0`,
            height: "100%",
            boxSizing: "border-box",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 4px", height: 64, flex: "0 0 auto" }}>
            <div style={{ width: 48, height: 48, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
              {item.icon && <Icon name={item.icon} size={24} color={p.onSurface} />}
            </div>
            <div className="m3-size-ease" style={{ flex: 1, minWidth: 0, fontSize: tall ? 0 : font, opacity: tall ? 0 : 1, fontWeight: w(400, 600), color: p.onSurface, transition: "opacity 200ms", ...ellipsis }}>
              {item.label}
            </div>
            <div style={{ width: 48, height: 48, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
              {item.icon2 && <Icon name={item.icon2} size={24} color={p.onSurfaceVariant} />}
            </div>
          </div>
          {tall && (
            <div className="m3-size-ease" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "flex-end", padding: "0 16px 24px", fontSize: font, lineHeight: 1.2, fontWeight: w(400, 600), color: p.onSurface, ...ellipsis }}>
              {item.label}
            </div>
          )}
        </div>
      );
    }

    case "collapsingTopBar": {
      /* the bar folds from M3's medium/large flexible app bar to the small one; in a preview a
       * scroll view on the same screen drives the folded state through barCollapsed */
      const collapsed = barCollapsed ?? !!item.isCollapsed;
      const large = barVariantOf(item) === "large";
      const subtitle = item.supporting?.trim();
      const actions = actionCountOf(item);
      const behavior = scrollBehaviorOf(item);
      return (
        <div
          style={{
            position: "relative",
            height: "100%",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? "0 8px" : "12px 4px 0",
            background: collapsed ? p.surfaceContainer : p.surface,
            boxShadow: collapsed ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
            transition: "background 200ms, box-shadow 200ms",
            color: p.onSurface,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4, height: collapsed ? 48 : 56, flex: "0 0 auto" }}>
            {item.showNavigationIcon !== false && (
              <span style={{ width: 48, height: 48, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
                <Icon name={item.icon ?? "arrow_back"} size={24} color={p.onSurface} />
              </span>
            )}
            <span
              className="m3-size-ease"
              style={{ flex: 1, minWidth: 0, fontSize: collapsed ? 22 : 0, fontWeight: w(500, 700), color: p.onSurface, opacity: collapsed ? 1 : 0, ...ellipsis }}
            >
              {item.label}
            </span>
            {Array.from({ length: actions }, (_, i) => (
              <span key={i} style={{ width: 48, height: 48, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
                <Icon name={i === 0 ? (item.icon2 ?? "more_vert") : "search"} size={22} color={p.onSurfaceVariant} />
              </span>
            ))}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 16px 16px", gap: 4 }}>
              <span
                className="m3-size-ease"
                style={{ fontSize: large ? 36 : 28, lineHeight: 1.15, fontWeight: w(400, 600), color: p.onSurface, ...ellipsis }}
              >
                {item.label}
              </span>
              {hasSupporting && <span style={{ fontSize: 13, color: p.onSurfaceVariant, ...ellipsis }}>{subtitle}</span>}
            </div>
          )}
          {!preview && collapsed && (
            <span
              title={t(behavior === "pinned" ? "behaviorPinned" : behavior === "enterAlways" ? "behaviorEnterAlways" : "behaviorExitUntilCollapsed", lang)}
              style={{ position: "absolute", right: 10, bottom: 4, fontSize: 9, fontWeight: 600, color: p.onSurfaceVariant, opacity: 0.75, pointerEvents: "none" }}
            >
              {behavior}
            </span>
          )}
        </div>
      );
    }

    case "scrollView":
      return <ScrollViewBody item={item} p={p} lang={lang} preview={!!preview} onScroll={onScroll} />;

    case "searchBar":
      if (preview) return <PreviewField item={item} p={p} search />;
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px", height: "100%" }}>
          {item.icon && <Icon name={item.icon} size={24} color={p.onSurface} />}
          <div style={{ flex: 1, minWidth: 0, fontSize: 16, color: p.onSurfaceVariant, ...ellipsis }}>
            {item.label}
          </div>
          {item.icon2 && <Icon name={item.icon2} size={24} color={p.onSurfaceVariant} />}
        </div>
      );

    case "card": {
      const pos = cardImagePosOf(item);
      const hasImage = !item.noImage;
      const padding = CARD_PADDING;
      const align = cardContentAlignOf(item);
      const justifyContent = { start: "flex-start", center: "center", end: "flex-end" }[align] as React.CSSProperties["justifyContent"];
      const across = cardTextAlignOf(item);
      const alignItems = { start: "flex-start", center: "center", end: "flex-end" }[across] as React.CSSProperties["alignItems"];
      const textAlign = { start: "start", center: "center", end: "end" }[across] as React.CSSProperties["textAlign"];
      const ink = cardTextColorOf(item, p);
      const body = cardBodyColorOf(item, p);
      const picture = item.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        item.icon && <Icon name={item.icon} size={34} />
      );
      const media = (style: React.CSSProperties) => (
        <div
          style={{
            borderRadius: scaleR(14),
            background: p.primaryContainer,
            color: p.onPrimaryContainer,
            display: "grid",
            placeItems: "center",
            flex: "0 0 auto",
            overflow: "hidden",
            ...style,
          }}
        >
          {picture}
        </div>
      );
      const text = (
        /* the column may shrink under a large picture: what does not fit is clipped, never pushed out of the card */
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: CARD_TEXT_GAP, justifyContent, alignItems, textAlign }}>
          {hasLabel && (
            <div style={{ fontSize: 16, fontWeight: w(600, 700), color: ink, maxWidth: "100%", ...ellipsis }}>{item.label}</div>
          )}
          {hasSupporting && (
            <div style={{ fontSize: 13, lineHeight: 1.5, color: body.color, opacity: body.opacity, overflow: "hidden" }}>
              {item.supporting}
            </div>
          )}
        </div>
      );
      if (hasImage && pos === "background") {
        /* Full-bleed media behind the text. A photo, or a chosen text color that the placeholder's
         * container may not carry, gets a scrim on the text's side: dark under light text, light under dark. */
        const scrim = item.src || item.textColor ? cardScrimOf(ink, align) : undefined;
        return (
          <div style={{ position: "relative", height: "100%", boxSizing: "border-box" }}>
            <div style={{ position: "absolute", inset: 0, background: p.primaryContainer, color: p.onPrimaryContainer, display: "grid", placeItems: "center" }}>
              {picture}
            </div>
            {scrim && <div style={{ position: "absolute", inset: 0, background: scrim }} />}
            <div style={{ position: "relative", height: "100%", boxSizing: "border-box", padding, display: "flex", flexDirection: "column" }}>{text}</div>
          </div>
        );
      }
      /* top / bottom: the image band above or under the text; leading / trailing: a full-height column beside it */
      const side = hasImage && (pos === "leading" || pos === "trailing");
      const after = pos === "trailing" || pos === "bottom";
      return (
        <div
          style={{
            padding,
            height: "100%",
            display: "flex",
            flexDirection: side ? "row" : "column",
            gap: CARD_MEDIA_GAP,
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          {hasImage && !after && media(side ? { width: cardImageSizeOf(item), alignSelf: "stretch" } : { height: cardImageSizeOf(item) })}
          {text}
          {hasImage && after && media(side ? { width: cardImageSizeOf(item), alignSelf: "stretch" } : { height: cardImageSizeOf(item) })}
        </div>
      );
    }

    case "listItem": {
      const iconBg = item.iconFill === "none" ? null : (item.iconFill ?? "primaryContainer");
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 16px", height: "100%" }}>
          {item.icon && (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                background: iconBg ? p[iconBg] : "transparent",
                color: iconBg ? onToken(iconBg, p) : onToken(item.fill ?? "surfaceContainerLow", p),
                display: "grid",
                placeItems: "center",
                flex: "0 0 auto",
              }}
            >
              <Icon name={item.icon} size={22} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {hasLabel && <div style={{ fontSize: 16, color: p.onSurface, ...ellipsis }}>{item.label}</div>}
            {hasSupporting && (
              <div style={{ fontSize: 13, color: p.onSurfaceVariant, ...ellipsis }}>{item.supporting}</div>
            )}
          </div>
          {item.switch ? <SwitchControl on={!!item.checked} p={p} /> : item.icon2 && <Icon name={item.icon2} size={22} color={p.onSurfaceVariant} />}
        </div>
      );
    }

    case "dialog":
      if (preview) return <PreviewDismiss item={item} p={p} mode="dialog" />;
      return (
        <div
          style={{
            padding: 24,
            height: "100%",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {item.icon && (
            <div style={{ textAlign: "center", color: p.primary }}>
              <Icon name={item.icon} size={24} />
            </div>
          )}
          {hasLabel && (
            <div
              style={{
                fontSize: 24,
                fontWeight: w(400, 600),
                color: p.onSurface,
                textAlign: item.icon ? "center" : "left",
                ...ellipsis,
              }}
            >
              {item.label}
            </div>
          )}
          {hasSupporting && (
            <div style={{ fontSize: 14, lineHeight: 1.5, color: p.onSurfaceVariant, flex: 1, overflow: "hidden" }}>
              {item.supporting}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            {[t("cancel", lang), t("ok", lang)].map((t) => (
              <span
                key={t}
                style={{
                  padding: "0 12px",
                  height: 40,
                  display: "inline-flex",
                  alignItems: "center",
                  color: p.primary,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      );

    case "snackbar":
      if (preview) return <PreviewDismiss item={item} p={p} mode="snack" />;
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px 0 16px", height: "100%" }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: 14, color: p.inverseOnSurface, ...ellipsis }}>
            {item.label}
          </div>
          {hasSupporting && (
            <span
              style={{
                padding: "0 12px",
                height: 36,
                display: "inline-flex",
                alignItems: "center",
                color: p.inversePrimary,
                fontSize: 14,
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              {item.supporting}
            </span>
          )}
        </div>
      );

    case "textField": {
      if (preview) return <PreviewField item={item} p={p} />;
      const filled = item.variant === "filled";
      return (
        <div style={{ position: "relative", height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px", height: "100%" }}>
            {item.icon && <Icon name={item.icon} size={24} color={p.onSurfaceVariant} />}
            <span style={{ flex: 1, minWidth: 0, fontSize: 16, color: p.onSurfaceVariant, ...ellipsis }}>
              {filled ? "" : ""}
            </span>
          </div>
          {hasLabel && (
            <span
              style={{
                position: "absolute",
                left: item.icon ? 52 : 16,
                top: filled ? 8 : -8,
                fontSize: 12,
                lineHeight: "16px",
                color: p.primary,
                background: filled ? "transparent" : p.surface,
                padding: filled ? 0 : "0 4px",
                marginLeft: filled ? 0 : -4,
              }}
            >
              {item.label}
            </span>
          )}
          {filled && (
            <span
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 2,
                background: p.primary,
              }}
            />
          )}
          {hasSupporting && (
            <span
              style={{
                position: "absolute",
                left: 16,
                top: "100%",
                marginTop: 4,
                fontSize: 12,
                color: p.onSurfaceVariant,
                whiteSpace: "nowrap",
              }}
            >
              {item.supporting}
            </span>
          )}
        </div>
      );
    }

    case "select": {
      /* a closed dropdown: the chosen option is the value and the label floats; with
       * nothing chosen the label sits in the field */
      const filled = item.variant === "filled";
      const value = item.selected === undefined ? undefined : item.tabs?.[item.selected]?.label;
      return (
        <div style={{ position: "relative", height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 12px 0 16px", height: "100%" }}>
            {item.icon && <Icon name={item.icon} size={24} color={p.onSurfaceVariant} />}
            <span style={{ flex: 1, minWidth: 0, fontSize: 16, color: value ? p.onSurface : p.onSurfaceVariant, paddingTop: value && filled ? 16 : 0, ...ellipsis }}>
              {value ?? item.label}
            </span>
            <Icon name="arrow_drop_down" size={24} color={p.onSurfaceVariant} />
          </div>
          {value && hasLabel && (
            <span
              style={{
                position: "absolute",
                left: item.icon ? 52 : 16,
                top: filled ? 8 : -8,
                fontSize: 12,
                lineHeight: "16px",
                color: p.onSurfaceVariant,
                background: filled ? "transparent" : p.surface,
                padding: filled ? 0 : "0 4px",
                marginLeft: filled ? 0 : -4,
              }}
            >
              {item.label}
            </span>
          )}
          {filled && <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1, background: p.onSurfaceVariant }} />}
          {hasSupporting && (
            <span style={{ position: "absolute", left: 16, top: "100%", marginTop: 4, fontSize: 12, color: p.onSurfaceVariant, whiteSpace: "nowrap" }}>
              {item.supporting}
            </span>
          )}
        </div>
      );
    }

    case "slider": {
      if (preview) return <PreviewSlider item={item} p={p} />;
      const v = Math.min(100, Math.max(0, item.value ?? 40)) / 100;
      const w = item.size ?? 280;
      const handleX = 2 + (w - 4) * v;
      return (
        <div style={{ position: "relative", height: "100%" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              width: Math.max(0, handleX - 8),
              top: 14,
              height: 16,
              borderRadius: "8px 2px 2px 8px",
              background: p.primary,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: handleX + 8,
              right: 0,
              top: 14,
              height: 16,
              borderRadius: "2px 8px 8px 2px",
              background: p.secondaryContainer,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 6,
              top: 20,
              width: 4,
              height: 4,
              borderRadius: 2,
              background: p.onSecondaryContainer,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: handleX - 2,
              top: 0,
              width: 4,
              height: 44,
              borderRadius: 2,
              background: p.primary,
            }}
          />
        </div>
      );
    }

    case "image":
      if (item.src) {
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.src}
            alt=""
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        );
      }
      return (
        <div style={{ display: "grid", placeItems: "center", height: "100%", color: p.outline }}>
          {item.icon && <Icon name={item.icon} size={Math.min(48, Math.round((item.size ?? 200) * 0.3))} />}
        </div>
      );

    case "camera":
      /* a viewfinder: the live feed is dark, with focus brackets and a shutter row. The body
         paints the dark ground itself, on a layer of its own, so a box resized in a hurry never
         shows the screen through it while the clipped box behind it catches up. */
      return (
        <div style={{ position: "relative", height: "100%", color: p.inverseOnSurface, background: p.inverseSurface, transform: "translateZ(0)" }}>
          {(["left", "right"] as const).map((side) =>
            (["top", "bottom"] as const).map((edge) => (
              <div
                key={`${side}-${edge}`}
                style={{
                  position: "absolute",
                  [side]: 24,
                  [edge]: 24,
                  width: 28,
                  height: 28,
                  opacity: 0.7,
                  [`border${side === "left" ? "Left" : "Right"}`]: `3px solid ${p.inverseOnSurface}`,
                  [`border${edge === "top" ? "Top" : "Bottom"}`]: `3px solid ${p.inverseOnSurface}`,
                  [`border${edge === "top" ? "Top" : "Bottom"}${side === "left" ? "Left" : "Right"}Radius`]: 6,
                }}
              />
            )),
          )}
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", opacity: 0.5 }}>
            {item.icon && <Icon name={item.icon} size={40} />}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 20, display: "grid", placeItems: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, border: `4px solid ${p.inverseOnSurface}`, display: "grid", placeItems: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 24, background: p.inverseOnSurface }} />
            </div>
          </div>
        </div>
      );

    case "map":
      /* a stylised city: blocks on a light ground, two main roads and a river, one pin. Painted
         on its own layer, like the camera, so a quick resize never leaves it see-through. */
      return (
        <div style={{ position: "relative", height: "100%", overflow: "hidden", background: p.surfaceContainerLow, transform: "translateZ(0)" }}>
          <svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0 }} aria-hidden>
            <rect width="400" height="300" fill={p.surfaceContainerLow} />
            <path d="M-20 210 C 80 170, 140 260, 240 220 S 380 150, 430 190 L 430 240 C 380 200, 300 260, 240 250 S 120 230, -20 250 Z" fill={p.primaryContainer} opacity={0.6} />
            {[
              [20, 20, 90, 60], [130, 20, 110, 60], [260, 20, 120, 60],
              [20, 100, 90, 70], [130, 100, 60, 70], [210, 100, 170, 70],
              [20, 190, 60, 40], [300, 200, 80, 30],
            ].map(([x, y, w, h], i) => (
              <rect key={i} x={x} y={y} width={w} height={h} rx={6} fill={p.surfaceContainerHighest} />
            ))}
            <path d="M0 90 H400 M110 0 V300 M250 0 V300" stroke={p.surface} strokeWidth={10} fill="none" />
            <path d="M0 90 H400 M110 0 V300 M250 0 V300" stroke={p.outlineVariant} strokeWidth={1} fill="none" opacity={0.6} />
            <g transform="translate(200 150)">
              <path d="M0 24 C -14 6, -20 -2, -20 -12 A 20 20 0 0 1 20 -12 C 20 -2, 14 6, 0 24 Z" fill={p.primary} />
              <circle cx="0" cy="-12" r="7" fill={p.onPrimary} />
            </g>
          </svg>
        </div>
      );

    case "youtube": {
      if (preview) return <PreviewPlayer item={item} p={p} kind="youtube" />;
      /* a video card: a thumbnail ground, a play badge at the centre, and a bar across the
         bottom that carries the title and a duration pill. Painted on its own layer, like
         the camera, so a quick resize never leaves it see-through. */
      return (
        <div style={{ position: "relative", height: "100%", background: p.surfaceContainerHigh, overflow: "hidden", transform: "translateZ(0)" }}>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: p.outlineVariant, opacity: 0.35 }}>
            {item.icon && <Icon name={item.icon} size={64} />}
          </div>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 24, background: p.primary, display: "grid", placeItems: "center", color: p.onPrimary }}>
              <Icon name="play_arrow" size={28} fill />
            </div>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: p.inverseSurface, opacity: 0.9 }}>
            {item.label.trim() && <span style={{ flex: 1, minWidth: 0, fontSize: 12, lineHeight: "16px", fontWeight: 500, color: p.inverseOnSurface, ...ellipsis }}>{item.label}</span>}
            <span style={{ flex: "0 0 auto", padding: "1px 6px", borderRadius: 8, fontSize: 11, lineHeight: "14px", fontWeight: 500, background: p.inverseOnSurface, color: p.inverseSurface }}>3:24</span>
          </div>
        </div>
      );
    }

    case "video": {
      if (preview) return <PreviewPlayer item={item} p={p} kind="video" />;
      /* a media player: a dark frame, a play button at the centre and a scrub bar with
         mute and fullscreen at the bottom. Painted on its own layer, like the camera. */
      return (
        <div style={{ position: "relative", height: "100%", background: p.surfaceContainerHigh, overflow: "hidden", transform: "translateZ(0)", color: p.onSurface }}>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: p.outlineVariant, opacity: 0.35 }}>
            {item.icon && <Icon name={item.icon} size={64} />}
          </div>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 28, background: p.primary, display: "grid", placeItems: "center", color: p.onPrimary }}>
              <Icon name="play_arrow" size={32} fill />
            </div>
          </div>
          {/* the scrub bar: a track with the part already watched lit */}
          <div style={{ position: "absolute", left: 12, right: 12, bottom: 26 }}>
            <div style={{ height: 4, borderRadius: 2, background: p.outlineVariant }}>
              <div style={{ width: "40%", height: "100%", borderRadius: 2, background: p.primary }} />
            </div>
          </div>
          <div style={{ position: "absolute", left: 12, right: 12, bottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
            {item.label.trim() && <span style={{ flex: 1, minWidth: 0, fontSize: 11, lineHeight: "16px", color: p.onSurfaceVariant, ...ellipsis }}>{item.label}</span>}
            <span style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 8, color: p.onSurfaceVariant }}>
              <Icon name="volume_off" size={18} />
              <Icon name="fullscreen" size={18} />
            </span>
          </div>
        </div>
      );
    }

    case "lottie": {
      if (preview) return <PreviewLottie item={item} p={p} />;
      /* a motion graphic: a soft ground, a preview badge at the centre, a loop pill at the
         corner and the animation's name under the badge */
      return (
        <div style={{ position: "relative", height: "100%", background: p.surfaceContainerHigh, overflow: "hidden", transform: "translateZ(0)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <div style={{ width: 48, height: 48, borderRadius: scaleR(16), background: p.primaryContainer, display: "grid", placeItems: "center", color: p.onPrimaryContainer }}>
            {item.icon && <Icon name={item.icon} size={28} />}
          </div>
          {item.label.trim() && <span style={{ maxWidth: "80%", fontSize: 12, lineHeight: "16px", fontWeight: 500, color: p.onSurface, textAlign: "center", ...ellipsis }}>{item.label}</span>}
          <div style={{ position: "absolute", right: 8, bottom: 8, display: "flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 10, border: `1px solid ${p.outlineVariant}`, color: p.onSurfaceVariant }}>
            <Icon name="loop" size={12} />
            <span style={{ fontSize: 10, lineHeight: "14px" }}>∞</span>
          </div>
        </div>
      );
    }

    case "gridView": {
      if (preview) return <PreviewGrid item={item} p={p} />;
      /* a grid of cells: rounded tiles that keep the aspect their kind asks for, drawn as bare
         picture places, cards with a thumbnail and two lines, or icon tiles */
      const cols = Math.min(4, Math.max(2, item.columns ?? 2));
      const cells = Math.min(12, Math.max(2, item.count ?? 4));
      const gap = item.gap ?? 12;
      const aspect = gridAspectOf(item) === "1:1" ? "1" : "4 / 3";
      const variant = gridCellOf(item);
      return (
        <div
          style={{
            position: "relative",
            height: "100%",
            background: p.surfaceContainerLow,
            overflow: "hidden",
            transform: "translateZ(0)",
            padding: gap,
            boxSizing: "border-box",
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap,
            alignContent: "start",
          }}
        >
          {Array.from({ length: cells }, (_, i) =>
            variant === "image" ? (
              <div key={i} style={{ background: p.surfaceContainerHighest, borderRadius: scaleR(12), display: "grid", placeItems: "center", color: p.outline, aspectRatio: aspect }}>
                <Icon name="image" size={22} />
              </div>
            ) : variant === "iconTile" ? (
              <div key={i} style={{ background: p.secondaryContainer, color: p.onSecondaryContainer, borderRadius: scaleR(12), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, aspectRatio: aspect }}>
                <Icon name={GRID_TILE_ICONS[i % GRID_TILE_ICONS.length]} size={24} />
                <span style={{ width: "46%", height: 5, borderRadius: 3, background: p.onSecondaryContainer, opacity: 0.35 }} />
              </div>
            ) : (
              <div key={i} style={{ background: p.surfaceContainerHighest, borderRadius: scaleR(12), overflow: "hidden", display: "flex", flexDirection: "column", aspectRatio: aspect }}>
                <div style={{ flex: 1, minHeight: 0, display: "grid", placeItems: "center", color: p.outline, background: p.surfaceContainerHigh }}>
                  <Icon name="image" size={20} />
                </div>
                <div style={{ flex: "0 0 auto", padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                  <SkeletonLine w="80%" p={p} strong />
                  <SkeletonLine w="55%" p={p} />
                </div>
              </div>
            ),
          )}
        </div>
      );
    }

    case "table": {
      if (preview) return <PreviewTable item={item} p={p} />;
      /* a table: a header row on a higher surface, then its rows, each ending in a status pill */
      const cols = Math.min(5, Math.max(2, item.columns ?? 3));
      const rows = Math.min(8, Math.max(2, item.rows ?? 4));
      const heads = (item.tabs ?? []).map((t) => t.label.trim() || "…");
      const head = (item.showHeader ?? true) && heads.length > 0;
      return (
        <div style={{ position: "relative", height: "100%", background: p.surface, overflow: "hidden", transform: "translateZ(0)", display: "flex", flexDirection: "column" }}>
          {head && (
            <div style={{ flex: "0 0 auto", display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, background: p.surfaceContainerHigh, borderBottom: `1px solid ${p.outlineVariant}` }}>
              {Array.from({ length: cols }, (_, c) => (
                <div key={c} style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, color: p.onSurfaceVariant, borderLeft: c ? `1px solid ${p.outlineVariant}` : "none", ...ellipsis }}>
                  {heads[c] ?? "…"}
                </div>
              ))}
            </div>
          )}
          {Array.from({ length: rows }, (_, r) => (
            <div
              key={r}
              style={{
                flex: 1,
                minHeight: 0,
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                background: (item.striped ?? false) && r % 2 === 1 ? p.surfaceContainerLow : "transparent",
                borderTop: r ? `1px solid ${p.outlineVariant}` : "none",
              }}
            >
              {Array.from({ length: cols }, (_, c) => (
                <div key={c} style={{ display: "flex", alignItems: "center", padding: "0 10px", borderLeft: c ? `1px solid ${p.outlineVariant}` : "none", minWidth: 0 }}>
                  {c === cols - 1 ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 9, background: r % 2 ? p.primaryContainer : p.secondaryContainer }}>
                      <span style={{ width: 6, height: 6, borderRadius: 3, background: r % 2 ? p.onPrimaryContainer : p.onSecondaryContainer, opacity: 0.7 }} />
                    </span>
                  ) : (
                    <SkeletonLine w={`${62 - ((r * 13 + c * 29) % 30)}%`} p={p} strong={c === 0} />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    case "rating": {
      if (preview) return <PreviewRating item={item} p={p} />;
      /* a row of stars: the filled part of each one lit in primary over an empty star */
      const v = Math.min(5, Math.max(0, item.value ?? 4.5));
      const scale = scaleOf(item);
      const sz = scale === "sm" ? 18 : scale === "lg" ? 32 : 24;
      return (
        <div style={{ height: "100%", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: scale === "sm" ? 2 : 4, color: p.outlineVariant }}>
            {Array.from({ length: 5 }, (_, i) => {
              const fill = Math.min(1, Math.max(0, v - i));
              return (
                <span key={i} style={{ position: "relative", width: sz, height: sz, display: "grid", placeItems: "center" }}>
                  <Icon name="star" size={sz} />
                  {fill > 0 && (
                    <span style={{ position: "absolute", left: 0, top: 0, width: sz * fill, height: sz, overflow: "hidden", display: "grid", placeItems: "center", color: p.primary }}>
                      <Icon name="star" size={sz} fill />
                    </span>
                  )}
                </span>
              );
            })}
          </div>
          {(item.showLabel ?? true) && (
            <span style={{ fontSize: scale === "lg" ? 14 : 12, color: p.onSurfaceVariant, whiteSpace: "nowrap" }}>
              {v % 1 ? v.toFixed(1) : v} (128)
            </span>
          )}
        </div>
      );
    }

    case "qrCode": {
      if (preview) return <PreviewQr item={item} p={p} />;
      /* a code drawn from its payload: high-contrast modules on a plain ground, a caption under
         it, and a frame the author can take off */
      const m = qrMatrix(item.src?.trim() || "https://example.com");
      const cap = item.supporting?.trim();
      return (
        <div
          style={{
            position: "relative",
            height: "100%",
            background: p.surface,
            overflow: "hidden",
            transform: "translateZ(0)",
            border: (item.showFrame ?? true) ? `1px solid ${p.outlineVariant}` : "none",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: 10,
          }}
        >
          <svg viewBox="0 0 21 21" style={{ width: "100%", flex: 1, minHeight: 0, display: "block" }} aria-hidden shapeRendering="crispEdges">
            {m.flatMap((row, r) => row.map((on, c) => (on ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={p.onSurface} /> : null)))}
          </svg>
          {cap && (
            <span style={{ flex: "0 0 auto", maxWidth: "100%", fontSize: 11, lineHeight: "14px", color: p.onSurfaceVariant, ...ellipsis }}>
              {cap}
            </span>
          )}
        </div>
      );
    }

    case "chart": {
      if (preview) return <PreviewChart item={item} p={p} />;
      /* a card with a title, a legend of dots, and the drawing the type asks for */
      const head = item.label.trim();
      const legend = item.showLegend ?? true;
      return (
        <div style={{ position: "relative", height: "100%", background: p.surfaceContainerLow, overflow: "hidden", transform: "translateZ(0)", display: "flex", flexDirection: "column", padding: "12px 14px", boxSizing: "border-box" }}>
          {(head || legend) && (
            <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              {head ? (
                <span style={{ fontSize: 13, fontWeight: 600, color: p.onSurface, flex: 1, minWidth: 0, ...ellipsis }}>{head}</span>
              ) : (
                <span style={{ flex: 1 }} />
              )}
              {legend && (
                <span style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 8 }}>
                  {[p.primary, p.tertiaryContainer, p.secondaryContainer].map((c, i) => (
                    <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 4, background: c }} />
                      <span style={{ width: 18, height: 4, borderRadius: 2, background: p.onSurfaceVariant, opacity: 0.35 }} />
                    </span>
                  ))}
                </span>
              )}
            </div>
          )}
          <div style={{ flex: 1, minHeight: 0 }}>
            <ChartDrawing type={chartTypeOf(item)} p={p} grid={item.showGrid ?? true} />
          </div>
        </div>
      );
    }

    case "audioPlayer": {
      if (preview) return <PreviewPlayer item={item} p={p} kind="audio" />;
      /* a track on a surface: its art, its title and artist, a play button the size its
         arrangement asks for, and a scrub with the track's length at the foot */
      const expanded = modeOf(item, "compact") === "expanded";
      const playing = !!item.isPlaying;
      const art = expanded ? 64 : 52;
      return (
        <div style={{ position: "relative", height: "100%", background: p.surfaceContainerHigh, overflow: "hidden", transform: "translateZ(0)", display: "flex", alignItems: "center", gap: 10, padding: expanded ? "14px 14px 22px" : "10px 12px 20px", boxSizing: "border-box" }}>
          <div style={{ width: art, height: art, flex: "0 0 auto", borderRadius: scaleR(12), background: p.primaryContainer, color: p.onPrimaryContainer, display: "grid", placeItems: "center" }}>
            <Icon name="music_note" size={expanded ? 30 : 24} />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: expanded ? 14 : 13, fontWeight: 600, color: p.onSurface, ...ellipsis }}>{item.label.trim() || "…"}</span>
            <span style={{ fontSize: 11, color: p.onSurfaceVariant, ...ellipsis }}>{item.supporting?.trim() || "…"}</span>
          </div>
          {expanded && <Icon name="skip_previous" size={22} color={p.onSurfaceVariant} />}
          <div style={{ width: expanded ? 48 : 40, height: expanded ? 48 : 40, flex: "0 0 auto", borderRadius: 24, background: p.primary, color: p.onPrimary, display: "grid", placeItems: "center" }}>
            <Icon name={playing ? "pause" : "play_arrow"} size={expanded ? 26 : 22} fill />
          </div>
          {expanded && <Icon name="skip_next" size={22} color={p.onSurfaceVariant} />}
          <div style={{ position: "absolute", left: 12, right: 12, bottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ flex: 1, height: 3, borderRadius: 2, background: p.outlineVariant }}>
              <div style={{ width: "38%", height: "100%", borderRadius: 2, background: p.primary }} />
            </div>
            {item.duration?.trim() && <span style={{ flex: "0 0 auto", fontSize: 10, color: p.onSurfaceVariant }}>{item.duration}</span>}
          </div>
        </div>
      );
    }

    case "webView": {
      if (preview) return <PreviewWebView item={item} p={p} />;
      /* a browser pane: an address bar with a lock and a refresh, then the page — its title and
         the blocks a freshly loaded page is drawn with */
      const url = item.src?.trim() || "example.com";
      const bar = item.showAddressBar ?? true;
      return (
        <div style={{ position: "relative", height: "100%", background: p.surface, overflow: "hidden", transform: "translateZ(0)", display: "flex", flexDirection: "column" }}>
          {bar && (
            <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: p.surfaceContainerHigh, borderBottom: `1px solid ${p.outlineVariant}` }}>
              <Icon name="lock" size={14} color={p.onSurfaceVariant} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: p.onSurfaceVariant, ...ellipsis }}>{url}</span>
              <Icon name="refresh" size={14} color={p.onSurfaceVariant} />
            </div>
          )}
          <div style={{ flex: 1, minHeight: 0, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            {item.label.trim() && <span style={{ fontSize: 14, fontWeight: 700, color: p.onSurface, ...ellipsis }}>{item.label}</span>}
            <div style={{ height: 64, flex: "0 0 auto", borderRadius: scaleR(12), background: p.surfaceContainerHighest, display: "grid", placeItems: "center", color: p.outline }}>
              <Icon name="language" size={24} />
            </div>
            {["70%", "88%", "62%", "80%"].map((wd, i) => (
              <SkeletonLine key={i} w={wd} p={p} />
            ))}
          </div>
        </div>
      );
    }

    case "avatar": {
      /* a person: one circle with bold initials, or a group of overlapping circles the last of
         which counts whoever is left. A presence dot rides the first one's edge. */
      const d = item.size ?? 56;
      if (modeOf(item, "single") === "group") {
        const total = Math.min(5, Math.max(2, item.count ?? 3));
        const visible = Math.min(3, total);
        const overflow = total > visible ? total - visible + 1 : 0;
        const step = Math.round(d * 0.65);
        return (
          <div style={{ position: "relative", height: "100%", transform: "translateZ(0)" }}>
            {Array.from({ length: overflow ? visible : total }, (_, i) => {
              const last = i === (overflow ? visible : total) - 1;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: i * step,
                    top: 0,
                    width: d,
                    height: d,
                    borderRadius: d / 2,
                    background: last && overflow ? p.primary : p.secondaryContainer,
                    color: last && overflow ? p.onPrimary : p.onSecondaryContainer,
                    display: "grid",
                    placeItems: "center",
                    fontSize: Math.round(d * 0.3),
                    fontWeight: 700,
                    border: `2px solid ${p.surface}`,
                    boxSizing: "border-box",
                  }}
                >
                  {last && overflow ? `+${overflow}` : <Icon name="person" size={Math.round(d * 0.5)} />}
                </div>
              );
            })}
            {(item.showStatus ?? false) && (
              <span
                style={{
                  position: "absolute",
                  left: Math.max(6, d * 0.74),
                  top: Math.max(6, d * 0.74),
                  width: Math.max(10, d * 0.26),
                  height: Math.max(10, d * 0.26),
                  borderRadius: "50%",
                  background: "#1E9E52",
                  border: `2px solid ${p.surface}`,
                  boxSizing: "border-box",
                }}
              />
            )}
          </div>
        );
      }
      return (
        <div style={{ position: "relative", height: "100%", transform: "translateZ(0)" }}>
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: p.secondaryContainer, color: p.onSecondaryContainer, display: "grid", placeItems: "center", fontSize: Math.round(d * 0.34), fontWeight: 700, letterSpacing: 0.5 }}>
            {item.label.trim() || <Icon name="person" size={Math.round(d * 0.5)} />}
          </div>
          {(item.showStatus ?? false) && (
            <span style={{ position: "absolute", right: 0, bottom: 0, width: Math.max(10, d * 0.26), height: Math.max(10, d * 0.26), borderRadius: "50%", background: "#1E9E52", border: `2px solid ${p.surface}`, boxSizing: "border-box" }} />
          )}
        </div>
      );
    }

    case "divider":
      return (
        <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
          <div style={{ width: "100%", height: 1, background: p.outlineVariant }} />
        </div>
      );

    case "carousel":
      /* the same measure a scrolling tab row is drawn at: how far the row has been carried */
      return <CarouselBody item={item} p={p} scroll={tabScroll} />;
    case "datePicker":
      return <DatePickerBody item={item} p={p} />;
    case "timePicker":
      return <TimePickerBody item={item} p={p} />;

    case "navRail": {
      const tabs = item.tabs ?? [];
      const wide = isWideRail(item);
      const expanded = !!item.railExpanded;
      const rail = railMetrics(item);
      if (wide) return (
        <div style={{ position: "relative", height: "100%" }}>
          <div className="m3-rail-geometry" style={{ position: "absolute", left: rail.headerLeft, top: RAIL_TOP, width: 48, height: 48, display: "grid", placeItems: "center", color: p.onSurfaceVariant }}>
            <Icon name={expanded ? "menu_open" : "menu"} size={24} />
          </div>
          {tabs.map((tab, i) => {
            const on = i === Math.min(item.selected ?? 0, Math.max(0, tabs.length - 1));
            return <div key={i} className="m3-rail-geometry" style={{ position: "absolute", left: rail.inset, top: rail.top + i * (rail.itemHeight + rail.gap), width: rail.width - rail.inset * 2, height: rail.itemHeight }}>
              <div className="m3-rail-geometry" style={{ position: "absolute", left: expanded ? 0 : 8, top: 0, width: expanded ? rail.width - rail.inset * 2 : 56, height: expanded ? 56 : 32, borderRadius: expanded ? 28 : 16, background: on ? p.secondaryContainer : "transparent" }} />
              <div className="m3-rail-geometry" style={{ position: "absolute", left: 0, top: 0, width: 24, height: 24, transform: `translate(${expanded ? 16 : 24}px, ${expanded ? 16 : 4}px)`, color: on ? p.onSecondaryContainer : p.onSurfaceVariant }}>
                {tab.icon && <Icon name={tab.icon} size={24} fill={on} />}
              </div>
              {tab.label.trim() && <span className="m3-rail-geometry" style={{ position: "absolute", left: expanded ? 48 : 0, top: expanded ? 18 : 36, width: expanded ? rail.width - 88 : 72, textAlign: expanded ? "left" : "center", fontSize: expanded ? 14 : 12, lineHeight: "20px", fontWeight: on ? w(600, 700) : w(400, 500), color: on ? railSelectedLabelColor(p, expanded) : p.onSurfaceVariant, ...ellipsis }}>{tab.label}</span>}
            </div>;
          })}
        </div>
      );
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: RAIL_GAP,
            height: "100%",
            padding: `${RAIL_TOP}px 0`,
            boxSizing: "border-box",
            position: "relative",
          }}
        >
          {tabs.map((t, i) => {
            const on = i === Math.min(item.selected ?? 0, Math.max(0, tabs.length - 1));
            const withLabel = t.label.trim().length > 0;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  width: RAIL_W - 12,
                  height: RAIL_ITEM_H,
                  flex: "0 0 auto",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 32,
                    borderRadius: scaleR(16),
                    display: "grid",
                    placeItems: "center",
                    background: on ? p.secondaryContainer : "transparent",
                    color: on ? p.onSecondaryContainer : p.onSurfaceVariant,
                    transition: "background 160ms, color 160ms",
                  }}
                >
                  {t.icon && <Icon name={t.icon} size={22} fill={on} />}
                </div>
                {withLabel && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: on ? w(600, 700) : w(400, 500),
                      color: on ? p.onSurface : p.onSurfaceVariant,
                      maxWidth: "100%",
                      ...ellipsis,
                    }}
                  >
                    {t.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    case "bottomNav": {
      const tabs = item.tabs ?? [];
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            height: "100%",
            padding: `0 4px ${NAV_BAR_H}px`,
            boxSizing: "border-box",
            position: "relative",
          }}
        >
          {tabs.map((t, i) => {
            const on = i === Math.min(item.selected ?? 0, Math.max(0, tabs.length - 1));
            const withLabel = t.label.trim().length > 0;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 32,
                    borderRadius: scaleR(16),
                    display: "grid",
                    placeItems: "center",
                    background: on ? p.secondaryContainer : "transparent",
                    color: on ? p.onSecondaryContainer : p.onSurfaceVariant,
                    transition: "background 160ms, color 160ms",
                  }}
                >
                  {t.icon && <Icon name={t.icon} size={22} fill={on} />}
                </div>
                {withLabel && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: on ? w(600, 700) : w(400, 500),
                      color: on ? p.onSurface : p.onSurfaceVariant,
                      maxWidth: "100%",
                      ...ellipsis,
                    }}
                  >
                    {t.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    case "circularProgress":
      return (
        <CircularProgress
          size={item.size ?? 48}
          color={p.primary}
          trackColor={p.secondaryContainer}
          wavy={item.wavy}
          trackThickness={progressThickness(item)}
          value={item.value === undefined ? undefined : item.value / 100}
        />
      );

    case "linearProgress":
      return (
        <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
          <LinearProgress
            width={item.size ?? 320}
            color={p.primary}
            trackColor={p.secondaryContainer}
            wavy={item.wavy}
            trackThickness={progressThickness(item)}
            value={item.value === undefined ? undefined : item.value / 100}
          />
        </div>
      );

    case "fabMenu":
      return <FabMenuContent item={item} p={p} />;

    case "toolbar": {
      const tabs = item.tabs ?? [];
      const vibrant = item.variant === "filled";
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 8px", height: "100%", boxSizing: "border-box" }}>
          {tabs.map((tab, i) => (
            <span
              key={i}
              style={{
                width: 48,
                height: 48,
                borderRadius: scaleR(24),
                display: "grid",
                placeItems: "center",
                color: vibrant ? p.onPrimaryContainer : p.onSurfaceVariant,
                flex: "0 0 auto",
              }}
            >
              {tab.icon && <Icon name={tab.icon} size={24} />}
            </span>
          ))}
        </div>
      );
    }

    case "tabs": {
      const tabs = item.tabs ?? [];
      const scroll = isScrollableTabs(item);
      const offset = tabScroll ?? tabScrollOffset(item, sizeOf(item, {}).w);
      return (
        <div style={{ display: "flex", alignItems: "stretch", height: "100%", position: "relative", overflow: "hidden" }}>
          {tabs.map((tab, i) => {
            const on = i === Math.min(item.selected ?? 0, Math.max(0, tabs.length - 1));
            return (
              <div
                key={i}
                style={{
                  flex: scroll ? "none" : 1,
                  width: scroll ? SCROLL_TAB_W : undefined,
                  marginLeft: scroll && i === 0 ? -offset : undefined,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  position: "relative",
                  padding: "0 8px",
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: w(500, 700),
                    color: on ? p.primary : p.onSurfaceVariant,
                    padding: "0 4px 14px",
                    maxWidth: "100%",
                    ...ellipsis,
                  }}
                >
                  {tab.label}
                </span>
                {on && (
                  <span
                    style={{
                      position: "absolute",
                      left: "50%",
                      bottom: 0,
                      transform: "translateX(-50%)",
                      width: `calc(100% - 24px)`,
                      height: 3,
                      borderTopLeftRadius: 3,
                      borderTopRightRadius: 3,
                      background: p.primary,
                    }}
                  />
                )}
              </div>
            );
          })}
          <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1, background: p.outlineVariant }} />
        </div>
      );
    }

    case "loadingIndicator": {
      const s = item.size ?? 48;
      return (
        <LoadingIndicator
          size={s}
          color={item.contained ? p.onPrimaryContainer : p.primary}
          contained={item.contained}
          containerColor={p.primaryContainer}
        />
      );
    }
  }
  return null;
}

/** Box-model overrides from the inspector (margin, border widths, padding). */
export function boxModelStyle(item: Item, p: Palette): React.CSSProperties {
  const bm = item.boxModel;
  if (!bm) return {};
  const { margin: m, border: b, padding: pad } = bm;
  const style: React.CSSProperties = {};
  if (m) {
    if (m.top) style.marginTop = m.top;
    if (m.right) style.marginRight = m.right;
    if (m.bottom) style.marginBottom = m.bottom;
    if (m.left) style.marginLeft = m.left;
  }
  if (pad) {
    if (pad.top) style.paddingTop = pad.top;
    if (pad.right) style.paddingRight = pad.right;
    if (pad.bottom) style.paddingBottom = pad.bottom;
    if (pad.left) style.paddingLeft = pad.left;
  }
  if (b) {
    const bt = b.top || 0, br = b.right || 0, bb = b.bottom || 0, bl = b.left || 0;
    if (bt || br || bb || bl) {
      // Avoid mixing shorthand `border` (from boxStyle) with longhands.
      style.borderTopWidth = bt;
      style.borderRightWidth = br;
      style.borderBottomWidth = bb;
      style.borderLeftWidth = bl;
      style.borderTopStyle = "solid";
      style.borderRightStyle = "solid";
      style.borderBottomStyle = "solid";
      style.borderLeftStyle = "solid";
      style.borderTopColor = p.outline;
      style.borderRightColor = p.outline;
      style.borderBottomColor = p.outline;
      style.borderLeftColor = p.outline;
    }
  }
  return style;
}

/** The colour whatever is written on a part is drawn in, and so the colour a ripple over it
 *  takes: white over a filled button, the text's own colour over a pale surface. A split button
 *  paints no box of its own, so its two segments answer for it. */
export function contentColor(item: Item, p: Palette): string {
  const c = item.kind === "splitButton" ? variantStyle(item.variant, p).color : boxStyle(item, p).color;
  return typeof c === "string" ? c : p.onSurface;
}

/** how the part's box is painted: the panel paints its style cells with the same answer */
export function boxStyle(item: Item, p: Palette): React.CSSProperties {
  if (NO_BOX.includes(item.kind) || menuOpen(item)) return { background: "transparent", border: "none" };
  switch (item.kind) {
    case "box":
    case "bottomSheet": {
      const t = item.fill ?? "surfaceContainerLow";
      return { background: p[t], color: onToken(t, p), border: "none" };
    }
    case "button":
    case "iconButton":
    case "fab":
    case "extendedFab":
      return variantStyle(item.variant, p);
    case "chip":
      if (item.checked) return { background: p.secondaryContainer, color: p.onSecondaryContainer, border: "none" };
      return item.variant === "outlined"
        ? { background: "transparent", color: p.onSurfaceVariant, border: `1px solid ${p.outlineVariant}` }
        : { background: p.surfaceContainerLow, color: p.onSurfaceVariant, border: "none" };
    case "card":
      return { background: p[cardFillOf(item)], border: item.variant === "outlined" ? `1px solid ${p.outlineVariant}` : "none" };
    case "textField":
    case "select":
      return item.variant === "filled"
        ? { background: p.surfaceContainerHighest, border: "none", color: p.onSurface }
        : { background: p.surface, border: `1px solid ${p.outline}`, color: p.onSurface };
    case "topAppBar":
    case "bottomNav":
    case "navRail":
      return { background: p.surfaceContainer, border: "none", color: p.onSurface };
    case "toolbar":
      return item.variant === "filled"
        ? { background: p.primaryContainer, border: "none", color: p.onPrimaryContainer }
        : { background: p.surfaceContainer, border: "none", color: p.onSurfaceVariant };
    case "tabs":
      return { background: p.surface, border: "none", color: p.onSurface };
    case "searchBar":
      return item.variant === "outlined"
        ? { background: p.surface, border: `1px solid ${p.outline}`, color: p.onSurface }
        : { background: p.surfaceContainerHigh, border: "none", color: p.onSurface };
    case "dialog":
      return { background: p.surfaceContainerHigh, border: "none", color: p.onSurface };
    case "datePicker":
      /* typed in, a date is a field on the screen rather than a surface over it */
      return dateLayoutOf(item) === "input"
        ? { background: "transparent", border: "none", color: p.onSurface }
        : { background: p.surfaceContainerHigh, border: "none", color: p.onSurface };
    case "timePicker":
      return { background: p.surfaceContainerHigh, border: "none", color: p.onSurface };
    case "snackbar":
      return { background: p.inverseSurface, border: "none", color: p.inverseOnSurface };
    case "image":
    case "map":
      return { background: p.surfaceContainerHighest, border: "none" };
    case "youtube":
    case "video":
    case "lottie":
      return { background: p.surfaceContainerHigh, border: "none" };
    case "gridView":
    case "table":
    case "chart":
      return { background: p.surfaceContainerLow, border: "none" };
    case "qrCode":
    case "webView":
      return { background: p.surface, border: "none" };
    case "scrollView":
      return { background: p.surfaceContainerLow, border: `1px solid ${p.outlineVariant}` };
    case "collapsingTopBar":
      return { background: p.surface, border: "none" };
    case "audioPlayer":
      return { background: p.surfaceContainerHigh, border: "none" };
    case "camera":
      return { background: p.inverseSurface, border: "none", color: p.inverseOnSurface };
    case "listItem": {
      const t = item.fill ?? "surfaceContainerLow";
      return { background: p[t], border: "none", color: onToken(t, p) };
    }
    default:
      return { background: p.surfaceContainerHigh, border: "none", color: p.onSurface };
  }
}

function shadowOf(item: Item): string {
  if (NO_BOX.includes(item.kind) || menuOpen(item)) return "none";
  switch (item.kind) {
    case "navRail":
      return item.railModal && item.railExpanded ? "0 2px 6px rgba(0,0,0,0.16), 0 1px 2px rgba(0,0,0,0.10)" : "none";
    case "button":
    case "iconButton":
    case "extendedFab":
      return variantShadow(item.variant);
    case "fab":
      return "0 3px 8px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.12)";
    case "card":
      return item.variant === "elevated" ? "0 1px 3px rgba(0,0,0,0.20), 0 2px 6px rgba(0,0,0,0.10)" : "none";
    case "dialog":
      return "0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.10)";
    case "timePicker":
      return "0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.10)";
    case "datePicker":
      return dateLayoutOf(item) === "input" ? "none" : "0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.10)";
    case "snackbar":
      return "0 3px 8px rgba(0,0,0,0.18)";
    case "toolbar":
      return "0 2px 6px rgba(0,0,0,0.14), 0 1px 2px rgba(0,0,0,0.10)";
    default:
      return "none";
  }
}

export type { Radii };

/** Corner radii are driven continuously by the magnet; a stiff spring keeps them on the pointer. */
const RADIUS_TWEEN = { type: "spring" as const, stiffness: 900, damping: 48, mass: 0.4 };

export function M3Node({
  item,
  palette,
  radii,
  widths,
  pressed,
  dragging,
  selected,
  inRun = false,
  interactive = true,
  onPointerDown,
  tabScroll,
  instant,
  ripple,
  lit,
  easeWidth = false,
  preview,
  barCollapsed,
  onScroll,
}: {
  item: Item;
  palette: Palette;
  radii?: Radii;
  widths: Record<string, number>;
  pressed?: boolean;
  dragging?: boolean;
  selected?: boolean;
  /** the part sits in a connected run (non-free group, or a hidden run inside a free group) */
  inRun?: boolean;
  /** the width is being dragged on the canvas: it must follow the pointer with no easing */
  instant?: boolean;
  interactive?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  /** how far a scrollable tab row is scrolled in the preview; the canvas uses the resting position */
  tabScroll?: number;
  /** give a measured part an explicit width so the preview can ease to and from a fixed width */
  easeWidth?: boolean;
  /** a press lights the part up from inside, the way Android does. The preview lights its own
   *  parts through the hit areas it lays over them, so it leaves this off. */
  ripple?: boolean;
  /** a light the part is given rather than one it took itself: where the finger is on a part
   *  being carried across the canvas, and where it was on one that has just landed. It stays for
   *  as long as it is given, and goes out on its own once it is taken away. `at` is when the
   *  press began, so a light handed over mid-spread carries on rather than starting again. */
  lit?: { x: number; y: number; at?: number; grown?: boolean } | null;
  /** the tap-through preview: scroll views get native overflow and bars can follow their scroll */
  preview?: boolean;
  /** the scroll-driven folded state of a collapsing bar on this screen */
  barCollapsed?: boolean;
  /** the preview's scroll view reports how far it has been moved */
  onScroll?: (top: number) => void;
}) {
  const reducedMotion = useReducedMotion();
  const instantRail = reducedMotion && item.kind === "navRail" && isWideRail(item);
  const radiusTransition = instantRail ? { duration: 0 } : RADIUS_TWEEN;
  /* a menu on its way out is still drawn open, so the part is measured and boxed as it looks */
  const menu = useMenuPhase(item);
  const drawn = menu.drawn && !menuOpen(item) ? ({ ...item, [fabOpen]: true } as Item) : item;
  const r = radii ?? baseRadii(item);
  const size = sizeOf(drawn, widths);
  const measured = isMeasured(drawn);
  const clips = !NO_BOX.includes(item.kind) && !menuOpen(drawn) && item.kind !== "textField" && item.kind !== "select";
  /* only the button family lights up from inside; everything else is left as it was drawn */
  const lights = !!ripple && RIPPLE_KINDS.includes(item.kind);
  const ripples = useRipples(lights);
  /* the light a part carries in from wherever it was dropped belongs to the same family: a bar
   * landing on a screen simply arrives, it does not light up */
  const carried = RIPPLE_KINDS.includes(item.kind) ? lit : null;
  /* a given light belongs to the shape it was given inside: on a split button, the half the
   * finger is on */
  const litPart =
    carried && item.kind === "splitButton" ? (carried.x > size.w - splitMetrics(buttonHeightOf(item)).trailW ? SPLIT_MENU_SLOT : SPLIT_MAIN_SLOT) : null;
  /* how far the light had already spread where it came from: read once, when it arrives, so the
   * circle picks up where the other drawing left off and keeps going at the same pace. It is read
   * off the clock only when a new light arrives, never on a render that merely repeats. */
  const litSpread = useMemo(() => {
    if (!carried) return null;
    const gone = carried.grown ? RIPPLE_GROW : carried.at ? Math.max(0, (performance.now() - carried.at) / 1000) : 0;
    return { from: Math.min(1, gone / RIPPLE_GROW), dur: Math.max(0, RIPPLE_GROW - gone) };
  }, [carried]);
  const shown: Ripple[] = carried
    ? [
        ...ripples.list,
        {
          id: 0,
          part: litPart,
          x: carried.x,
          y: carried.y,
          d: rippleSize({ width: size.w, height: size.h }, carried.x, carried.y),
          from: litSpread?.from,
          dur: litSpread?.dur,
        },
      ]
    : ripples.list;

  return (
    <motion.div
      data-node={item.id}
      data-kind={item.kind}
      data-wide-rail={item.kind === "navRail" && isWideRail(item) ? "true" : undefined}
      onPointerDown={(e) => {
        ripples.add(e);
        onPointerDown?.(e);
      }}
      onPointerCancel={ripples.end}
      initial={false}
      animate={{
        borderTopLeftRadius: r.tl,
        borderBottomLeftRadius: r.bl,
        borderTopRightRadius: r.tr,
        borderBottomRightRadius: r.br,
        scale: pressed ? 0.97 : 1,
      }}
      transition={{
        borderTopLeftRadius: radiusTransition,
        borderBottomLeftRadius: radiusTransition,
        borderTopRightRadius: radiusTransition,
        borderBottomRightRadius: radiusTransition,
        scale: instantRail ? { duration: 0 } : { type: "spring", stiffness: 700, damping: 30, mass: 0.5 },
      }}
      style={(() => {
        const base = boxStyle(drawn, palette) as React.CSSProperties & { border?: string };
        const bm = boxModelStyle(drawn, palette);
        const hasBorderOverride =
          bm.borderTopWidth != null || bm.borderRightWidth != null || bm.borderBottomWidth != null || bm.borderLeftWidth != null;
        const mergedBase = hasBorderOverride && "border" in base ? (({ border: _border, ...rest }) => rest)(base) : base;
        return {
          ...mergedBase,
          ...bm,
          width: measured && !easeWidth ? undefined : size.w,
          height: size.h,
          display: measured ? "inline-flex" : "block",
          alignItems: "center",
          overflow: clips ? "hidden" : "visible",
          /* the selection ring sticks out 5px (3px offset + 2px ring); in a run the next
             sibling sits 3px away and would overpaint that edge — lift the selected part.
             Runs never overlap, so the lift only beats the sibling that hides the ring.
             Lone parts in free groups may overlap by design: keep their layer order. */
          position: selected && inRun ? "relative" : undefined,
          zIndex: selected && inRun ? 1 : undefined,
          cursor: !interactive ? "default" : dragging ? "grabbing" : "grab",
          userSelect: "none",
          /* preview parts own their gestures: inputs, players and scrollers need native touch */
          touchAction: preview ? undefined : "none",
          boxSizing: "border-box",
          boxShadow: shadowOf(drawn),
          outline: selected ? `2px solid ${palette.primary}` : "2px solid transparent",
          outlineOffset: 3,
          /* a part that changes size with its screen, or with the size the author picked,
             eases the way the screen does; a measured part has no width of its own to ease --
             a label-bearing FAB excepted, which the preview swaps for an icon-only standard FAB, so
             its width has to travel there and back */
          transition:
            instant || menu.snap
              ? "outline-color 120ms"
              : `outline-color 120ms, height ${SETTLE_MS}ms cubic-bezier(0.2, 0, 0, 1)${measured && !easeWidth ? "" : `, width ${SETTLE_MS}ms cubic-bezier(0.2, 0, 0, 1)`}`,
          flex: "0 0 auto",
        };
      })()}
    >
      <RippleCtx.Provider value={{ list: shown, color: contentColor(drawn, palette) }}>
        <Body item={drawn} p={palette} tabScroll={tabScroll} menuShown={menu.open} preview={preview} barCollapsed={barCollapsed} onScroll={onScroll} />
        {/* a part drawn as one shape is lit through its own box; one made of several -- a split
            button -- carries the light inside each of them instead */}
        {(lights || !!carried) && item.kind !== "splitButton" && <RippleShape part={null} />}
      </RippleCtx.Provider>
    </motion.div>
  );
}

/** Plain (non-animated) rendering of a part; used where frames must be deterministic. */
export function M3Static({
  item,
  palette,
  radii,
  style,
}: {
  item: Item;
  palette: Palette;
  radii?: Radii;
  style?: React.CSSProperties;
}) {
  const r = radii ?? baseRadii(item);
  const size = sizeOf(item, {});
  const measured = isMeasured(item);
  const clips = !NO_BOX.includes(item.kind) && !menuOpen(item) && item.kind !== "textField" && item.kind !== "select";
  return (
    <div
      style={(() => {
        const base = boxStyle(item, palette) as React.CSSProperties & { border?: string };
        const bm = boxModelStyle(item, palette);
        const hasBorderOverride =
          bm.borderTopWidth != null || bm.borderRightWidth != null || bm.borderBottomWidth != null || bm.borderLeftWidth != null;
        const mergedBase = hasBorderOverride && "border" in base ? (({ border: _border, ...rest }) => rest)(base) : base;
        return {
          ...mergedBase,
          ...bm,
          width: measured ? undefined : size.w,
          height: size.h,
          display: measured ? "inline-flex" : "block",
          alignItems: "center",
          overflow: clips ? "hidden" : "visible",
          boxSizing: "border-box",
          boxShadow: shadowOf(item),
          borderTopLeftRadius: r.tl,
          borderTopRightRadius: r.tr,
          borderBottomLeftRadius: r.bl,
          borderBottomRightRadius: r.br,
          flex: "0 0 auto",
          ...style,
        };
      })()}
    >
      <Body item={item} p={palette} />
    </div>
  );
}
