"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { LoadingPage } from "@/components/LoadingPage";
import { PwaManager } from "@/components/PwaManager";
import { isLang, setGlobalLang, type Lang } from "@/lib/i18n";

const loadEditor = () => import("../Editor");
if (typeof window !== "undefined") void loadEditor();

const Editor = dynamic(loadEditor, { ssr: false, loading: () => null });

const BOOT_FADE_MS = 420;
const MIN_SHIMMER_MS = 900;

function initialLanguage(): Lang {
  try {
    const ui = JSON.parse(localStorage.getItem("m3e:ui") ?? "null");
    if (isLang(ui?.lang)) return ui.lang;
  } catch {}
  const language = (navigator.language ?? "").toLowerCase();
  return language.startsWith("zh") ? "zh" : language.startsWith("ko") ? "ko" : language.startsWith("ja") ? "ja" : language.startsWith("fr") ? "fr" : language.startsWith("es") ? "es" : language.startsWith("de") ? "de" : "en";
}

export default function StudioPage() {
  const [lang, setLang] = useState<Lang | null>(null);
  const [phase, setPhase] = useState<"loading" | "fading" | "done">("loading");
  const [editorReady, setEditorReady] = useState(false);
  const [shimmerDone, setShimmerDone] = useState(false);
  useEffect(() => {
    const initialLang = initialLanguage();
    document.documentElement.lang = initialLang;
    setGlobalLang(initialLang);
    setLang(initialLang);
  }, []);
  useEffect(() => {
    const id = setTimeout(() => setShimmerDone(true), MIN_SHIMMER_MS);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    if (editorReady && shimmerDone) setPhase("fading");
  }, [editorReady, shimmerDone]);
  useEffect(() => {
    if (phase !== "fading") return;
    const id = setTimeout(() => setPhase("done"), BOOT_FADE_MS);
    return () => clearTimeout(id);
  }, [phase]);
  return (
    <>
      {lang && (
        <PwaManager>
          <Editor initialLang={lang} onReady={() => setEditorReady(true)} />
        </PwaManager>
      )}
      {phase !== "done" && (
        <div className="m3e-boot" data-done={phase === "fading" ? "" : undefined} aria-busy={phase === "loading"} aria-hidden={phase !== "loading"}>
          <LoadingPage />
        </div>
      )}
    </>
  );
}
