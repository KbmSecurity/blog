---
description: Create a new blog post
---
# Create a new blog post

To create a new blog post:

1. Create a new `.md` file at `/posts/<your-slug>.md`. The filename will become the post URL `/blog/post/<slug>`. Keep it lowercase and use hyphens for spaces.

2. Add the frontmatter template directly into the file:

```yaml
---
title: "Your Post Title"
date: YYYY-MM-DD
description: "A short 1-2 sentence description for the card."
category: recon # must be: recon, privesc, lateral, exfil, evasion, web, cloud, or ctf
os: [linux] # can be linux, windows, macos, all
difficulty: easy # easy, medium, hard, expert
mitre_tactic: TA0001
mitre_technique: T1190
tags: [tag1, tag2]
status: draft # change to published when ready
---
```

3. Write the post body using standard Markdown. You can use markdown code fences with languages (like `bash`, `python`) and they will automatically have syntax highlighting and copy buttons.

4. When finished, change `status: draft` to `status: published` in the frontmatter.

> Tip: The translation script (`npm run translate`) will automatically read your new pt-BR `.md` file (if `lang: pt` is added to frontmatter) and generate an `-en.md` equivalent.
