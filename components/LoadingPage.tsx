import { Logo } from "@/components/Logo";

/* The first page: a shimmering ghost of the projects dashboard. It is plain static markup, so the
 * browser paints it from the first HTML while the editor's chunk is still downloading. Every
 * measure follows the real dashboard's: the header, the rail, the template strip and the cards. */

function Bone({
  w,
  h,
  r = 8,
  style,
  primary,
}: {
  w?: number | string;
  h: number | string;
  r?: number;
  style?: React.CSSProperties;
  primary?: boolean;
}) {
  return (
    <span
      className="m3e-shimmer"
      style={{ display: "block", width: w ?? "100%", height: h, borderRadius: r, background: primary ? "var(--skel-primary)" : undefined, opacity: primary ? 0.7 : 1, ...style }}
    />
  );
}

/** a row of a rail filter: its mark, its words and its count */
function FilterBone() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 14px", height: 40 }}>
      <Bone w={20} h={20} r={10} />
      <Bone w="52%" h={12} r={6} />
      <span style={{ flex: 1 }} />
      <Bone w={12} h={12} r={6} />
    </div>
  );
}

/** a project card: its picture and the two quiet lines under it */
function CardBone() {
  return (
    <div className="m3e-load-card">
      <Bone h={142} r={0} style={{ background: "var(--skel-container)" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Bone w="62%" h={14} r={7} />
          <span style={{ flex: 1 }} />
          <Bone w={18} h={18} r={9} />
        </div>
        <Bone w="46%" h={10} r={5} />
      </div>
    </div>
  );
}

/** a quick-start template: its round mark and its two lines of words */
function TemplateBone() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, border: "1px solid var(--skel-high)" }}>
      <Bone w={40} h={40} r={20} primary />
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <Bone w="76%" h={12} r={6} />
        <Bone w="46%" h={10} r={5} />
      </div>
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="m3e-load" aria-hidden>
      {/* the floating app mark rides above the shimmer until the projects page is ready */}
      <div className="m3e-load-logo">
        <span className="m3e-load-logo-halo" />
        <Logo size={58} color="var(--skel-primary)" glyph="var(--skel-surface)" />
      </div>
      <header className="m3e-load-head">
        <Bone w={36} h={36} r={18} />
        <Bone w={96} h={16} r={8} />
        <div className="m3e-load-search">
          <Bone h={44} r={22} style={{ background: "var(--skel-high)" }} />
        </div>
        <Bone w={108} h={36} r={18} />
        <Bone w={36} h={36} r={18} />
      </header>
      <div className="m3e-load-body">
        <nav className="m3e-load-rail">
          <Bone w={168} h={56} r={16} primary />
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 8 }}>
            <FilterBone />
            <FilterBone />
            <FilterBone />
            <FilterBone />
          </div>
          <div className="m3e-load-foot">
            <Bone w="70%" h={10} r={5} />
            <div className="m3e-load-gauge">
              <Bone h="100%" r={3} primary />
            </div>
            <Bone w={120} h={36} r={18} style={{ marginTop: 8 }} />
          </div>
        </nav>
        <main className="m3e-load-main">
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
            <Bone w={148} h={12} r={6} />
            <div className="m3e-load-templates">
              <TemplateBone />
              <TemplateBone />
              <TemplateBone />
              <TemplateBone />
            </div>
          </div>
          <div className="m3e-load-cards">
            <CardBone />
            <CardBone />
            <CardBone />
            <CardBone />
            <CardBone />
            <CardBone />
          </div>
        </main>
      </div>
    </div>
  );
}
