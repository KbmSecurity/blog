import { defineCollection, z } from "astro:content";

const posts = defineCollection({
  // Using legacy content collections (type: 'content') for Astro 5 compatibility.
  // The `legacy: { collections: true }` flag in astro.config.mjs enables this API.
  // This preserves the `post.slug` property used throughout the codebase.
  // Migration to the Content Layer glob() loader can be done in a future iteration
  // once all `post.slug` references are updated to `post.id`.
  type: "content",
  schema: z.object({
    title: z.string().max(120),

    date: z.coerce.date(),

    description: z.string().max(300),

    category: z.enum([
      "recon",
      "privesc",
      "lateral",
      "exfil",
      "evasion",
      "web",
      "cloud",
      "ctf",
    ]),

    os: z.array(z.enum(["linux", "windows", "macos", "all"])),

    difficulty: z.enum(["easy", "medium", "hard", "expert"]),

    /** MITRE ATT&CK Tactic ID — e.g. TA0004 (Privilege Escalation) */
    mitre_tactic: z.string().optional(),

    /** MITRE ATT&CK Technique ID — e.g. T1548.001 (Setuid and Setgid) */
    mitre_technique: z.string().optional(),

    /** Up to 8 search/filter keywords */
    tags: z.array(z.string()).max(8),

    /** draft posts are hidden from all public routes */
    status: z.enum(["draft", "published"]),

    /** Estimated reading time in minutes — auto-calculated from body if omitted */
    readingTime: z.number().optional(),
  }),
});

export const collections = { posts };
