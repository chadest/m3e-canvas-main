/* App & UI Event Logic — a small, framework-agnostic event graph attached to a design.
 * The editor draws it with Bézier wires; Preview runs it against the live widgets. Nothing here
 * knows about hardware pins, setup()/loop() or C++: a graph is events, state and UI actions. */

export type StateVarType = "boolean" | "number" | "string";
export type StateValue = string | number | boolean;

export type StateVariable = {
  id: string;
  name: string;
  type: StateVarType;
  initialValue: StateValue;
};

export type LogicNodeType =
  | "onTap"
  | "onScreenLoad"
  | "onValueChange"
  | "onMediaComplete"
  | "ifCondition"
  | "setVariable"
  | "delay"
  | "navigate"
  | "showFeedback"
  | "controlMedia"
  | "mutateWidget";

export type PortKind = "event" | "boolean" | "value";
export type LogicPort = { id: string; label: string; kind: PortKind };
export type LogicNode = { id: string; type: LogicNodeType; x: number; y: number; state: Record<string, StateValue> };
export type LogicConnection = { id: string; from: string; fromPort: string; to: string; toPort: string };
export type LogicGraph = { version: 1; variables: StateVariable[]; nodes: LogicNode[]; connections: LogicConnection[] };

export const LOGIC_VERSION = 1;

const uid = () => Math.random().toString(36).slice(2, 10);

/** the ports each node shows on the canvas; "event" ports carry control, others carry data */
export const PORTS: Record<LogicNodeType, { inputs: LogicPort[]; outputs: LogicPort[] }> = {
  onTap: { inputs: [], outputs: [{ id: "next", label: "Tap", kind: "event" }] },
  onScreenLoad: { inputs: [], outputs: [{ id: "next", label: "Opened", kind: "event" }] },
  onValueChange: {
    inputs: [],
    outputs: [
      { id: "next", label: "Changed", kind: "event" },
      { id: "value", label: "Value", kind: "value" },
    ],
  },
  onMediaComplete: { inputs: [], outputs: [{ id: "next", label: "Ended", kind: "event" }] },
  ifCondition: {
    inputs: [
      { id: "event", label: "In", kind: "event" },
      { id: "value", label: "Value", kind: "value" },
    ],
    outputs: [
      { id: "true", label: "True", kind: "event" },
      { id: "false", label: "False", kind: "event" },
    ],
  },
  setVariable: {
    inputs: [{ id: "event", label: "In", kind: "event" }],
    outputs: [{ id: "next", label: "Next", kind: "event" }],
  },
  delay: {
    inputs: [{ id: "event", label: "In", kind: "event" }],
    outputs: [{ id: "next", label: "Next", kind: "event" }],
  },
  navigate: {
    inputs: [{ id: "event", label: "In", kind: "event" }],
    outputs: [{ id: "next", label: "Next", kind: "event" }],
  },
  showFeedback: {
    inputs: [{ id: "event", label: "In", kind: "event" }],
    outputs: [{ id: "next", label: "Next", kind: "event" }],
  },
  controlMedia: {
    inputs: [{ id: "event", label: "In", kind: "event" }],
    outputs: [{ id: "next", label: "Next", kind: "event" }],
  },
  mutateWidget: {
    inputs: [{ id: "event", label: "In", kind: "event" }],
    outputs: [{ id: "next", label: "Next", kind: "event" }],
  },
};

export const TRIGGER_TYPES: LogicNodeType[] = ["onTap", "onScreenLoad", "onValueChange", "onMediaComplete"];
export const EVENT_TYPES: LogicNodeType[] = [...TRIGGER_TYPES, "ifCondition", "setVariable", "delay", "navigate", "showFeedback", "controlMedia", "mutateWidget"];

const DEFAULTS: Record<LogicNodeType, Record<string, StateValue>> = {
  onTap: { widgetId: "" },
  onScreenLoad: { frameId: "" },
  onValueChange: { widgetId: "" },
  onMediaComplete: { widgetId: "" },
  ifCondition: { variableId: "", op: "==", compare: "" },
  setVariable: { variableId: "", action: "set", value: "" },
  delay: { durationMs: 300 },
  navigate: { target: "", transition: "fade" },
  showFeedback: { message: "", kind: "snackbar", target: "" },
  controlMedia: { widgetId: "", command: "toggle" },
  mutateWidget: { widgetId: "", action: "show" },
};

export const makeLogicGraph = (): LogicGraph => ({ version: LOGIC_VERSION, variables: [], nodes: [], connections: [] });

export function makeLogicNode(type: LogicNodeType, x: number, y: number, state?: Record<string, StateValue>): LogicNode {
  return { id: uid(), type, x, y, state: { ...DEFAULTS[type], ...state } };
}

