import { useState, useEffect, useRef, useCallback } from "react";
import { create, insert, search as oramaSearch } from "@orama/orama";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SearchEntry {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  tags: string;
  slug: string;
}

type OramaDB = Awaited<ReturnType<typeof create>>;

interface SearchProps {
  baseUrl: string;
}

// ─── Category color map ────────────────────────────────────────────────────────

const CAT_COLOR: Record<string, string> = {
  recon: "#4fc3f7",
  privesc: "#ff3c3c",
  lateral: "#c792ea",
  persistence: "#ffd700",
  exfil: "#ff9800",
  evasion: "#00ff41",
  web: "#26c6da",
  cloud: "#82b1ff",
};

const DIFF_COLOR: Record<string, string> = {
  easy: "#00ff41",
  medium: "#ffd700",
  hard: "#ff9800",
  expert: "#ff3c3c",
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function Search({ baseUrl }: SearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchEntry[]>([]);
  const [db, setDb] = useState<OramaDB | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isMac, setIsMac] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // ── Load search index from pre-built JSON ───────────────────────────────────
  const loadIndex = useCallback(async () => {
    if (db) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}search-index.json`);
      if (!res.ok) throw new Error(`Failed to load index: ${res.status}`);
      const entries: SearchEntry[] = await res.json();

      const database = await create({
        schema: {
          id: "string",
          title: "string",
          description: "string",
          category: "string",
          difficulty: "string",
          tags: "string",
          slug: "string",
        } as const,
      });

      for (const entry of entries) {
        await insert(database, entry);
      }

      setDb(database);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load search index",
      );
    } finally {
      setLoading(false);
    }
  }, [db, baseUrl]);

  // ── Detect platform (Mac vs PC) ─────────────────────────────────────────────
  useEffect(() => {
    const mac =
      typeof navigator !== "undefined" &&
      (/Mac|iPhone|iPad|iPod/.test(navigator.platform) ||
        navigator.userAgent.includes("Mac"));
    setIsMac(mac);
  }, []);

  // ── Open / close ────────────────────────────────────────────────────────────
  const open = useCallback(() => {
    setIsOpen(true);
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
  }, []);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  // Cmd+K (Mac) / Ctrl+K (PC) — primary
  // /                          — universal fallback (not fired inside inputs)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // ── Cmd+K / Ctrl+K ────────────────────────────────────────────────────
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        e.stopPropagation();
        if (isOpen) close();
        else open();
        return;
      }

      // ── / — only when not focused inside a text field ─────────────────────
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isOpen) {
        const active = document.activeElement;
        const isInput =
          active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement ||
          (active as HTMLElement | null)?.isContentEditable;
        if (!isInput) {
          e.preventDefault();
          open();
          return;
        }
      }

      // ── Escape ─────────────────────────────────────────────────────────────
      if (e.key === "Escape" && isOpen) {
        close();
      }
    };

    window.addEventListener("keydown", handler, { capture: true });
    return () =>
      window.removeEventListener("keydown", handler, { capture: true });
  }, [isOpen, open, close]);

  // ── Focus input when modal opens ────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      loadIndex();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, loadIndex]);

  // ── Lock body scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // ── Search ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!db || !query.trim()) {
      setResults([]);
      setActiveIndex(-1);
      return;
    }

    const run = async () => {
      const res = await oramaSearch(db, {
        term: query,
        properties: ["title", "description", "tags", "category"],
        limit: 8,
        tolerance: 1,
      });
      setResults(res.hits.map((h) => h.document as SearchEntry));
      setActiveIndex(-1);
    };

    const timer = setTimeout(run, 120);
    return () => clearTimeout(timer);
  }, [db, query]);

  // ── Keyboard nav inside results ─────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      navigateTo(results[activeIndex]);
    }
  };

  // ── Scroll active item into view ────────────────────────────────────────────
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.children[activeIndex] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const navigateTo = (entry: SearchEntry) => {
    window.location.href = `${baseUrl}post/${entry.slug}`;
    close();
  };

  // ── Click outside to close ──────────────────────────────────────────────────
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) close();
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Trigger button ──────────────────────────────────────────────── */}
      <button
        onClick={open}
        aria-label="Open search (Ctrl+K)"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.3rem 0.65rem",
          background: "#161616",
          border: "1px solid #2a2a2a",
          borderRadius: "4px",
          color: "#6e7681",
          fontFamily: "inherit",
          fontSize: "0.75rem",
          cursor: "pointer",
          transition: "border-color 0.2s, color 0.2s",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#00ff41";
          (e.currentTarget as HTMLButtonElement).style.color = "#00ff41";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2a2a";
          (e.currentTarget as HTMLButtonElement).style.color = "#6e7681";
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span>search</span>
        <span
          style={{
            marginLeft: "0.25rem",
            padding: "0.05rem 0.3rem",
            background: "#0a0a0a",
            border: "1px solid #1c1c1c",
            borderRadius: "3px",
            fontSize: "0.65rem",
            color: "#444d56",
            letterSpacing: "0.03em",
          }}
        >
          {isMac ? "⌘K" : "Ctrl+K"}
        </span>
      </button>

      {/* ── Modal overlay ───────────────────────────────────────────────── */}
      {isOpen && (
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          role="dialog"
          aria-modal="true"
          aria-label="Search"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.78)",
            backdropFilter: "blur(6px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: "8vh",
            animation: "scanIn 0.15s ease-out",
          }}
        >
          {/* ── Search box ────────────────────────────────────────────── */}
          <div
            role="search"
            style={{
              background: "#111111",
              border: "1px solid #2a2a2a",
              borderRadius: "8px",
              width: "100%",
              maxWidth: "640px",
              margin: "0 1rem",
              overflow: "hidden",
              boxShadow: "0 24px 80px rgba(0, 0, 0, 0.7)",
            }}
          >
            {/* Input row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0 1.25rem",
                borderBottom: "1px solid #1c1c1c",
              }}
            >
              {/* Search icon */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#444d56"
                strokeWidth="2"
                style={{ flexShrink: 0 }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="search techniques, categories, tags..."
                aria-label="Search posts"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#c9d1d9",
                  fontFamily: "inherit",
                  fontSize: "0.9rem",
                  padding: "1rem 0",
                  letterSpacing: "0.02em",
                }}
              />

              {/* Loading spinner */}
              {loading && (
                <div
                  style={{
                    width: "14px",
                    height: "14px",
                    border: "2px solid #1c1c1c",
                    borderTopColor: "#00ff41",
                    borderRadius: "50%",
                    animation: "spin 0.6s linear infinite",
                    flexShrink: 0,
                  }}
                />
              )}

              {/* Escape hint */}
              <kbd
                style={{
                  padding: "0.15rem 0.4rem",
                  background: "#0a0a0a",
                  border: "1px solid #1c1c1c",
                  borderRadius: "3px",
                  fontSize: "0.65rem",
                  color: "#444d56",
                  fontFamily: "inherit",
                  letterSpacing: "0.03em",
                  flexShrink: 0,
                }}
              >
                esc
              </kbd>
            </div>

            {/* Results list */}
            {results.length > 0 && (
              <ul
                ref={listRef}
                role="listbox"
                style={{
                  margin: 0,
                  padding: "0.4rem 0",
                  listStyle: "none",
                  maxHeight: "420px",
                  overflowY: "auto",
                }}
              >
                {results.map((entry, i) => (
                  <li
                    key={entry.id}
                    role="option"
                    aria-selected={i === activeIndex}
                    onClick={() => navigateTo(entry)}
                    onMouseEnter={() => setActiveIndex(i)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                      padding: "0.7rem 1.25rem",
                      cursor: "pointer",
                      background: i === activeIndex ? "#161616" : "transparent",
                      borderLeft:
                        i === activeIndex
                          ? `2px solid ${CAT_COLOR[entry.category] ?? "#00ff41"}`
                          : "2px solid transparent",
                      transition: "background 0.1s",
                    }}
                  >
                    {/* Category dot */}
                    <div
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: CAT_COLOR[entry.category] ?? "#444d56",
                        flexShrink: 0,
                        marginTop: "6px",
                      }}
                    />

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: "#c9d1d9",
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          marginBottom: "0.2rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.title}
                      </div>
                      <div
                        style={{
                          color: "#6e7681",
                          fontSize: "0.75rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.description}
                      </div>
                    </div>

                    {/* Meta badges */}
                    <div
                      style={{
                        display: "flex",
                        gap: "0.35rem",
                        alignItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      {/* Category */}
                      <span
                        style={{
                          padding: "0.1rem 0.4rem",
                          borderRadius: "3px",
                          fontSize: "0.65rem",
                          fontWeight: 600,
                          letterSpacing: "0.07em",
                          color: CAT_COLOR[entry.category] ?? "#6e7681",
                          border: `1px solid ${CAT_COLOR[entry.category] ?? "#2a2a2a"}40`,
                          background: `${CAT_COLOR[entry.category] ?? "#6e7681"}10`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.category}
                      </span>
                      {/* Difficulty */}
                      <span
                        style={{
                          padding: "0.1rem 0.4rem",
                          borderRadius: "3px",
                          fontSize: "0.65rem",
                          letterSpacing: "0.05em",
                          color: DIFF_COLOR[entry.difficulty] ?? "#6e7681",
                          border: `1px solid ${DIFF_COLOR[entry.difficulty] ?? "#2a2a2a"}40`,
                          background: `${DIFF_COLOR[entry.difficulty] ?? "#6e7681"}10`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.difficulty}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Empty state */}
            {query.trim() && !loading && results.length === 0 && !error && (
              <div
                style={{
                  padding: "2rem 1.25rem",
                  textAlign: "center",
                  color: "#444d56",
                  fontSize: "0.85rem",
                }}
              >
                <div style={{ marginBottom: "0.4rem", fontSize: "1.2rem" }}>
                  //
                </div>
                no results for &ldquo;
                <span style={{ color: "#6e7681" }}>{query}</span>
                &rdquo;
              </div>
            )}

            {/* Error state */}
            {error && (
              <div
                style={{
                  padding: "1rem 1.25rem",
                  color: "#ff3c3c",
                  fontSize: "0.8rem",
                }}
              >
                ⚠ {error}
              </div>
            )}

            {/* Initial state hint */}
            {!query && !loading && (
              <div
                style={{
                  padding: "0.75rem 1.25rem",
                  borderTop: "1px solid #1c1c1c",
                  display: "flex",
                  gap: "1.5rem",
                  flexWrap: "wrap",
                }}
              >
                {["recon", "privesc", "evasion", "web", "lateral"].map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setQuery(cat)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        fontSize: "0.72rem",
                        letterSpacing: "0.05em",
                        color: CAT_COLOR[cat] ?? "#6e7681",
                        fontFamily: "inherit",
                        transition: "opacity 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.opacity =
                          "0.7";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.opacity =
                          "1";
                      }}
                    >
                      /{cat}
                    </button>
                  ),
                )}
              </div>
            )}

            {/* Footer */}
            <div
              style={{
                padding: "0.5rem 1.25rem",
                borderTop: "1px solid #1c1c1c",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.65rem",
                color: "#444d56",
              }}
            >
              <span>r3d/ops knowledge base</span>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <span>
                  <kbd
                    style={{
                      padding: "0 0.3rem",
                      background: "#0a0a0a",
                      border: "1px solid #1c1c1c",
                      borderRadius: "2px",
                    }}
                  >
                    ↑↓
                  </kbd>{" "}
                  navigate
                </span>
                <span>
                  <kbd
                    style={{
                      padding: "0 0.3rem",
                      background: "#0a0a0a",
                      border: "1px solid #1c1c1c",
                      borderRadius: "2px",
                    }}
                  >
                    ↵
                  </kbd>{" "}
                  open
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Inline keyframes ────────────────────────────────────────────── */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
