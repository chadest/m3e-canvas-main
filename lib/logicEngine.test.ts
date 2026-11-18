import { describe, expect, it } from "vitest";
import { buildPrompt } from "./prompt";
import { Doc } from "./tokens";
import {
  LogicContext,
  LogicGraph,
  exportLogicCode,
  executeLogicGraph,
  makeLogicGraph,
  makeLogicNode,
  makeVariable,
  migrateLogicGraph,
} from "./logicEngine";

const graph = (): LogicGraph => {
  const g = makeLogicGraph();
  const v = makeVariable("cartCount", "number");
  g.variables = [v];
  const tap = makeLogicNode("onTap", 0, 0, { widgetId: "btn" });
  const set = makeLogicNode("setVariable", 220, 0, { variableId: v.id, action: "increment", value: "1" });
  const nav = makeLogicNode("navigate", 440, 0, { target: "home", transition: "fade" });
  const feedback = makeLogicNode("showFeedback", 660, 0, { message: "Added", kind: "snackbar" });
  g.nodes = [tap, set, nav, feedback];
  g.connections = [
    { id: "a", from: tap.id, fromPort: "next", to: set.id, toPort: "event" },
    { id: "b", from: set.id, fromPort: "next", to: nav.id, toPort: "event" },
    { id: "c", from: nav.id, fromPort: "next", to: feedback.id, toPort: "event" },
  ];
  return g;
};

const context = (): LogicContext & { calls: string[]; vars: Record<string, string | number | boolean> } => {
  const calls: string[] = [];
  const vars: Record<string, string | number | boolean> = { cartCount: 0 };
  return {
    calls,
    vars,
    variables: vars,
    setVariable: (id, value) => { vars[id] = value; calls.push(`set:${id}=${value}`); },
    navigate: (target, transition) => calls.push(`nav:${target}:${transition}`),
    snackbar: (message) => calls.push(`snack:${message}`),
    dialog: (message) => calls.push(`dialog:${message}`),
    controlMedia: (id, command) => calls.push(`media:${id}:${command}`),
    mutateWidget: (id, action) => calls.push(`widget:${id}:${action}`),
  };
};

describe("migration", () => {
  it("starts empty and tolerates junk", () => {
    expect(makeLogicGraph().nodes).toEqual([]);
    expect(migrateLogicGraph("nonsense").nodes).toEqual([]);
  });

  it("keeps known nodes and safely drops legacy hardware ones", () => {
    const migrated = migrateLogicGraph({
      nodes: [
        { id: "v", type: "variable_access", x: 0, y: 0, state: { varName: "count", varType: "bool" } },
        { id: "pin", type: "digitalWrite", x: 0, y: 0, state: {} },
      ],
      connections: [{ id: "w", from: "pin", fromPort: "out", to: "v", toPort: "in" }],
      variables: [{ id: "count", name: "count", type: "boolean", initialValue: false }],
    });
    expect(migrated.nodes).toHaveLength(1);
    expect(migrated.nodes[0].type).toBe("setVariable");
    expect(migrated.connections).toEqual([]);
    expect(migrated.variables[0].name).toBe("count");
  });
});

describe("live runtime", () => {
  it("walks the wired chain and applies each action", async () => {
    const g = graph();
    const ctx = context();
    const id = g.variables[0].id;
    ctx.vars[id] = 0;
    const steps = await executeLogicGraph(g, { type: "tap", widgetId: "btn" }, ctx);
    expect(ctx.calls).toEqual([`set:${id}=1`, "nav:home:fade", "snack:Added"]);
    expect(steps.map((s) => s.type)).toEqual(["onTap", "setVariable", "navigate", "showFeedback"]);
  });

  it("only fires triggers bound to the widget", async () => {
    const ctx = context();
    const steps = await executeLogicGraph(graph(), { type: "tap", widgetId: "other" }, ctx);
    expect(steps).toEqual([]);
  });

  it("routes a condition to its true and false ports", async () => {
    const g = makeLogicGraph();
    const v = makeVariable("isLoggedIn", "boolean");
    g.variables = [v];
    const tap = makeLogicNode("onTap", 0, 0, { widgetId: "go" });
    const cond = makeLogicNode("ifCondition", 200, 0, { variableId: v.id, op: "isEmpty", compare: "" });
    const yes = makeLogicNode("showFeedback", 400, 0, { message: "Empty", kind: "dialog" });
    const no = makeLogicNode("showFeedback", 400, 120, { message: "Full", kind: "snackbar" });
    g.nodes = [tap, cond, yes, no];
    g.connections = [
      { id: "1", from: tap.id, fromPort: "next", to: cond.id, toPort: "event" },
      { id: "2", from: cond.id, fromPort: "true", to: yes.id, toPort: "event" },
      { id: "3", from: cond.id, fromPort: "false", to: no.id, toPort: "event" },
    ];
    const empty = context();
    empty.variables[v.id] = "";
    const steps = await executeLogicGraph(g, { type: "tap", widgetId: "go" }, empty);
    expect(steps.map((s) => s.type)).toEqual(["onTap", "ifCondition", "showFeedback"]);
    expect(empty.calls).toContain("dialog:Empty");
  });
});

describe("export and prompt", () => {
  it("generates code in all three frameworks", () => {
    const g = graph();
    expect(exportLogicCode(g, "react")).toContain("useState");
    expect(exportLogicCode(g, "compose")).toContain("mutableStateOf");
    expect(exportLogicCode(g, "flutter")).toContain("setState");
  });

  it("describes the wired behavior in the prompt", () => {
    const doc: Doc = {
      groups: [],
      frames: [{ id: "home", name: "Home", x: 0, y: 0 }],
      paletteKey: "purple",
      frame: "phone",
      title: "",
      brief: "",
      logic: graph(),
    };
    const prompt = buildPrompt(doc, {}, undefined, "en");
    expect(prompt).toContain("onTap on btn");
    expect(prompt).toContain("navigate to home");
  });
});
