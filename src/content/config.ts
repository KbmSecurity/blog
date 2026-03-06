import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({ pattern: "*.{md,mdx}", base: "./posts" }),
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

    /** Translation markers */
    lang: z.string().optional(),
    lang_original: z.string().optional(),

    /** English metadata (used when lang toggle is EN) */
    titleEn: z.string().max(120).optional(),
    descriptionEn: z.string().max(300).optional(),
  }),
});

export const collections = { posts };
