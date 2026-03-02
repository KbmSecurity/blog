import type { CollectionEntry } from "astro:content";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Post = CollectionEntry<"posts">;

export type Category =
  | "recon"
  | "privesc"
  | "lateral"
  | "persistence"
  | "exfil"
  | "evasion"
  | "web"
  | "cloud";

export type Difficulty = "easy" | "medium" | "hard" | "expert";

export type OS = "linux" | "windows" | "macos" | "all";

// ─── Date Utilities ───────────────────────────────────────────────────────────

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function formatDateFull(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── Reading Time ─────────────────────────────────────────────────────────────

export function calcReadingTime(body: string): number {
  const WORDS_PER_MIN = 200;
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MIN));
}

// ─── Category Metadata ────────────────────────────────────────────────────────

export const CATEGORY_META: Record<
  Category,
  { label: string; color: string; bg: string; border: string; icon: string }
> = {
  recon: {
    label: "Recon",
    color: "text-[#4fc3f7]",
    bg: "bg-[#4fc3f7]/10",
    border: "border-[#4fc3f7]/30",
    icon: "🔍",
  },
  privesc: {
    label: "Priv-Esc",
    color: "text-[#ff3c3c]",
    bg: "bg-[#ff3c3c]/10",
    border: "border-[#ff3c3c]/30",
    icon: "⬆",
  },
  lateral: {
    label: "Lateral",
    color: "text-[#c792ea]",
    bg: "bg-[#c792ea]/10",
    border: "border-[#c792ea]/30",
    icon: "↔",
  },
  persistence: {
    label: "Persistence",
    color: "text-[#ffd700]",
    bg: "bg-[#ffd700]/10",
    border: "border-[#ffd700]/30",
    icon: "🔒",
  },
  exfil: {
    label: "Exfil",
    color: "text-[#ff9800]",
    bg: "bg-[#ff9800]/10",
    border: "border-[#ff9800]/30",
    icon: "📤",
  },
  evasion: {
    label: "Evasion",
    color: "text-[#00ff41]",
    bg: "bg-[#00ff41]/10",
    border: "border-[#00ff41]/30",
    icon: "👁",
  },
  web: {
    label: "Web",
    color: "text-[#4fc3f7]",
    bg: "bg-[#4fc3f7]/10",
    border: "border-[#4fc3f7]/30",
    icon: "🌐",
  },
  cloud: {
    label: "Cloud",
    color: "text-[#82b1ff]",
    bg: "bg-[#82b1ff]/10",
    border: "border-[#82b1ff]/30",
    icon: "☁",
  },
};

// ─── Difficulty Metadata ──────────────────────────────────────────────────────

export const DIFFICULTY_META: Record<
  Difficulty,
  { label: string; color: string; bg: string; border: string }
> = {
  easy: {
    label: "easy",
    color: "text-[#00ff41]",
    bg: "bg-[#00ff41]/10",
    border: "border-[#00ff41]/30",
  },
  medium: {
    label: "medium",
    color: "text-[#ffd700]",
    bg: "bg-[#ffd700]/10",
    border: "border-[#ffd700]/30",
  },
  hard: {
    label: "hard",
    color: "text-[#ff9800]",
    bg: "bg-[#ff9800]/10",
    border: "border-[#ff9800]/30",
  },
  expert: {
    label: "expert",
    color: "text-[#ff3c3c]",
    bg: "bg-[#ff3c3c]/10",
    border: "border-[#ff3c3c]/30",
  },
};

// ─── OS Metadata ──────────────────────────────────────────────────────────────

export const OS_META: Record<OS, { label: string; icon: string }> = {
  linux: { label: "Linux", icon: "🐧" },
  windows: { label: "Windows", icon: "🪟" },
  macos: { label: "macOS", icon: "🍎" },
  all: { label: "All OS", icon: "🌐" },
};

// ─── Post Sorting ─────────────────────────────────────────────────────────────

export function sortPostsByDate(posts: Post[]): Post[] {
  return [...posts].sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );
}

export function filterPublished(posts: Post[]): Post[] {
  return posts.filter((p) => p.data.status === "published");
}

export function getPostsByCategory(posts: Post[], category: Category): Post[] {
  return posts.filter((p) => p.data.category === category);
}

export function getPostsByTag(posts: Post[], tag: string): Post[] {
  return posts.filter((p) => p.data.tags.includes(tag));
}

export function getAllTags(posts: Post[]): { tag: string; count: number }[] {
  const map = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

// ─── URL Helpers ──────────────────────────────────────────────────────────────

/**
 * Normalizes a base URL to always end with a trailing slash.
 * Astro 5 may return BASE_URL as '/blog' or '/blog/' depending on
 * the environment/version — this ensures consistent concatenation.
 *
 * '/blog'  → '/blog/'
 * '/blog/' → '/blog/'
 * '/'      → '/'
 */
export function normalizeBase(base: string): string {
  return base.endsWith("/") ? base : `${base}/`;
}

export function postUrl(base: string, slug: string): string {
  return `${normalizeBase(base)}post/${slug}`;
}

export function tagUrl(base: string, tag: string): string {
  return `${normalizeBase(base)}tags/${encodeURIComponent(tag)}`;
}

export function categoryUrl(base: string, category: string): string {
  return `${normalizeBase(base)}tags/${encodeURIComponent(category)}`;
}

// ─── Related Posts ────────────────────────────────────────────────────────────

export function getRelatedPosts(
  current: Post,
  allPosts: Post[],
  limit = 3,
): Post[] {
  const others = allPosts.filter(
    (p) => p.slug !== current.slug && p.data.status === "published",
  );

  const scored = others.map((p) => {
    let score = 0;
    // same category
    if (p.data.category === current.data.category) score += 3;
    // shared tags
    const sharedTags = p.data.tags.filter((t: string) =>
      current.data.tags.includes(t),
    );
    score += sharedTags.length * 2;
    // same OS
    const sharedOS = p.data.os.filter((o: string) =>
      current.data.os.includes(o as OS),
    );
    score += sharedOS.length;
    return { post: p, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.post);
}

// ─── MITRE Helpers ────────────────────────────────────────────────────────────

export const MITRE_TACTIC_NAMES: Record<string, string> = {
  TA0001: "Initial Access",
  TA0002: "Execution",
  TA0003: "Persistence",
  TA0004: "Privilege Escalation",
  TA0005: "Defense Evasion",
  TA0006: "Credential Access",
  TA0007: "Discovery",
  TA0008: "Lateral Movement",
  TA0009: "Collection",
  TA0010: "Exfiltration",
  TA0011: "Command and Control",
  TA0040: "Impact",
  TA0042: "Resource Development",
  TA0043: "Reconnaissance",
};

export function getMitreTacticName(tacticId: string): string {
  return MITRE_TACTIC_NAMES[tacticId] ?? tacticId;
}

export function getMitreUrl(techniqueId: string): string {
  const clean = techniqueId.replace(".", "/");
  return `https://attack.mitre.org/techniques/${clean}/`;
}
