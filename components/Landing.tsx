"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Lang, LANGS, setGlobalLang, t } from "@/lib/i18n";
import { Icon } from "./M3Node";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const STUDIO = `${BASE}/studio`;

const SEEDS = [
  { key: "purple", color: "#6750A4" },
  { key: "teal", color: "#00897B" },
  { key: "coral", color: "#E8705A" },
  { key: "indigo", color: "#3F51B5" },
] as const;

const WORKFLOW = [
  { title: "landingStep1", body: "landingStep1Body", image: "how-wide.png" },
  { title: "landingStep2", body: "landingStep2Body", image: "features-wide.png" },
  { title: "landingStep3", body: "landingStep3Body", image: "demo.gif" },
] as const;

const FEATURES = [
  { icon: "widgets", title: "landingFeature1", body: "landingFeature1Body", image: "feature-parts.png" },
  { icon: "alt_route", title: "landingFeature2", body: "landingFeature2Body", image: "feature-flow.png" },
  { icon: "bolt", title: "landingFeature3", body: "landingFeature3Body", image: "feature-ai.png" },
  { icon: "offline_bolt", title: "landingFeature4", body: "landingFeature4Body", image: "feature-theme.png" },
] as const;

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? undefined : { opacity: 0, y: 22 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 26, delay }}
    >
      {children}
    </motion.div>
  );
}