export function makeVariable(name: string, type: StateVarType = "boolean"): StateVariable {
  const initialValue: StateValue = type === "boolean" ? false : type === "number" ? 0 : "";
  return { id: uid(), name, type, initialValue };
}

/* ---------- validation & legacy migration ---------- */

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isNodeType = (v: unknown): v is LogicNodeType => EVENT_TYPES.includes(v as LogicNodeType);
const isValue = (v: unknown): v is StateValue => typeof v === "string" || typeof v === "number" || typeof v === "boolean";

const LEGACY_NODES: Record<string, LogicNodeType> = {
  variable_access: "setVariable",
  comparator: "ifCondition",
  display_monitor: "showFeedback",
};

/** Accepts a current graph, a legacy Arduino-era `{nodes, connections}` payload, or junk.
 *  Unknown legacy node types are dropped; their wires go with them, so old projects never crash. */
export function migrateLogicGraph(raw: unknown): LogicGraph {
  if (!isRecord(raw) || !Array.isArray(raw.nodes) || !Array.isArray(raw.connections)) return makeLogicGraph();
  const variables: StateVariable[] = Array.isArray(raw.variables)
    ? (raw.variables as unknown[]).filter(isRecord).filter((v) => typeof v.name === "string" && (v.type === "boolean" || v.type === "number" || v.type === "string")).map((v) => ({
        id: typeof v.id === "string" ? v.id : uid(),
        name: String(v.name),
        type: v.type as StateVarType,
        initialValue: isValue(v.initialValue) ? v.initialValue : v.type === "number" ? 0 : v.type === "boolean" ? false : "",
      }))
    : [];
  const remap = new Map<string, string>();
  const nodes: LogicNode[] = [];
  (raw.nodes as unknown[]).filter(isRecord).forEach((node, i) => {
    const legacyType = typeof node.type === "string" ? node.type : "";
    const type = isNodeType(node.type) ? node.type : LEGACY_NODES[legacyType];
    if (!type) return;
    const id = typeof node.id === "string" ? node.id : `node-${i}`;
    remap.set(id, id);
    const state = isRecord(node.state) ? node.state : {};
    const clean: Record<string, StateValue> = { ...DEFAULTS[type] };
    Object.keys(clean).forEach((key) => {
      if (isValue(state[key])) clean[key] = state[key] as StateValue;
    });
    if (type === "setVariable" && typeof state.varName === "string") clean.variableId = state.varName;
    nodes.push({ id, type, x: Number.isFinite(node.x) ? Number(node.x) : i * 220, y: Number.isFinite(node.y) ? Number(node.y) : 80, state: clean });
  });
  const connections: LogicConnection[] = (raw.connections as unknown[]).filter(isRecord).filter((c) => {
    const from = remap.has(String(c.from ?? c.fromNodeId));
    const to = remap.has(String(c.to ?? c.toNodeId));
    return from && to;
  }).map((c) => ({
    id: typeof c.id === "string" ? c.id : uid(),
    from: String(c.from ?? c.fromNodeId),
    fromPort: typeof c.fromPort === "string" ? c.fromPort : "next",
    to: String(c.to ?? c.toNodeId),
    toPort: typeof c.toPort === "string" ? c.toPort : "event",
  }));
  return { version: LOGIC_VERSION, variables, nodes, connections };
}

export const graphBytes = (graph: LogicGraph) => JSON.stringify(graph).length;

/* ---------- live runtime ---------- */

export type LogicEventType = "tap" | "screenLoad" | "valueChange" | "mediaComplete";
export type LogicEvent = { type: LogicEventType; widgetId?: string; frameId?: string; value?: StateValue };

export type LogicContext = {
  variables: Record<string, StateValue>;
  setVariable: (id: string, value: StateValue) => void;
  navigate: (target: string, transition: string) => void;
  snackbar: (message: string) => void;
  dialog: (message: string) => void;
  controlMedia: (widgetId: string, command: string) => void;
  mutateWidget: (widgetId: string, action: string, value?: StateValue) => void;
  wait?: (ms: number) => Promise<void>;
};

export type LogicStep = { nodeId: string; type: LogicNodeType; detail: string };

const variableName = (graph: LogicGraph, id: string) => graph.variables.find((v) => v.id === id)?.name ?? id;
const coerce = (value: StateValue | undefined, type: StateVarType): StateValue => {
  if (type === "boolean") return typeof value === "boolean" ? value : String(value) === "true";
  if (type === "number") return typeof value === "number" ? value : Number(value) || 0;
  return value === undefined ? "" : String(value);
};

