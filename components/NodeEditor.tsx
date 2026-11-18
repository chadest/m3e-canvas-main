"use client";

/* App & UI Event Logic editor. The canvas is still the visual graph people know — dot grid,
 * pan/zoom, draggable cards and Bézier wires — but the nodes now describe reactive app events,
 * state variables and UI actions. The graph lives on the Doc, so it survives save and preview. */

import React, { useMemo, useRef, useState } from "react";
import { Frame, PALETTES, Palette } from "@/lib/tokens";
import { t, useLang } from "@/lib/i18n";
import {
  EVENT_TYPES,
  LOGIC_VERSION,
  LogicConnection,
  LogicGraph,
  LogicNode,
  LogicNodeType,
  LogicPort,
  PORTS,
  StateVarType,
  TRIGGER_TYPES,
  exportLogicCode,
  makeLogicNode,
  makeVariable,
  migrateLogicGraph,
} from "@/lib/logicEngine";
import { Icon } from "./M3Node";
import { CanvasBottomToolbar } from "./code/CanvasBottomToolbar";

type Props = {
  logic: LogicGraph;
  onChange: (graph: LogicGraph) => void;
  p: Palette;
  widgets: { id: string; label: string; kind: string }[];
  frames: Frame[];
};

type LinkDraft = { from: string; fromPort: string; x: number; y: number };
type DragDraft = { id: string; startX: number; startY: number; nodeX: number; nodeY: number };

const NODE_W = 204;
const PORT_TOP = 58;
const PORT_STEP = 26;
const portY = (index: number) => PORT_TOP + index * PORT_STEP;

const NODE_ICON: Record<LogicNodeType, string> = {
  onTap: "touch_app",
  onScreenLoad: "rocket_launch",
  onValueChange: "tune",
  onMediaComplete: "movie",
  ifCondition: "alt_route",
  setVariable: "data_object",
  delay: "schedule",
  navigate: "navigation",
  showFeedback: "feedback",
  controlMedia: "play_arrow",
  mutateWidget: "visibility",
};

const GROUPS: { key: string; title: string; types: LogicNodeType[] }[] = [
  { key: "trigger", title: "logicTriggers", types: TRIGGER_TYPES },
  { key: "flow", title: "logicFlow", types: ["ifCondition", "setVariable", "delay"] },
  { key: "action", title: "logicActions", types: ["navigate", "showFeedback", "controlMedia", "mutateWidget"] },
];

const LABEL: Record<string, string> = {
  onTap: "logicOnTap", onScreenLoad: "logicOnScreenLoad", onValueChange: "logicOnValueChange", onMediaComplete: "logicOnMediaComplete",
  ifCondition: "logicIfCondition", setVariable: "logicSetVariable", delay: "logicDelay", navigate: "logicNavigate",
  showFeedback: "logicShowFeedback", controlMedia: "logicControlMedia", mutateWidget: "logicMutateWidget",
  next: "logicNext", event: "logicEvent", value: "logicValue", true: "logicTrue", false: "logicFalse",
  Changed: "logicChanged", Opened: "logicOpened", Ended: "logicEnded", Tap: "logicTap",
};

const tr = (key: string, lang: Parameters<typeof t>[1]) => t(key as Parameters<typeof t>[0], lang);

const input = (style: React.CSSProperties = {}): React.CSSProperties => ({
  height: 30,
  borderRadius: 8,
  border: "1px solid rgba(128,128,128,0.35)",
  background: "rgba(127,127,127,0.08)",
  color: "inherit",
  padding: "0 8px",
  fontSize: 11,
  outline: "none",
  ...style,
});

