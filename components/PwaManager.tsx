"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLang, t } from "@/lib/i18n";

/* Installability, offline state and worker updates in one small provider. The service worker
 * itself lives in /public/sw.js so a static export needs no build plugin. */

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaState = {
  isOnline: boolean;
  canInstall: boolean;
  isStandalone: boolean;
  install: () => Promise<void>;
  updateAvailable: boolean;
  applyUpdate: () => void;
};

const PwaContext = createContext<PwaState>({
  isOnline: true,
  canInstall: false,
  isStandalone: false,
  install: async () => {},
  updateAvailable: false,
  applyUpdate: () => {},
});

export const usePwa = () => useContext(PwaContext);

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function PwaManager({ children }: { children: React.ReactNode }) {
  const lang = useLang();
  const [isOnline, setIsOnline] = useState(true);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const prompt = useRef<InstallPrompt | null>(null);
  const reloaded = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      prompt.current = e as InstallPrompt;
      setCanInstall(true);
    };
    const onInstalled = () => {
      prompt.current = null;
      setCanInstall(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const onControllerChange = () => {
      if (reloaded.current) return;
      reloaded.current = true;
      window.location.reload();
    };
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
      if (process.env.NODE_ENV === "production")
        navigator.serviceWorker.register(`${BASE}/sw.js`).then((registration) => {
          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            if (!worker) return;
            worker.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller) setUpdateAvailable(true);
            });
          });
        }).catch(() => {});
    }
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const install = useCallback(async () => {
    const event = prompt.current;
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    prompt.current = null;
    setCanInstall(false);
  }, []);

  const applyUpdate = useCallback(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration?.waiting) registration.waiting.postMessage("SKIP_WAITING");
      else window.location.reload();
    });
  }, []);

  return (
    <PwaContext.Provider value={{ isOnline, canInstall, isStandalone, install, updateAvailable, applyUpdate }}>
      {children}
      <AnimatePresence>
        {updateAvailable && (
          <motion.div
            key="update"
            role="status"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: "fixed",
              left: "50%",
              bottom: 84,
              transform: "translateX(-50%)",
              zIndex: 800,
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "10px 10px 10px 18px",
              borderRadius: 20,
              background: "var(--skel-surface, #fef7ff)",
              color: "var(--skel-primary, #6750a4)",
              boxShadow: "0 6px 22px rgba(0,0,0,0.20)",
              fontSize: 13,
            }}
          >
            <span>{t("updateAvailable", lang)}</span>
            <button
              onClick={applyUpdate}
              className="m3-press"
              style={{ height: 34, padding: "0 14px", borderRadius: 17, border: "none", background: "var(--skel-primary, #6750a4)", color: "#fff", fontWeight: 700, cursor: "pointer" }}
            >
              {t("reload", lang)}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </PwaContext.Provider>
  );
}
