---
title: Passive Recon & OSINT — Mapping the Target Without Making Noise
date: 2025-01-07T00:00:00.000Z
description: >-
  Passive reconnaissance and OSINT techniques to map infrastructure,
  employees, and attack surface before any active engagement.
category: recon
os:
  - linux
  - windows
  - macos
difficulty: easy
mitre_tactic: TA0043
mitre_technique: T1596
tags:
  - osint
  - recon
  - passive
  - shodan
  - theHarvester
  - amass
  - google-dorks
status: published
lang: en
readingTime: 12
lang_original: pt
translated: true
translated_at: '2026-03-04'
---

## What is Passive Reconnaissance?

Passive reconnaissance is the intelligence gathering phase where the operator **never interacts directly** with the target infrastructure. All information is obtained through open sources (OSINT — Open Source Intelligence) or public intermediaries.

The critical advantage: **zero logs on the target**. No client IDS, WAF, or SIEM will see your activity.

&gt; **Golden rule:** the more you know before touching the network, the smaller your exposure surface during active engagement.

---

## Phase 1 — Domain Footprinting

### WHOIS and DNS Records

```bash
# Domain registration information
whois target.com

# Fundamental DNS queries
dig target.com ANY
dig target.com MX
dig target.com NS
dig target.com TXT

# Zone transfer (often blocked, but worth trying)
dig axfr @ns1.target.com target.com

# Subdomains via certificate transparency
curl -s &quot;https://crt.sh/?q=%.target.com&amp;output;=json&quot; \
  | jq -r &#x27;.[].name_value&#x27; \
  | sort -u
```

### Amass — Subdomain Enumeration

