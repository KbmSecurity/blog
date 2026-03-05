import { useState, useEffect } from "react";

export default function ToggleLang() {
    const [lang, setLang] = useState("pt");

    useEffect(() => {
        const stored = localStorage.getItem("kbm-lang") || "pt";
        setLang(stored);
        document.documentElement.setAttribute("data-lang", stored);
    }, []);

    const toggle = () => {
        const next = lang === "pt" ? "en" : "pt";
        setLang(next);
        localStorage.setItem("kbm-lang", next);
        document.documentElement.setAttribute("data-lang", next);

        // Swap all [data-i18n] element text immediately
        if (typeof (window as any).applyTranslations === "function") {
            (window as any).applyTranslations(next);
        }

        const currentPath = window.location.pathname;
        if (currentPath.includes("/post/")) {
            // Strip trailing slash if present for easier logic
            const rawPath = currentPath.endsWith("/") ? currentPath.slice(0, -1) : currentPath;
            const isEnglishUrl = rawPath.endsWith("-en");

            if (next === "en" && !isEnglishUrl) {
                // To English: Append -en to the URL
                window.location.href = `${rawPath}-en/`;
            } else if (next === "pt" && isEnglishUrl) {
                // To Portuguese: Remove -en from the URL
                window.location.href = `${rawPath.replace(/-en$/, "")}/`;
            }
        }
    };

    return (
        <div
            onClick={toggle}
            style={{
                display: "flex",
                alignItems: "center",
                background: "#111",
                border: "1px solid #222",
                borderRadius: "6px",
                padding: "3px",
                cursor: "pointer",
                gap: "2px",
                userSelect: "none",
            }}
        >
            {["pt", "en"].map(l => (
                <div
                    key={l}
                    style={{
                        padding: "5px 12px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        letterSpacing: "0.08em",
                        fontFamily: "monospace",
                        transition: "all 0.18s ease",
                        background: lang === l
                            ? (l === "pt" ? "#1a2e1a" : "#2e1a1a")
                            : "transparent",
                        color: lang === l
                            ? (l === "pt" ? "#4ade80" : "#ff3c3c")
                            : "#444",
                        border: lang === l
                            ? (l === "pt" ? "1px solid #2d5a2d" : "1px solid #5a2d2d")
                            : "1px solid transparent",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                    }}
                >
                    <span style={{ fontSize: "13px" }}>{l === "pt" ? "🇧🇷" : "🇺🇸"}</span>
                    {l === "pt" ? "PT" : "EN"}
                </div>
            ))}
        </div>
    );
}