export const NodeEditor: React.FC<Props> = ({ logic, onChange, p, widgets, frames }) => {
  const lang = useLang();
  /* a tool panel can outlive a palette change; fall back to the default scheme rather than crash */
  const pal: Palette = p && (p as Palette).surface ? p : PALETTES[0];
  const graph = useMemo(() => migrateLogicGraph(logic), [logic]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedWire, setSelectedWire] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(0.9);
  const [link, setLink] = useState<LinkDraft | null>(null);
  const drag = useRef<DragDraft | null>(null);
  const panning = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [toolMode, setToolMode] = useState<"select" | "pan" | "quick_erase">("select");
  const [framework, setFramework] = useState<"react" | "compose" | "flutter">("react");
  const [varName, setVarName] = useState("");
  const [varType, setVarType] = useState<StateVarType>("boolean");
  const code = useMemo(() => exportLogicCode(graph, framework), [graph, framework]);

  const commit = (next: LogicGraph) => onChange({ ...next, version: LOGIC_VERSION });
  const updateNode = (id: string, patch: Partial<LogicNode>) => commit({ ...graph, nodes: graph.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) });
  const setField = (id: string, key: string, value: string | number | boolean) => {
    const node = graph.nodes.find((n) => n.id === id);
    if (node) updateNode(id, { state: { ...node.state, [key]: value } });
  };

  const toWorld = (clientX: number, clientY: number, element: HTMLElement) => {
    const r = element.getBoundingClientRect();
    return { x: (clientX - r.left - pan.x) / zoom, y: (clientY - r.top - pan.y) / zoom };
  };

  const addNode = (type: LogicNodeType) => {
    const node = makeLogicNode(type, Math.round((-pan.x / zoom) + 60), Math.round((-pan.y / zoom) + 60));
    commit({ ...graph, nodes: [...graph.nodes, node] });
    setSelectedNode(node.id);
    setSelectedWire(null);
  };

  const addVariable = () => {
    if (!varName.trim()) return;
    commit({ ...graph, variables: [...graph.variables, makeVariable(varName.trim(), varType)] });
    setVarName("");
  };

  const removeSelected = () => {
    if (selectedNode) {
      commit({
        ...graph,
        nodes: graph.nodes.filter((n) => n.id !== selectedNode),
        connections: graph.connections.filter((c) => c.from !== selectedNode && c.to !== selectedNode),
      });
      setSelectedNode(null);
    } else if (selectedWire) {
      commit({ ...graph, connections: graph.connections.filter((c) => c.id !== selectedWire) });
      setSelectedWire(null);
    }
  };

  const portDot = (node: LogicNode, port: LogicPort, side: "in" | "out", index: number) => {
    const x = side === "in" ? node.x : node.x + NODE_W;
    const y = node.y + portY(index);
    const on = side === "out" && link?.from === node.id && link.fromPort === port.id;
    return (
      <div key={`${side}-${port.id}`} style={{ position: "absolute", left: x - 6, top: y - 6, width: 12, height: 12, borderRadius: 6, background: port.kind === "event" ? pal.primary : port.kind === "boolean" ? pal.tertiaryContainer : pal.secondaryContainer, border: `2px solid ${pal.surface}`, boxShadow: on ? `0 0 0 3px ${pal.primaryContainer}` : "none", cursor: side === "out" ? "crosshair" : "pointer" }}
        title={tr(LABEL[port.label] ?? "logicValue", lang)}
        onPointerDown={(e) => {
          if (side !== "out") return;
          e.stopPropagation();
          setLink({ from: node.id, fromPort: port.id, x, y });
        }}
        onPointerUp={(e) => {
          if (side !== "in" || !link) return;
          e.stopPropagation();
          const wire: LogicConnection = { id: `wire-${Date.now()}`, from: link.from, fromPort: link.fromPort, to: node.id, toPort: port.id };
          commit({ ...graph, connections: [...graph.connections.filter((c) => !(c.to === node.id && c.toPort === port.id)), wire] });
          setLink(null);
        }}
      />
    );
  };

  const wirePath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const d = Math.abs(to.x - from.x) * 0.5 + 36;
    return `M ${from.x} ${from.y} C ${from.x + d} ${from.y}, ${to.x - d} ${to.y}, ${to.x} ${to.y}`;
  };

  const panel: React.CSSProperties = {
    background: pal.surfaceContainerLow,
    borderRight: `1px solid ${pal.outlineVariant}`,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };
  const sectionTitle: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: pal.onSurfaceVariant, letterSpacing: 0.6, padding: "10px 12px 4px" };

  const field = (node: LogicNode, key: string, value: string | number | boolean) => {
    const options: Record<string, string[]> = {
      op: ["==", "!=", ">", "<", "contains", "isEmpty"],
      action: key === "action" && node.type === "setVariable" ? ["set", "toggle", "increment", "decrement"] : ["show", "hide", "enable", "disable", "toggleChecked", "setText"],
      command: ["play", "pause", "toggle", "restart"],
      transition: ["slide", "fade", "modal"],
      kind: ["snackbar", "dialog"],
      variableId: graph.variables.map((v) => v.id),
      widgetId: ["", ...widgets.map((w) => w.id)],
      target: ["", "back", ...frames.map((f) => f.id)],
    };
    const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
    if (options[key])
      return (
        <label key={key} style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: pal.onSurfaceVariant }}>
          {label}
          <select value={String(value)} onChange={(e) => setField(node.id, key, e.target.value)} style={input()}>
            {options[key].map((o) => <option key={o} value={o}>{o || "—"}</option>)}
          </select>
        </label>
      );
    if (typeof value === "number")
      return (
        <label key={key} style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: pal.onSurfaceVariant }}>
          {label}
          <input type="number" value={value} onChange={(e) => setField(node.id, key, Number(e.target.value))} style={input()} />
        </label>
      );
    return (
      <label key={key} style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: pal.onSurfaceVariant }}>
        {label}
        <input value={String(value)} onChange={(e) => setField(node.id, key, e.target.value)} style={input()} />
      </label>
    );
  };

  return (
    <div style={{ display: "flex", width: "100%", height: "100%", background: pal.surface, color: pal.onSurface }}>
      {/* palette */}
      <aside style={{ ...panel, width: 196, flex: "0 0 auto" }}>
        <div style={sectionTitle}>{t("logicEditor", lang)}</div>
        {GROUPS.map((group) => (
          <div key={group.key}>
            <div style={sectionTitle}>{tr(group.title, lang)}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, padding: "0 8px" }}>
              {group.types.map((type) => (
                <button key={type} onClick={() => addNode(type)} className="m3-press" style={{ display: "flex", alignItems: "center", gap: 8, height: 34, padding: "0 10px", borderRadius: 17, border: `1px solid ${pal.outlineVariant}`, background: pal.surface, color: pal.onSurface, fontSize: 11, cursor: "pointer", textAlign: "left" }}>
                  <Icon name={NODE_ICON[type]} size={17} color={pal.primary} />
                  {tr(LABEL[type], lang)}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div style={sectionTitle}>{t("logicVariables", lang)}</div>
        <div style={{ display: "flex", gap: 4, padding: "0 8px" }}>
          <input value={varName} onChange={(e) => setVarName(e.target.value)} placeholder="isLoggedIn" style={input({ flex: 1, minWidth: 0 })} />
          <select value={varType} onChange={(e) => setVarType(e.target.value as StateVarType)} style={input({ width: 74 })}>
            <option value="boolean">bool</option>
            <option value="number">num</option>
            <option value="string">text</option>
          </select>
          <button onClick={addVariable} className="m3-press" title={t("logicAddVariable", lang)} style={{ width: 30, border: "none", borderRadius: 8, background: pal.primaryContainer, color: pal.onPrimaryContainer, cursor: "pointer" }}>+</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "8px" }}>
          {graph.variables.map((v) => (
            <div key={v.id} style={{ fontSize: 11, color: pal.onSurfaceVariant, display: "flex", justifyContent: "space-between" }}>
              <span>{v.name}</span>
              <span style={{ opacity: 0.6 }}>{v.type}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* graph canvas */}
      <main
        style={{ flex: 1, minWidth: 0, position: "relative", overflow: "hidden", cursor: panning.current ? "grabbing" : "grab", backgroundImage: `radial-gradient(${pal.outlineVariant} 1px, transparent 1px)`, backgroundSize: `${24 * zoom}px ${24 * zoom}px`, backgroundPosition: `${pan.x}px ${pan.y}px` }}
        onPointerDown={(e) => {
          if (toolMode !== "pan" && ((e.target as HTMLElement).closest(".logic-node") || (e.target as HTMLElement).closest(".logic-wire"))) return;
          panning.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
          setSelectedNode(null);
          setSelectedWire(null);
        }}
        onPointerMove={(e) => {
          if (drag.current) {
            const node = graph.nodes.find((n) => n.id === drag.current!.id);
            if (node) updateNode(node.id, { x: Math.round(drag.current.nodeX + (e.clientX - drag.current.startX) / zoom), y: Math.round(drag.current.nodeY + (e.clientY - drag.current.startY) / zoom) });
            return;
          }
          if (panning.current) setPan({ x: panning.current.px + e.clientX - panning.current.x, y: panning.current.py + e.clientY - panning.current.y });
          if (link) {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setLink({ ...link, x: (e.clientX - r.left - pan.x) / zoom, y: (e.clientY - r.top - pan.y) / zoom });
          }
        }}
        onPointerUp={() => { drag.current = null; panning.current = null; setLink(null); }}
        onWheel={(e) => setZoom((z) => Math.min(2, Math.max(0.35, z + (e.deltaY < 0 ? 0.08 : -0.08))))}
      >
        <div style={{ position: "absolute", inset: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
          <svg width={4000} height={4000} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
            {graph.connections.map((wire) => {
              const from = graph.nodes.find((n) => n.id === wire.from);
              const to = graph.nodes.find((n) => n.id === wire.to);
              if (!from || !to) return null;
              const fi = PORTS[from.type].outputs.findIndex((o) => o.id === wire.fromPort);
              const ti = PORTS[to.type].inputs.findIndex((i) => i.id === wire.toPort);
              const a = { x: from.x + NODE_W, y: from.y + portY(Math.max(0, fi)) };
              const b = { x: to.x, y: to.y + portY(Math.max(0, ti)) };
              const d = wirePath(a, b);
              const on = selectedWire === wire.id;
              return (
                <g key={wire.id} className="logic-wire" style={{ pointerEvents: "stroke" }} onClick={() => { setSelectedWire(wire.id); setSelectedNode(null); }}>
                  <path d={d} fill="none" stroke="transparent" strokeWidth={16} />
                  <path d={d} fill="none" stroke={on ? pal.error : pal.primary} strokeWidth={on ? 4 : 2.5} strokeLinecap="round" />
                </g>
              );
            })}
            {link && (() => {
              const from = graph.nodes.find((n) => n.id === link.from);
              if (!from) return null;
              const index = PORTS[from.type].outputs.findIndex((o) => o.id === link.fromPort);
              return <path d={wirePath({ x: from.x + NODE_W, y: from.y + portY(Math.max(0, index)) }, { x: link.x, y: link.y })} fill="none" stroke={pal.primary} strokeWidth={2} strokeDasharray="6 4" />;
            })()}
          </svg>

          {graph.nodes.map((node) => {
            const def = PORTS[node.type];
            const selected = selectedNode === node.id;
            return (
              <div key={node.id} className="logic-node" style={{ position: "absolute", left: node.x, top: node.y, width: NODE_W, borderRadius: 16, border: `1px solid ${selected ? pal.primary : pal.outlineVariant}`, background: pal.surfaceContainer, color: pal.onSurface, boxShadow: selected ? `0 4px 16px ${pal.primaryContainer}` : "0 2px 8px rgba(0,0,0,0.12)", overflow: "visible" }}
                onPointerDown={(e) => {
                  if (toolMode === "pan") return;
                  e.stopPropagation();
                  if (toolMode === "quick_erase") {
                    commit({ ...graph, nodes: graph.nodes.filter((n) => n.id !== node.id), connections: graph.connections.filter((c) => c.from !== node.id && c.to !== node.id) });
                    return;
                  }
                  setSelectedNode(node.id); setSelectedWire(null);
                  drag.current = { id: node.id, startX: e.clientX, startY: e.clientY, nodeX: node.x, nodeY: node.y };
                }}
              >
                <div style={{ height: 34, display: "flex", alignItems: "center", gap: 6, padding: "0 10px", borderRadius: "15px 15px 0 0", background: pal.secondaryContainer, color: pal.onSecondaryContainer, fontSize: 11, fontWeight: 700, cursor: "move" }}>
                  <Icon name={NODE_ICON[node.type]} size={16} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tr(LABEL[node.type], lang)}</span>
                  {selected && <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); removeSelected(); }} title={t("logicDelete", lang)} style={{ border: "none", background: "transparent", color: "inherit", cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="close" size={14} /></button>}
                </div>
                <div style={{ height: 18, padding: "4px 10px", fontSize: 9, color: pal.onSurfaceVariant, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {Object.entries(node.state).slice(0, 2).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
                </div>
                <div style={{ height: 6 }} />
                {def.inputs.map((port, i) => <React.Fragment key={`in-${port.id}`}>{portDot(node, port, "in", i)}<span style={{ position: "absolute", left: node.x + 12, top: node.y + portY(i) - 7, fontSize: 9, color: pal.onSurfaceVariant, pointerEvents: "none" }}>{tr(LABEL[port.label] ?? "logicValue", lang)}</span></React.Fragment>)}
                {def.outputs.map((port, i) => <React.Fragment key={`out-${port.id}`}>{portDot(node, port, "out", i)}<span style={{ position: "absolute", left: node.x + NODE_W - 40, top: node.y + portY(i) - 7, fontSize: 9, color: pal.onSurfaceVariant, pointerEvents: "none" }}>{tr(LABEL[port.label] ?? "logicNext", lang)}</span></React.Fragment>)}
              </div>
            );
          })}
        </div>
        <CanvasBottomToolbar
          onZoomIn={() => setZoom((z) => Math.min(2, z + 0.1))}
          onZoomOut={() => setZoom((z) => Math.max(0.35, z - 0.1))}
          onZoomToFit={() => { setZoom(0.9); setPan({ x: 40, y: 40 }); }}
          toolMode={toolMode}
          setToolMode={setToolMode}
          hasSelection={!!selectedNode || !!selectedWire}
          onDelete={removeSelected}
        />
        {graph.nodes.length === 0 && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none", color: pal.onSurfaceVariant, fontSize: 13 }}>
            {t("logicEmpty", lang)}
          </div>
        )}
      </main>

      {/* inspector + export */}
      <aside style={{ ...panel, width: 232, flex: "0 0 auto", borderRight: "none", borderLeft: `1px solid ${pal.outlineVariant}` }}>
        <div style={sectionTitle}>{t("logicNode", lang)}</div>
        <div className="no-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
          {selectedNode ? (() => {
            const node = graph.nodes.find((n) => n.id === selectedNode)!;
            return <>{Object.entries(node.state).map(([key, value]) => field(node, key, value))}</>;
          })() : <span style={{ fontSize: 11, color: pal.onSurfaceVariant }}>{t("logicSelectNode", lang)}</span>}
          <button onClick={removeSelected} disabled={!selectedNode && !selectedWire} className="m3-press" style={{ height: 34, borderRadius: 17, border: `1px solid ${pal.outlineVariant}`, background: "transparent", color: pal.error, fontSize: 11, cursor: "pointer", opacity: selectedNode || selectedWire ? 1 : 0.4 }}>{t("logicDelete", lang)}</button>
          <button onClick={() => { commit(migrateLogicGraph({})); setSelectedNode(null); }} className="m3-press" style={{ height: 34, borderRadius: 17, border: `1px solid ${pal.outlineVariant}`, background: "transparent", color: pal.onSurfaceVariant, fontSize: 11, cursor: "pointer" }}>{t("logicClear", lang)}</button>
        </div>
        <div style={{ borderTop: `1px solid ${pal.outlineVariant}` }}>
          <button onClick={() => setShowCode(!showCode)} style={{ width: "100%", height: 36, border: "none", background: "transparent", color: pal.primary, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{showCode ? t("logicHideCode", lang) : t("logicExport", lang)}</button>
          {showCode && (
            <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {(["react", "compose", "flutter"] as const).map((f) => (
                  <button key={f} onClick={() => setFramework(f)} style={{ flex: 1, height: 26, borderRadius: 13, border: "none", background: framework === f ? pal.secondaryContainer : "transparent", color: framework === f ? pal.onSecondaryContainer : pal.onSurfaceVariant, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{f}</button>
                ))}
              </div>
              <textarea readOnly value={code} style={{ width: "100%", height: 150, borderRadius: 10, border: `1px solid ${pal.outlineVariant}`, background: pal.surface, color: pal.onSurface, padding: 8, fontFamily: "monospace", fontSize: 9, resize: "none" }} />
              <button onClick={() => void navigator.clipboard?.writeText(code)} style={{ height: 30, borderRadius: 15, border: "none", background: pal.primaryContainer, color: pal.onPrimaryContainer, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{t("logicCopy", lang)}</button>
              <button onClick={() => {
                const a = document.createElement("a");
                const blob = new Blob([code], { type: "text/plain" });
                a.href = URL.createObjectURL(blob);
                a.download = `app-logic.${framework === "react" ? "jsx" : framework === "flutter" ? "dart" : "kt"}`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 0);
              }} style={{ height: 30, borderRadius: 15, border: `1px solid ${pal.outlineVariant}`, background: "transparent", color: pal.onSurface, fontSize: 10, cursor: "pointer" }}>{t("logicDownload", lang)}</button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