[Amass](https://github.com/owasp-amass/amass) is the go-to tool for passive subdomain enumeration. It aggregates dozens of public sources.

```bash
# Installation
go install -v github.com/owasp-amass/amass/v4/...@master

# Pure passive enumeration (no brute force)
amass enum -passive -d target.com -o amass_output.txt

# With all data sources (requires API keys)
amass enum -passive -d target.com \
  -config ~/.config/amass/config.ini \
  -o subdomains.txt

# Asset graph visualization
amass viz -d3 -d target.com -o graph.html
```

### Subfinder — Fast and Silent

```bash
# Installation
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest

# Passive enumeration
subfinder -d target.com -all -recursive -o subfinder_out.txt

# With automatic resolution
subfinder -d target.com -all | dnsx -silent
```

---

## Phase 2 — Google Dorks

Google Dorks are advanced search operators that reveal sensitive information that has been accidentally indexed.

### Essential Dorks

```bash
# Subdomains and related hosts
site:target.com

# Excluding the main domain (reveals subdomains)
site:target.com -www

# Exposed sensitive files
site:target.com filetype:pdf
site:target.com filetype:xls OR filetype:xlsx
site:target.com filetype:sql
site:target.com filetype:env
site:target.com filetype:log

# Administration panels
site:target.com inurl:admin
site:target.com inurl:login
site:target.com inurl:dashboard
site:target.com intitle:&quot;index of&quot;

# Leaked credentials and configurations
site:target.com intext:&quot;password&quot;
site:target.com ext:conf OR ext:config OR ext:cfg
site:target.com ext:bak OR ext:backup OR ext:old

# Exposed technology
site:target.com intext:&quot;powered by&quot;
site:target.com intext:&quot;phpMyAdmin&quot;

# API endpoints
site:target.com inurl:/api/
site:target.com inurl:/v1/ OR inurl:/v2/
```

### Automating with gowitness

```bash
# Screenshot of all subdomains found
cat subdomains.txt | gowitness file -f - --screenshot-path ./screenshots/
gowitness report serve
```

---

## Phase 3 — Shodan &amp; Censys

Search engines for devices and services exposed on the internet.

### Shodan

```bash
# CLI installation
pip install shodan
shodan init YOUR_API_KEY

# Search by organization
shodan search &quot;org:\&quot;Target Company\&quot;&quot;

# Filtering by ASN
shodan search &quot;asn:AS12345&quot;

# Specific exposed services
shodan search &quot;hostname:target.com port:22&quot;
shodan search &quot;hostname:target.com http.title:\&quot;Dashboard\&quot;&quot;

# Known vulnerabilities in infrastructure
shodan search &quot;org:\&quot;Target\&quot; vuln:CVE-2021-44228&quot;

# Download complete results
shodan download --limit 1000 results.json.gz &quot;org:\&quot;Target Company\&quot;&quot;
shodan parse results.json.gz --fields ip_str,port,hostnames,vulns
```

### Useful Shodan Queries

| Query | What it finds |
|-------|---------------|
| `org:&quot;Target&quot; http.title:&quot;Jenkins&quot;` | Exposed Jenkins servers |
| `org:&quot;Target&quot; product:&quot;Apache Tomcat&quot;` | Tomcat without authentication |
| `org:&quot;Target&quot; http.favicon.hash:-1616143106` | GitLab instances |
| `org:&quot;Target&quot; port:3389` | Exposed RDP |
| `org:&quot;Target&quot; ssl.cert.subject.cn:&quot;*.target.com&quot;` | Wildcard certificates |
| `org:&quot;Target&quot; &quot;220&quot; &quot;230 Login&quot;` | Active anonymous FTP |

### Censys

```bash
# API via Python
pip install censys

# Search for hosts by certificate
python3 - &lt;&lt;&#x27;EOF&#x27;
from censys.search import CensysHosts
h = CensysHosts()
query = &quot;parsed.names: target.com and services.tls.certificates.leaf_data.subject.organization: \&quot;Target\&quot;&quot;
for hit in h.search(query, pages=3):
    print(hit[&quot;ip&quot;], hit.get(&quot;services&quot;))
EOF
```

---

## Phase 4 — theHarvester

Collects emails, names, hosts, and IPs from public sources.

```bash
# Installation
git clone https://github.com/laramies/theHarvester
cd theHarvester &amp;&amp; pip3 install -r requirements/base.txt

# Basic collection with multiple sources
python3 theHarvester.py \
  -d target.com \
  -b google,bing,linkedin,hunter,anubis,crtsh \
  -l 500 \
  -f report_target

# Emails only (for phishing/password spraying)
python3 theHarvester.py \
  -d target.com \
  -b linkedin,hunter,google \
  -l 200 | grep -E &quot;^[a-zA-Z0-9._%+-]+@&quot;
```

---

## Phase 5 — People Recognition

### LinkedIn OSINT

Identify employees, positions, and technologies used.

```bash
# Via Google Dorks
site:linkedin.com/in &quot;Target Company&quot; &quot;Security Engineer&quot;
site:linkedin.com/in &quot;Target Company&quot; &quot;DevOps&quot;
site:linkedin.com/in &quot;Target Company&quot; &quot;Active Directory&quot;

# Tools
pip install linkedin2username
python3 linkedin2username.py -u YOUR_EMAIL -c &quot;Target Company&quot;
```

Email Format Discovery

```bash
# Hunter.io CLI
curl &quot;https://api.hunter.io/v2/domain-search?domain=target.com&amp;api;_key=KEY&quot; \
  | jq &#x27;.data.pattern&#x27;
# Example output: &quot;{first}.{last}@target.com&quot;

# Email verification with h8mail
pip install h8mail
h8mail -t emails.txt --breach-src haveibeenpwned
```

---

## Phase 6 — Public Code Analysis

Public repositories often contain accidentally committed credentials, tokens, and internal infrastructure.

```bash
# GitHub Dorks — search directly on the site
# org:target-company password
# org:target-company secret
# org:target-company api_key
# org:target-company internal

# Trufflehog — git history scan
pip install trufflehog
trufflehog github --org=target-company --only-verified

# GitLeaks — scan repositories
docker run -v $(pwd):/path zricethezav/gitleaks:latest \
  detect --source=/path --report-format json

# Specific greps in cloned repos
git clone https://github.com/target/public-repo
cd public-repo
grep -rE &quot;(password|passwd|secret|token|api_key|aws_access)&quot; .
grep -rE &quot;(https?://[^/]+:[^@]+@)&quot; .  # URLs with credentials
```

---

## Phase 7 — Web Technology Analysis

```bash
# WhatWeb — passive fingerprinting via history/cache
whatweb -a 1 https://target.com  # stealth mode

# BuiltWith API
curl &quot;https://api.builtwith.com/v21/api.json?KEY=YOUR_KEY&amp;LOOKUP;=target.com&quot; \
  | jq &#x27;.Results[].Result.Paths[].Technologies[].Name&#x27;

# Wappalyzer CLI
npm install -g wappalyzer
wappalyzer https://target.com

# Wayback Machine — old versions of the website
curl &quot;http://web.archive.org/cdx/search/cdx?url=*.target.com/*&amp;output;=text&amp;fl;=original&amp;collapse;=urlkey&quot; \
  | sort -u | head -100
```

---

## Consolidating Intelligence

Organize everything into a structure before moving on to active reconnaissance:

```
target-intel/
├── domains/
│   ├── subdomains.txt       # all discovered subdomains
│   ├── dns_records.txt      # MX, TXT, NS records
│   └── whois.txt
├── ips/
│   ├── ip_ranges.txt        # target CIDRs
│   └── shodan_results.json
├── people/
│   ├── employees.txt        # names and positions
│   ├── emails.txt           # collected emails
│   └── email_format.txt     # format standard
├── tech/
│   ├── stack.txt            # identified technologies
│   └── certificates.txt     # SSL certificates found
├── credentials/
│   └── leaked_creds.txt     # leaks in breaches
└── code/
    └── github_findings.txt  # findings in public repositories
```

```bash
#!/bin/bash
# passive_recon.sh — Complete passive recon pipeline
DOMAIN=&quot;${1:?Usage: $0 <domain>}&quot;
OUTPUT=&quot;./intel/${DOMAIN}&quot;
mkdir -p &quot;${OUTPUT}&quot;/{domains,ips,people,tech}

echo &quot;[*] Starting passive recon for: ${DOMAIN}&quot;

# Subdomains
echo &quot;[+] Enumerating subdomains...&quot;
subfinder -d &quot;${DOMAIN}&quot; -all -silent &gt; &quot;${OUTPUT}/domains/subfinder.txt&quot;
amass enum -passive -d &quot;${DOMAIN}&quot; &gt;&gt; &quot;${OUTPUT}/domains/amass.txt&quot;
cat &quot;${OUTPUT}/domains/subfinder.txt&quot; &quot;${OUTPUT}/domains/amass.txt&quot; \
  | sort -u &gt; &quot;${OUTPUT}/domains/all_subdomains.txt&quot;
echo &quot;    $(wc -l &lt; &quot;${OUTPUT}/domains/all_subdomains.txt&quot;) unique subdomains&quot;

# DNS
echo &quot;[+] Pulling DNS records...&quot;
dig &quot;${DOMAIN}&quot; ANY +short &gt; &quot;${OUTPUT}/domains/dns.txt&quot;
curl -s &quot;https://crt.sh/?q=%.${DOMAIN}&amp;output;=json&quot; \
  | jq -r &#x27;.[].name_value&#x27; | sort -u &gt;&gt; &quot;${OUTPUT}/domains/all_subdomains.txt&quot;

# Emails
echo &quot;[+] Harvesting emails...&quot;
python3 theHarvester.py -d &quot;${DOMAIN}&quot; -b google,hunter -l 200 \
  | grep -E &quot;@${DOMAIN}&quot; | sort -u &gt; &quot;${OUTPUT}/people/emails.txt&quot;

echo &quot;[✓] Recon complete. Output: ${OUTPUT}&quot;
```

---

## Mitigations (Blue Team)

| Vector | Mitigation |
|-------|-----------|
| Google Dorks | Google Search Console — remove sensitive URLs from the index |
| WHOIS | Use domain privacy (WHOIS Privacy) |
| Certificate Transparency | Unavoidable — use generic subdomains |
| Shodan | Firewalls with no-scan rules; `X-Robots-Tag: noindex` |
| GitHub leaks | Pre-commit hooks + active secret scanning |
| LinkedIn OSINT | Limit technology information in public profiles |

&gt; **Legal note:** These techniques should be used exclusively in authorized engagements or for educational purposes. Unauthorized use is illegal.</domain>
