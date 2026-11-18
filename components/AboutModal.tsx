"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Palette } from "@/lib/tokens";
import { t, useLang } from "@/lib/i18n";
import { MIT_TEXT, MODIFIED_REPO_URL, NOTICES_TEXT, ORIGINAL_REPO_URL } from "@/lib/legal";
import { Icon } from "./M3Node";
import { Segmented } from "./ui";

type Tab = "mit" | "notices";

/* the same mark the header uses, drawn here so the link cards read as GitHub destinations */
const GITHUB_PATH =
  "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.02.82-1.35-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z";

function LinkCard({ href, title, detail, p }: { href: string; title: string; detail: string; p: Palette }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="m3-press"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 16,
        border: `1px solid ${p.outlineVariant}`,
        background: p.surface,
        color: p.onSurface,
        textDecoration: "none",
      }}
    >
      <span style={{ width: 40, height: 40, borderRadius: 20, background: p.primaryContainer, color: p.onPrimaryContainer, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
        <svg width={22} height={22} viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d={GITHUB_PATH} /></svg>
      </span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
        <span style={{ fontSize: 11, color: p.onSurfaceVariant, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detail}</span>
      </span>
      <Icon name="open_in_new" size={18} />
    </a>
  );
}

/** the About & Licenses sheet, opened from the dashboard's GitHub button */
export function AboutModal({ open, p, onClose }: { open: boolean; p: Palette; onClose: () => void }) {
  const lang = useLang();
  const [tab, setTab] = useState<Tab>("mit");
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null);
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey, true);
      const target = opener.current;
      if (target?.isConnected) target.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="about-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          style={{ position: "fixed", inset: 0, zIndex: 700, background: "rgba(0,0,0,0.36)", display: "grid", placeItems: "center", padding: 20 }}
        >
          <motion.div
            role="dialog"
            aria-modal
            aria-labelledby="about-title"
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 460, damping: 36, mass: 0.8 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(100%, 560px)",
              maxHeight: "min(88vh, 760px)",
              display: "flex",
              flexDirection: "column",
              borderRadius: 28,
              background: p.surfaceContainerHigh,
              color: p.onSurface,
              boxShadow: "0 12px 36px rgba(0,0,0,0.22)",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 20px 12px" }}>
              <span style={{ width: 44, height: 44, borderRadius: 22, background: p.primaryContainer, color: p.onPrimaryContainer, display: "grid", placeItems: "center", flex: "0 0 auto" }}>
                <Icon name="info" size={24} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div id="about-title" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{t("aboutTitle", lang)}</div>
                <span style={{ display: "inline-block", marginTop: 4, padding: "2px 10px", borderRadius: 10, background: p.secondaryContainer, color: p.onSecondaryContainer, fontSize: 10, fontWeight: 700 }}>
                  {t("aboutVersion", lang)}
                </span>
              </div>
              <button
                ref={closeRef}
                onClick={onClose}
                title={t("aboutClose", lang)}
                aria-label={t("aboutClose", lang)}
                className="m3-press"
                style={{ width: 40, height: 40, borderRadius: 20, border: "none", background: "transparent", color: p.onSurfaceVariant, display: "grid", placeItems: "center", cursor: "pointer", flex: "0 0 auto" }}
              >
                <Icon name="close" size={22} />
              </button>
            </div>

            <div className="no-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 20px 4px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ borderRadius: 20, background: p.surfaceContainer, border: `1px solid ${p.outlineVariant}`, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 14, lineHeight: 1.5, color: p.onSurface }}>{t("aboutCredit", lang)}</div>
                <div style={{ fontSize: 12, color: p.onSurfaceVariant }}>{t("aboutDerived", lang)}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <LinkCard href={ORIGINAL_REPO_URL} title={t("aboutOriginalSource", lang)} detail={ORIGINAL_REPO_URL} p={p} />
                  <LinkCard href={MODIFIED_REPO_URL} title={t("aboutModifiedSource", lang)} detail={MODIFIED_REPO_URL} p={p} />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Segmented<Tab>
                  p={p}
                  label={t("aboutLegal", lang)}
                  value={tab}
                  onChange={setTab}
                  options={[
                    { key: "mit", label: t("aboutTabMit", lang) },
                    { key: "notices", label: t("aboutTabNotices", lang) },
                  ]}
                />
                <pre
                  className="no-scrollbar"
                  style={{
                    margin: 0,
                    padding: 14,
                    borderRadius: 16,
                    background: p.surface,
                    border: `1px solid ${p.outlineVariant}`,
                    color: p.onSurfaceVariant,
                    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
                    fontSize: 11,
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                    maxHeight: 220,
                    overflow: "auto",
                  }}
                >
                  {tab === "mit" ? MIT_TEXT : NOTICES_TEXT}
                </pre>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 20px 20px" }}>
              <button
                onClick={onClose}
                className="m3-press"
                style={{ height: 40, padding: "0 20px", borderRadius: 20, border: "none", background: p.primary, color: p.onPrimary, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              >
                {t("aboutClose", lang)}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