/** a small live M3 playground: theme seeds, light/dark and tappable widgets */
function Sandbox({ lang }: { lang: Lang }) {
  const [seed, setSeed] = useState<(typeof SEEDS)[number]["color"]>(SEEDS[0].color);
  const [dark, setDark] = useState(false);
  const [rating, setRating] = useState(4);
  const [tab, setTab] = useState(0);
  const reduced = useReducedMotion();
  const bg = dark ? "#141218" : "#FFFBFE";
  const surface = dark ? "#1D1B20" : "#F7F2FA";
  const onSurface = dark ? "#E6E1E5" : "#1D1B20";
  const outline = dark ? "#49454F" : "#CAC4D0";
  const phone: React.CSSProperties = {
    width: 286, borderRadius: 44, background: bg, color: onSurface, border: `1px solid ${outline}`,
    boxShadow: "0 24px 60px rgba(0,0,0,0.18)", padding: 18, display: "flex", flexDirection: "column", gap: 16,
    transition: "background 320ms cubic-bezier(0.2,0,0,1), color 320ms",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {SEEDS.map((s) => (
          <button key={s.key} onClick={() => setSeed(s.color)} aria-label={s.key} title={s.key} className="m3-press" style={{ width: 34, height: 34, borderRadius: 17, border: `3px solid ${seed === s.color ? onSurface : "transparent"}`, background: s.color, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.16)" }} />
        ))}
        <button onClick={() => setDark(!dark)} className="m3-press" title={dark ? "Light" : "Dark"} style={{ height: 34, padding: "0 12px", borderRadius: 17, border: `1px solid ${outline}`, background: surface, color: onSurface, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name={dark ? "light_mode" : "dark_mode"} size={16} />
          {dark ? "Light" : "Dark"}
        </button>
      </div>
      <motion.div layout transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }} style={phone}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 38, height: 38, borderRadius: 19, background: seed, display: "grid", placeItems: "center", color: "#fff" }}><Icon name="auto_awesome" size={20} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{t("landingSandboxTitle", lang)}</div>
            <div style={{ fontSize: 11, opacity: 0.65 }}>{t("landingSandboxHint", lang)}</div>
          </div>
        </div>
        <div style={{ background: surface, borderRadius: 20, padding: 14, border: `1px solid ${outline}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <motion.span animate={reduced ? undefined : { rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} style={{ width: 36, height: 36, borderRadius: 18, border: `4px solid ${outline}`, borderTopColor: seed, display: "block" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>{t("landingWavy", lang)}</div>
              <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 18 }}>
                {[8, 14, 10, 18, 12, 16, 9].map((h, i) => (
                  <motion.span key={i} animate={reduced ? undefined : { height: [h, h + 6, h] }} transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.08 }} style={{ width: 6, height: h, borderRadius: 3, background: seed, display: "block" }} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <button key={i} onClick={() => setRating(i + 1)} aria-label={`${i + 1} stars`} className="m3-press" style={{ border: "none", background: "transparent", color: i < rating ? seed : outline, cursor: "pointer", padding: 2 }}>
              <Icon name="star" size={26} fill={i < rating} />
            </button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-around", borderTop: `1px solid ${outline}`, paddingTop: 10 }}>
          {["home", "search", "favorite", "person"].map((icon, i) => (
            <button key={icon} onClick={() => setTab(i)} className="m3-press" style={{ border: "none", background: "transparent", color: tab === i ? seed : outline, borderRadius: 16, padding: "6px 12px", cursor: "pointer" }}>
              <Icon name={icon} size={22} fill={tab === i} />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export function Landing() {
  const [lang, setLang] = useState<Lang>("en");
  const chooseLang = (next: Lang) => { setGlobalLang(next); setLang(next); };
  const [step, setStep] = useState(0);

  const pill: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, height: 46, padding: "0 22px", borderRadius: 23, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, textDecoration: "none" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--skel-surface, #FFFBFE)", color: "var(--skel-primary, #1D1B20)", fontFamily: "Roboto, system-ui, sans-serif", overflowX: "hidden" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "color-mix(in srgb, var(--skel-surface, #FFFBFE) 88%, transparent)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--skel-high, #CAC4D0)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", gap: 16, padding: "10px 20px" }}>
          <a href={`${BASE}/`} style={{ display: "flex", alignItems: "center", gap: 10, color: "inherit", textDecoration: "none", fontWeight: 700 }}>
            <span style={{ width: 36, height: 36, borderRadius: 18, background: "var(--skel-primary, #6750A4)", display: "grid", placeItems: "center", color: "#fff" }}><Icon name="auto_awesome" size={20} /></span>
            M3E Canvas
          </a>
          <nav style={{ display: "flex", gap: 16, marginLeft: "auto", alignItems: "center" }}>
            <a href="#how" style={{ color: "inherit", textDecoration: "none", fontSize: 13 }}>{t("landingHow", lang)}</a>
            <a href="#features" style={{ color: "inherit", textDecoration: "none", fontSize: 13 }}>{t("landingFeatures", lang)}</a>
            <a href="#credits" style={{ color: "inherit", textDecoration: "none", fontSize: 13 }}>{t("landingCredits", lang)}</a>
            <select value={lang} onChange={(e) => chooseLang(e.target.value as Lang)} style={{ height: 32, borderRadius: 16, border: "1px solid var(--skel-high, #CAC4D0)", background: "transparent", color: "inherit", fontSize: 11 }}>
              {LANGS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
            </select>
            <a href={STUDIO} style={{ ...pill, background: "var(--skel-primary, #6750A4)", color: "#fff" }}>{t("landingOpenStudio", lang)}</a>
          </nav>
        </div>
      </header>

      <main>
        <section style={{ maxWidth: 1120, margin: "0 auto", padding: "64px 20px", display: "grid", gridTemplateColumns: "1fr auto", gap: 48, alignItems: "center" }}>
          <div>
            <Reveal>
              <span style={{ display: "inline-block", padding: "6px 14px", borderRadius: 16, background: "color-mix(in srgb, var(--skel-primary, #6750A4) 14%, transparent)", color: "var(--skel-primary, #6750A4)", fontSize: 12, fontWeight: 700 }}>{t("landingBadge", lang)}</span>
              <h1 style={{ fontSize: "clamp(34px, 5vw, 56px)", lineHeight: 1.08, letterSpacing: -1.6, margin: "18px 0", maxWidth: 620 }}>{t("landingHeadline", lang)}</h1>
              <p style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.72, maxWidth: 500, whiteSpace: "pre-line" }}>{t("landingSubtitle", lang)}</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 26 }}>
                <a href={STUDIO} style={{ ...pill, background: "var(--skel-primary, #6750A4)", color: "#fff", boxShadow: "0 8px 20px rgba(103,80,164,0.28)" }}><Icon name="arrow_forward" size={18} />{t("landingStart", lang)}</a>
                <a href="#how" style={{ ...pill, background: "transparent", color: "var(--skel-primary, #6750A4)", border: "1px solid var(--skel-high, #CAC4D0)" }}>{t("landingTryDemo", lang)}</a>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.1}><Sandbox lang={lang} /></Reveal>
        </section>

        <section id="how" style={{ background: "color-mix(in srgb, var(--skel-primary, #6750A4) 5%, transparent)", padding: "64px 20px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <Reveal><h2 style={{ fontSize: 30, margin: 0 }}>{t("landingHowTitle", lang)}</h2></Reveal>
            <Reveal delay={0.05}>
              <div style={{ display: "flex", gap: 8, margin: "20px 0", flexWrap: "wrap" }}>
                {WORKFLOW.map((w, i) => (
                  <button key={w.title} onClick={() => setStep(i)} style={{ height: 40, padding: "0 18px", borderRadius: 20, border: "none", cursor: "pointer", background: step === i ? "var(--skel-primary, #6750A4)" : "transparent", color: step === i ? "#fff" : "inherit", fontWeight: 700, fontSize: 13 }}>
                    {i + 1}. {t(w.title, lang)}
                  </button>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, alignItems: "center", borderRadius: 24, background: "var(--skel-surface, #FFFBFE)", padding: 24, border: "1px solid var(--skel-high, #CAC4D0)" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 22 }}>{t(WORKFLOW[step].title, lang)}</h3>
                  <p style={{ lineHeight: 1.6, opacity: 0.72 }}>{t(WORKFLOW[step].body, lang)}</p>
                </div>
                <motion.img key={WORKFLOW[step].image} src={`${BASE}/landing/${WORKFLOW[step].image}`} alt="" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 26 }} style={{ width: "100%", borderRadius: 16, maxHeight: 280, objectFit: "cover" }} />
              </div>
            </Reveal>
          </div>
        </section>

        <section id="features" style={{ maxWidth: 1120, margin: "0 auto", padding: "64px 20px" }}>
          <Reveal><h2 style={{ fontSize: 30, margin: 0, marginBottom: 24 }}>{t("landingFeaturesTitle", lang)}</h2></Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16 }}>
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.05}>
                <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 320, damping: 24 }} style={{ borderRadius: 20, border: "1px solid var(--skel-high, #CAC4D0)", background: "var(--skel-surface, #FFFBFE)", padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                  <span style={{ width: 42, height: 42, borderRadius: 14, background: "color-mix(in srgb, var(--skel-primary, #6750A4) 14%, transparent)", color: "var(--skel-primary, #6750A4)", display: "grid", placeItems: "center" }}><Icon name={f.icon} size={22} /></span>
                  <b style={{ fontSize: 15 }}>{t(f.title, lang)}</b>
                  <span style={{ fontSize: 12, lineHeight: 1.55, opacity: 0.68 }}>{t(f.body, lang)}</span>
                  <img src={`${BASE}/landing/${f.image}`} alt="" style={{ width: 20, height: 20, opacity: 0.55, alignSelf: "flex-end" }} />
                </motion.div>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="credits" style={{ background: "color-mix(in srgb, var(--skel-primary, #6750A4) 6%, transparent)", padding: "64px 20px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }}>
            <Reveal>
              <h2 style={{ fontSize: 30, margin: 0 }}>{t("landingCreditsTitle", lang)}</h2>
              <p style={{ lineHeight: 1.6, opacity: 0.72 }}>{t("landingCreditsBody", lang)}</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a href="https://github.com/lnkiai/m3e-canvas" target="_blank" rel="noopener noreferrer" style={{ ...pill, background: "var(--skel-primary, #6750A4)", color: "#fff" }}><Icon name="open_in_new" size={16} />lnkiai/m3e-canvas</a>
                <a href="https://github.com/chadest" target="_blank" rel="noopener noreferrer" style={{ ...pill, background: "transparent", color: "var(--skel-primary, #6750A4)", border: "1px solid var(--skel-high, #CAC4D0)" }}><Icon name="open_in_new" size={16} />chadest</a>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <picture>
                <source media="(prefers-color-scheme: dark)" srcSet={`${BASE}/landing/banner-dark.png`} />
                <img src={`${BASE}/landing/banner-light.png`} alt="M3E Canvas" style={{ width: "100%", borderRadius: 20 }} />
              </picture>
              <img src={`${BASE}/landing/demo.gif`} alt="M3E Canvas demo" style={{ width: "100%", borderRadius: 16, marginTop: 14 }} />
            </Reveal>
          </div>
        </section>

        <footer style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, fontSize: 12, opacity: 0.7 }}>
          <span>MIT © lnkiai · © Chades&apos;t creative</span>
          <a href={STUDIO} style={{ color: "inherit", textDecoration: "none", fontWeight: 700 }}>{t("landingOpenStudio", lang)} →</a>
        </footer>
      </main>
    </div>
  );
}
