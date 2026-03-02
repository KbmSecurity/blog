import { useEffect, useRef } from "react";

interface Heading {
  depth: number;
  slug: string;
  text: string;
}

interface TOCProps {
  headings: Heading[];
}

export default function TOC({ headings }: TOCProps) {
  const activeRef = useRef<string>("");
  const linksRef = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const barRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const navRef = useRef<HTMLOListElement>(null);

  // Filter to H2 and H3 only
  const tocHeadings = headings.filter((h) => h.depth === 2 || h.depth === 3);

  // ── IntersectionObserver — track active heading ──────────────────────────
  useEffect(() => {
    if (tocHeadings.length === 0) return;

    const elements = tocHeadings
      .map((h) => document.getElementById(h.slug))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const visible = new Set<string>();

    const setActive = (id: string) => {
      if (id === activeRef.current) return;
      activeRef.current = id;

      linksRef.current.forEach((link, slug) => {
        const isActive = slug === id;
        const isH3 = tocHeadings.find((h) => h.slug === slug)?.depth === 3;
        link.style.color = isActive ? "var(--green)" : "var(--text-muted)";
        link.style.borderLeft = isActive
          ? "2px solid var(--green)"
          : "2px solid transparent";
        link.style.paddingLeft = isH3 ? "1.25rem" : "0.5rem";
      });

      // Update progress label
      const idx = tocHeadings.findIndex((h) => h.slug === id);
      if (labelRef.current && idx >= 0) {
        labelRef.current.textContent = `${idx + 1} / ${tocHeadings.length}`;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        });
        // Activate the topmost visible heading
        for (const el of elements) {
          if (visible.has(el.id)) {
            setActive(el.id);
            return;
          }
        }
      },
      { rootMargin: "-56px 0px -40% 0px", threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [tocHeadings.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll progress bar — CSS Scroll-Driven where supported, rAF fallback ─
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    // CSS Scroll-Driven Animations — Chrome 115+
    if (CSS.supports("animation-timeline: scroll()")) {
      bar.style.cssText += `
        animation: toc-progress linear both;
        animation-timeline: scroll(root block);
      `;
      return; // no JS listener needed
    }

    // rAF fallback — use transform so no layout is triggered
    let scheduled = false;
    const update = () => {
      scheduled = false;
      const scrollY = window.scrollY;
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      const pct = maxScroll > 0 ? scrollY / maxScroll : 0;
      bar.style.transform = `scaleX(${pct})`;

      if (labelRef.current) {
        labelRef.current.textContent = `${Math.round(pct * 100)}%`;
      }
    };

    const onScroll = () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Smooth scroll on link click ───────────────────────────────────────────
  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    slug: string,
  ) => {
    e.preventDefault();
    const target = document.getElementById(slug);
    if (!target) return;
    const offset = 72;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
    window.history.replaceState(null, "", `#${slug}`);
  };

  if (tocHeadings.length === 0) return null;

  return (
    <nav aria-label="Table of contents" style={{ fontFamily: "inherit" }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          marginBottom: "0.75rem",
        }}
      >
        <span style={{ color: "var(--green)", fontSize: "0.7rem" }}>{">"}</span>
        <span
          style={{
            color: "var(--text-muted)",
            fontSize: "0.65rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          on this page
        </span>
      </div>

      {/* ── Links ──────────────────────────────────────────────────────── */}
      <ol
        ref={navRef}
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: "0.05rem",
        }}
      >
        {tocHeadings.map((heading) => {
          const isH3 = heading.depth === 3;
          return (
            <li key={heading.slug}>
              <a
                href={`#${heading.slug}`}
                ref={(el) => {
                  if (el) linksRef.current.set(heading.slug, el);
                  else linksRef.current.delete(heading.slug);
                }}
                onClick={(e) => handleClick(e, heading.slug)}
                style={{
                  display: "block",
                  padding: `0.2rem ${isH3 ? "1.25rem" : "0.5rem"}`,
                  fontSize: isH3 ? "0.72rem" : "0.775rem",
                  lineHeight: "1.4",
                  color: "var(--text-muted)",
                  borderLeft: "2px solid transparent",
                  textDecoration: "none",
                  transition: "color 0.15s ease, border-color 0.15s ease",
                  wordBreak: "break-word",
                }}
                onMouseEnter={(e) => {
                  if (
                    (e.currentTarget as HTMLElement).style.color !==
                    "var(--green)"
                  ) {
                    (e.currentTarget as HTMLElement).style.color =
                      "var(--text)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (
                    (e.currentTarget as HTMLElement).style.color !==
                    "var(--green)"
                  ) {
                    (e.currentTarget as HTMLElement).style.color =
                      "var(--text-muted)";
                  }
                }}
              >
                {heading.text.replace(/^#+\s*/, "")}
              </a>
            </li>
          );
        })}
      </ol>

      {/* ── Progress section ───────────────────────────────────────────── */}
      <div
        style={{
          marginTop: "1rem",
          paddingTop: "0.75rem",
          borderTop: "1px solid var(--border)",
        }}
      >
        {/* Track */}
        <div
          style={{
            height: "2px",
            background: "var(--border)",
            borderRadius: "1px",
            overflow: "hidden",
            marginBottom: "0.5rem",
          }}
        >
          {/* Bar — CSS scroll-driven or rAF transform */}
          <div
            ref={barRef}
            style={{
              height: "100%",
              width: "100%",
              background: "var(--green-dim)",
              borderRadius: "1px",
              transform: "scaleX(0)",
              transformOrigin: "left center",
              transition: "transform 0.08s linear",
            }}
          />
        </div>

        {/* Label */}
        <span
          ref={labelRef}
          style={{
            fontSize: "0.62rem",
            color: "var(--text-dim)",
            letterSpacing: "0.08em",
          }}
        >
          {tocHeadings.length} sections
        </span>
      </div>

      {/* Keyframe for CSS scroll-driven animation */}
      <style>{`
        @keyframes toc-progress {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>
    </nav>
  );
}