function compare(left: StateValue, op: string, right: StateValue): boolean {
  const a = String(left);
  const b = String(right);
  switch (op) {
    case "!=": return a !== b;
    case ">": return Number(a) > Number(b);
    case "<": return Number(a) < Number(b);
    case "contains": return a.includes(b);
    case "isEmpty": return a.trim().length === 0;
    default: return a === b;
  }
}

const TRIGGER_EVENT: Record<string, LogicEventType> = {
  onTap: "tap", onScreenLoad: "screenLoad", onValueChange: "valueChange", onMediaComplete: "mediaComplete",
};

/** Walks every wire reachable from the triggers that match the event. Returns the steps taken,
 *  which the Preview debugger pill shows. The runtime never mutates the graph itself. */
export async function executeLogicGraph(graph: LogicGraph, event: LogicEvent, ctx: LogicContext): Promise<LogicStep[]> {
  const steps: LogicStep[] = [];
  const starts = graph.nodes.filter((node) => {
    const wanted = TRIGGER_EVENT[node.type];
    if (wanted !== event.type) return false;
    const target = String(node.state.widgetId ?? node.state.frameId ?? "");
    return !target || target === event.widgetId || target === event.frameId;
  });
  const visited = new Set<string>();
  const queue: { nodeId: string; port: string; value?: StateValue }[] = starts.map((node) => ({ nodeId: node.id, port: "next", value: event.value }));

  while (queue.length) {
    const { nodeId, port, value } = queue.shift()!;
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node || visited.has(`${node.id}:${port}`)) continue;
    visited.add(`${node.id}:${port}`);
    let outgoing = port === "value" ? "value" : "next";
    let detail = "";

    switch (node.type) {
      case "onTap":
      case "onScreenLoad":
      case "onMediaComplete":
        detail = `${node.type} → ${port}`;
        break;
      case "onValueChange":
        detail = `value ${String(value ?? "")}`;
        break;
      case "ifCondition": {
        const variable = variableName(graph, String(node.state.variableId ?? ""));
        const left = value ?? ctx.variables[variable] ?? "";
        const result = compare(left, String(node.state.op ?? "=="), String(node.state.compare ?? ""));
        outgoing = result ? "true" : "false";
        detail = `${variable} ${node.state.op} ${node.state.compare} → ${outgoing}`;
        break;
      }
      case "setVariable": {
        const id = String(node.state.variableId ?? "");
        const variable = graph.variables.find((v) => v.id === id);
        let next: StateValue = String(node.state.value ?? "");
        if (node.state.action === "toggle") next = !Boolean(ctx.variables[id]);
        else if (node.state.action === "increment") next = Number(ctx.variables[id] ?? 0) + 1;
        else if (node.state.action === "decrement") next = Number(ctx.variables[id] ?? 0) - 1;
        else if (variable) next = coerce(next, variable.type);
        ctx.setVariable(id, next);
        detail = `${variableName(graph, id)} = ${String(next)}`;
        break;
      }
      case "delay": {
        const ms = Math.max(0, Number(node.state.durationMs ?? 300));
        if (ctx.wait) await ctx.wait(ms);
        detail = `wait ${ms}ms`;
        break;
      }
      case "navigate":
        ctx.navigate(String(node.state.target ?? ""), String(node.state.transition ?? "fade"));
        detail = `navigate ${node.state.target}`;
        break;
      case "showFeedback": {
        const message = String(node.state.message ?? "");
        if (node.state.kind === "dialog") ctx.dialog(message);
        else ctx.snackbar(message);
        detail = `feedback: ${message}`;
        break;
      }
      case "controlMedia":
        ctx.controlMedia(String(node.state.widgetId ?? ""), String(node.state.command ?? "toggle"));
        detail = `media ${node.state.command}`;
        break;
      case "mutateWidget":
        ctx.mutateWidget(String(node.state.widgetId ?? ""), String(node.state.action ?? "show"), value);
        detail = `widget ${node.state.action}`;
        break;
    }
    steps.push({ nodeId: node.id, type: node.type, detail });
    for (const wire of graph.connections.filter((c) => c.from === node.id && c.fromPort === outgoing))
      queue.push({ nodeId: wire.to, port: wire.toPort === "value" ? "value" : "next", value });
  }
  return steps;
}

/* ---------- natural-language spec for the prompt ---------- */

