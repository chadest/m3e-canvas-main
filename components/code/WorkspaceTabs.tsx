"use client";
import React from "react";

export function WorkspaceTabs({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onAddClick,
  addTitle,
  isDark,
}: {
  tabs: { id: string; title: string; icon?: any }[];
  activeTabId: string;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
  onAddClick?: () => void;
  addTitle?: string;
  isDark?: boolean;
}) {
  return (
    <div
      style={{
        height: 36,
        display: "flex",
        alignItems: "stretch",
        gap: 2,
        padding: "0 6px",
        borderBottom: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
        background: isDark ? "#0f172a" : "#f8fafc",
        overflowX: "auto",
      }}
    >
      {tabs.map((tab) => {
        const on = tab.id === activeTabId;
        const Icon = tab.icon;
        return (
          <div
            key={tab.id}
            onClick={() => onTabClick(tab.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "0 8px 0 10px",
              cursor: "pointer",
              fontSize: 12,
              color: isDark ? (on ? "#e2e8f0" : "#94a3b8") : on ? "#0f172a" : "#64748b",
              background: on ? (isDark ? "#1e293b" : "#ffffff") : "transparent",
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              border: on ? `1px solid ${isDark ? "#334155" : "#e2e8f0"}` : "1px solid transparent",
              borderBottomColor: on ? (isDark ? "#1e293b" : "#ffffff") : "transparent",
              marginBottom: -1,
              whiteSpace: "nowrap",
            }}
          >
            {Icon ? <Icon size={14} /> : null}
            <span>{tab.title}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              style={{ border: "none", background: "transparent", color: "inherit", cursor: "pointer", padding: 2, lineHeight: 1 }}
              title="Close"
            >
              ×
            </button>
          </div>
        );
      })}
      {onAddClick && (
        <button
          type="button"
          onClick={onAddClick}
          title={addTitle}
          style={{ border: "none", background: "transparent", color: isDark ? "#94a3b8" : "#64748b", cursor: "pointer", padding: "0 8px", fontSize: 16 }}
        >
          +
        </button>
      )}
    </div>
  );
}
