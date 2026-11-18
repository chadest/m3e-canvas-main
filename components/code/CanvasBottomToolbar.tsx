"use client";
import React from "react";

export function CanvasBottomToolbar({
  onZoomIn,
  onZoomOut,
  onZoomToFit,
  toolMode,
  setToolMode,
  hasSelection,
  onDelete,
  className,
}: any) {
  return (
    <div
      className={className}
      style={{
        position: "absolute",
        left: "50%",
        bottom: 20,
        transform: "translateX(-50%)",
        display: "flex",
        gap: 6,
        padding: 6,
        borderRadius: 12,
        background: "rgba(255,255,255,0.9)",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        pointerEvents: "auto",
        zIndex: 20,
      }}
    >
      <button onClick={onZoomOut} title="Zoom out" style={btn}>−</button>
      <button onClick={onZoomToFit} title="Fit" style={btn}>Fit</button>
      <button onClick={onZoomIn} title="Zoom in" style={btn}>+</button>
      <button onClick={() => setToolMode?.(toolMode === "pan" ? "select" : "pan")} title="Pan" style={{ ...btn, fontWeight: toolMode === "pan" ? 700 : 500 }}>Pan</button>
      <button onClick={() => setToolMode?.(toolMode === "quick_erase" ? "select" : "quick_erase")} title="Erase" style={{ ...btn, fontWeight: toolMode === "quick_erase" ? 700 : 500 }}>Erase</button>
      <button onClick={onDelete} disabled={!hasSelection} title="Delete" style={{ ...btn, opacity: hasSelection ? 1 : 0.4 }}>Del</button>
    </div>
  );
}

const btn: React.CSSProperties = { border: "1px solid #e2e8f0", background: "#fff", borderRadius: 8, padding: "4px 8px", fontSize: 12, cursor: "pointer" };