export function logicNotes(graph: LogicGraph): string[] {
  const describe = (id: string): string => {
    const next = graph.nodes.find((n) => n.id === id);
    if (!next) return "";
    switch (next.type) {
      case "setVariable": return `set ${variableName(graph, String(next.state.variableId ?? ""))} (${next.state.action} ${next.state.value})`;
      case "navigate": return `navigate to ${next.state.target} with ${next.state.transition}`;
      case "showFeedback": return `show ${next.state.kind} "${next.state.message}"`;
      case "controlMedia": return `${next.state.command} media ${next.state.widgetId}`;
      case "mutateWidget": return `${next.state.action} widget ${next.state.widgetId}`;
      case "delay": return `wait ${next.state.durationMs}ms`;
      case "ifCondition": return `if ${variableName(graph, String(next.state.variableId ?? ""))} ${next.state.op} ${next.state.compare}`;
      default: return next.type;
    }
  };
  return graph.nodes.filter((node) => TRIGGER_TYPES.includes(node.type)).map((node) => {
    const target = String(node.state.widgetId ?? node.state.frameId ?? "any");
    const chain: string[] = [];
    const seen = new Set<string>();
    const queue = [node.id];
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const wire of graph.connections.filter((c) => c.from === id)) {
        const line = describe(wire.to);
        if (line) chain.push(line);
        queue.push(wire.to);
      }
    }
    return `${node.type} on ${target}: ${chain.length ? chain.join(", then ") : "no wired action"}`;
  });
}

/* ---------- app code export ---------- */

export type ExportFramework = "react" | "compose" | "flutter";

const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9_]/g, "_") || "value";
const initialLiteral = (value: StateValue) => typeof value === "boolean" ? String(value) : typeof value === "number" ? String(value) : JSON.stringify(value);

export function exportLogicCode(graph: LogicGraph, framework: ExportFramework): string {
  const vars = graph.variables;
  const triggers = graph.nodes.filter((node) => TRIGGER_TYPES.includes(node.type));
  if (framework === "react") {
    const lines = [
      "// App event logic — React",
      ...vars.map((v) => `const [${sanitize(v.name)}, set${sanitize(v.name).replace(/^./, (c) => c.toUpperCase())}] = useState(${initialLiteral(v.initialValue)});`),
      "",
      ...triggers.map((n) => {
        const handler = `handle${n.type.replace(/^on/, "").replace(/^./, (c) => c.toUpperCase())}_${sanitize(String(n.state.widgetId ?? n.state.frameId ?? "screen"))}`;
        const actions = graph.connections.filter((c) => c.from === n.id).map((c) => {
          const target = graph.nodes.find((x) => x.id === c.to);
          if (!target) return "";
          if (target.type === "setVariable") {
            const name = sanitize(variableName(graph, String(target.state.variableId ?? "")));
            if (target.state.action === "toggle") return `set${name.charAt(0).toUpperCase() + name.slice(1)}(v => !v);`;
            if (target.state.action === "increment") return `set${name.charAt(0).toUpperCase() + name.slice(1)}(v => v + 1);`;
            return `set${name.charAt(0).toUpperCase() + name.slice(1)}(${JSON.stringify(target.state.value)});`;
          }
          if (target.type === "navigate") return `navigate(${JSON.stringify(target.state.target)}, ${JSON.stringify(target.state.transition)});`;
          if (target.type === "showFeedback") return `showSnackbar(${JSON.stringify(target.state.message)});`;
          if (target.type === "controlMedia") return `media(${JSON.stringify(target.state.widgetId)}).${target.state.command}();`;
          if (target.type === "mutateWidget") return `widget(${JSON.stringify(target.state.widgetId)}).${target.state.action}();`;
          if (target.type === "delay") return `await delay(${target.state.durationMs});`;
          return "";
        }).filter(Boolean);
        return `async function ${handler}() {\n${actions.map((a) => `  ${a}`).join("\n")}\n}`;
      }),
    ];
    return lines.join("\n");
  }
  if (framework === "compose") {
    return [
      "// App event logic — Jetpack Compose",
      ...vars.map((v) => `var ${sanitize(v.name)} by remember { mutableStateOf(${initialLiteral(v.initialValue)}) }`),
      "",
      ...triggers.map((n) => `// ${n.type} on ${n.state.widgetId ?? n.state.frameId ?? "screen"}: {\n  ${graph.connections.filter((c) => c.from === n.id).length} wired action(s)\n}`),
    ].join("\n");
  }
  return [
    "// App event logic — Flutter",
    ...vars.map((v) => `${v.type === "boolean" ? "bool" : v.type === "number" ? "num" : "String"} ${sanitize(v.name)} = ${initialLiteral(v.initialValue)};`),
    "",
    ...triggers.map((n) => `void on${n.type.replace(/^on/, "")}() {\n  setState(() {\n    // ${graph.connections.filter((c) => c.from === n.id).length} wired action(s) from ${n.state.widgetId ?? n.state.frameId ?? "screen"}\n  });\n}`),
  ].join("\n");
}
