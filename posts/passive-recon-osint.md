---
title: "Passive Recon & OSINT — Mapeando o Alvo Sem Fazer Ruído"
date: 2025-01-07
description: "Técnicas de reconhecimento passivo e OSINT para mapear infraestrutura, funcionários e superfície de ataque antes de qualquer engajamento ativo."
category: recon
os: [linux, windows, macos]
difficulty: easy
mitre_tactic: TA0043
mitre_technique: T1596
tags: [osint, recon, passive, shodan, theHarvester, amass, google-dorks]
status: published
lang: pt
readingTime: 12
---

## O que é Reconhecimento Passivo?

Reconhecimento passivo é a fase de coleta de inteligência onde o operador **nunca interage diretamente** com a infraestrutura do alvo. Toda informação é obtida através de fontes abertas (OSINT — Open Source Intelligence) ou intermediários públicos.

A vantagem crítica: **zero logs no alvo**. Nenhum IDS, WAF ou SIEM do cliente verá sua atividade.

> **Regra de ouro:** quanto mais você sabe antes de tocar a rede, menor sua superfície de exposição durante o engajamento ativo.

---

## Fase 1 — Footprinting de Domínio

### WHOIS e Registros DNS

```bash
# Informações de registro do domínio
whois target.com

# Consultas DNS fundamentais
dig target.com ANY
dig target.com MX
dig target.com NS
dig target.com TXT

# Zone transfer (frequentemente bloqueado, mas vale tentar)
dig axfr @ns1.target.com target.com

# Subdomínios via certificate transparency
curl -s "https://crt.sh/?q=%.target.com&output=json" \
  | jq -r '.[].name_value' \
  | sort -u
```

### Amass — Enumeração de Subdomínios

[Amass](https://github.com/owasp-amass/amass) é a ferramenta de referência para enumeração passiva de subdomínios. Agrega dezenas de fontes públicas.

```bash
# Instalação
go install -v github.com/owasp-amass/amass/v4/...@master

# Enumeração passiva pura (sem brute-force)
amass enum -passive -d target.com -o amass_output.txt

# Com todas as fontes de dados (requer API keys)
amass enum -passive -d target.com \
  -config ~/.config/amass/config.ini \
  -o subdomains.txt

# Visualização do grafo de ativos
amass viz -d3 -d target.com -o graph.html
```

### Subfinder — Rápido e Silencioso

```bash
# Instalação
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest

# Enumeração passiva
subfinder -d target.com -all -recursive -o subfinder_out.txt

# Com resolução automática
subfinder -d target.com -all | dnsx -silent
```

---

## Fase 2 — Google Dorks

Google Dorks são operadores de busca avançados que revelam informações sensíveis indexadas acidentalmente.

### Dorks Essenciais

```bash
# Subdomínios e hosts relacionados
site:target.com

# Excluindo o domínio principal (revela subdomínios)
site:target.com -www

# Arquivos sensíveis expostos
site:target.com filetype:pdf
site:target.com filetype:xls OR filetype:xlsx
site:target.com filetype:sql
site:target.com filetype:env
site:target.com filetype:log

# Painéis de administração
site:target.com inurl:admin
site:target.com inurl:login
site:target.com inurl:dashboard
site:target.com intitle:"index of"

# Credenciais e configs vazadas
site:target.com intext:"password"
site:target.com ext:conf OR ext:config OR ext:cfg
site:target.com ext:bak OR ext:backup OR ext:old

# Tecnologia exposta
site:target.com intext:"powered by"
site:target.com intext:"phpMyAdmin"

# Endpoints de API
site:target.com inurl:/api/
site:target.com inurl:/v1/ OR inurl:/v2/
```

### Automatizando com gowitness

```bash
# Screenshot de todos os subdomínios encontrados
cat subdomains.txt | gowitness file -f - --screenshot-path ./screenshots/
gowitness report serve
```

---

## Fase 3 — Shodan & Censys

Motores de busca para dispositivos e serviços expostos na internet.

### Shodan

```bash
# Instalação do CLI
pip install shodan
shodan init YOUR_API_KEY

# Busca por organização
shodan search "org:\"Target Company\""

# Filtrando por ASN
shodan search "asn:AS12345"

# Serviços específicos expostos
shodan search "hostname:target.com port:22"
shodan search "hostname:target.com http.title:\"Dashboard\""

# Vulnerabilidades conhecidas na infra
shodan search "org:\"Target\" vuln:CVE-2021-44228"

# Download completo dos resultados
shodan download --limit 1000 results.json.gz "org:\"Target Company\""
shodan parse results.json.gz --fields ip_str,port,hostnames,vulns
```

### Queries Shodan Úteis

| Query | O que Encontra |
|-------|---------------|
| `org:"Target" http.title:"Jenkins"` | Servidores Jenkins expostos |
| `org:"Target" product:"Apache Tomcat"` | Tomcat sem autenticação |
| `org:"Target" http.favicon.hash:-1616143106` | GitLab instances |
| `org:"Target" port:3389` | RDP exposto |
| `org:"Target" ssl.cert.subject.cn:"*.target.com"` | Certificados wildcard |
| `org:"Target" "220" "230 Login"` | FTP anônimo ativo |

### Censys

```bash
# API via Python
pip install censys

# Busca de hosts por certificado
python3 - <<'EOF'
from censys.search import CensysHosts
h = CensysHosts()
query = "parsed.names: target.com and services.tls.certificates.leaf_data.subject.organization: \"Target\""
for hit in h.search(query, pages=3):
    print(hit["ip"], hit.get("services"))
EOF
```

---

## Fase 4 — theHarvester

Coleta emails, nomes, hosts e IPs de fontes públicas.

```bash
# Instalação
git clone https://github.com/laramies/theHarvester
cd theHarvester && pip3 install -r requirements/base.txt

# Coleta básica com múltiplas fontes
python3 theHarvester.py \
  -d target.com \
  -b google,bing,linkedin,hunter,anubis,crtsh \
  -l 500 \
  -f report_target

# Apenas emails (para phishing / password spraying)
python3 theHarvester.py \
  -d target.com \
  -b linkedin,hunter,google \
  -l 200 | grep -E "^[a-zA-Z0-9._%+-]+@"
```

---

## Fase 5 — Reconhecimento de Pessoas

### LinkedIn OSINT

Identificar funcionários, cargos e tecnologias usadas.

```bash
# Via Google Dorks
site:linkedin.com/in "Target Company" "Security Engineer"
site:linkedin.com/in "Target Company" "DevOps"
site:linkedin.com/in "Target Company" "Active Directory"

# Ferramentas
pip install linkedin2username
python3 linkedin2username.py -u YOUR_EMAIL -c "Target Company"
```

### Email Format Discovery

```bash
# Hunter.io CLI
curl "https://api.hunter.io/v2/domain-search?domain=target.com&api_key=KEY" \
  | jq '.data.pattern'
# Exemplo de output: "{first}.{last}@target.com"

# Verificação de emails com h8mail
pip install h8mail
h8mail -t emails.txt --breach-src haveibeenpwned
```

---

## Fase 6 — Análise de Código Público

Repositórios públicos frequentemente contêm credenciais, tokens e infraestrutura interna acidentalmente commitados.

```bash
# GitHub Dorks — busca direto no site
# org:target-company password
# org:target-company secret
# org:target-company api_key
# org:target-company internal

# Trufflehog — varredura de histórico git
pip install trufflehog
trufflehog github --org=target-company --only-verified

# GitLeaks — scan de repositórios
docker run -v $(pwd):/path zricethezav/gitleaks:latest \
  detect --source=/path --report-format json

# Greps específicos em repos clonados
git clone https://github.com/target/public-repo
cd public-repo
grep -rE "(password|passwd|secret|token|api_key|aws_access)" .
grep -rE "(https?://[^/]+:[^@]+@)" .  # URLs com credenciais
```

---

## Fase 7 — Análise de Tecnologia Web

```bash
# WhatWeb — fingerprinting passivo via histórico/cache
whatweb -a 1 https://target.com  # stealth mode

# BuiltWith API
curl "https://api.builtwith.com/v21/api.json?KEY=YOUR_KEY&LOOKUP=target.com" \
  | jq '.Results[].Result.Paths[].Technologies[].Name'

# Wappalyzer CLI
npm install -g wappalyzer
wappalyzer https://target.com

# Wayback Machine — versões antigas do site
curl "http://web.archive.org/cdx/search/cdx?url=*.target.com/*&output=text&fl=original&collapse=urlkey" \
  | sort -u | head -100
```

---

## Consolidando a Inteligência

Organize tudo em uma estrutura antes de partir para o reconhecimento ativo:

```
target-intel/
├── domains/
│   ├── subdomains.txt       # todos os subdomains descobertos
│   ├── dns_records.txt      # registros MX, TXT, NS
│   └── whois.txt
├── ips/
│   ├── ip_ranges.txt        # CIDRs do alvo
│   └── shodan_results.json
├── people/
│   ├── employees.txt        # nomes e cargos
│   ├── emails.txt           # emails coletados
│   └── email_format.txt     # padrão do formato
├── tech/
│   ├── stack.txt            # tecnologias identificadas
│   └── certificates.txt     # certs SSL encontrados
├── credentials/
│   └── leaked_creds.txt     # vazamentos em breaches
└── code/
    └── github_findings.txt  # achados em repos públicos
```

```bash
#!/bin/bash
# passive_recon.sh — Pipeline completo de recon passivo
DOMAIN="${1:?Usage: $0 <domain>}"
OUTPUT="./intel/${DOMAIN}"
mkdir -p "${OUTPUT}"/{domains,ips,people,tech}

echo "[*] Starting passive recon for: ${DOMAIN}"

# Subdomains
echo "[+] Enumerating subdomains..."
subfinder -d "${DOMAIN}" -all -silent > "${OUTPUT}/domains/subfinder.txt"
amass enum -passive -d "${DOMAIN}" >> "${OUTPUT}/domains/amass.txt"
cat "${OUTPUT}/domains/subfinder.txt" "${OUTPUT}/domains/amass.txt" \
  | sort -u > "${OUTPUT}/domains/all_subdomains.txt"
echo "    $(wc -l < "${OUTPUT}/domains/all_subdomains.txt") unique subdomains"

# DNS
echo "[+] Pulling DNS records..."
dig "${DOMAIN}" ANY +short > "${OUTPUT}/domains/dns.txt"
curl -s "https://crt.sh/?q=%.${DOMAIN}&output=json" \
  | jq -r '.[].name_value' | sort -u >> "${OUTPUT}/domains/all_subdomains.txt"

# Emails
echo "[+] Harvesting emails..."
python3 theHarvester.py -d "${DOMAIN}" -b google,hunter -l 200 \
  | grep -E "@${DOMAIN}" | sort -u > "${OUTPUT}/people/emails.txt"

echo "[✓] Recon complete. Output: ${OUTPUT}"
```

---

## Mitigações (Blue Team)

| Vetor | Mitigação |
|-------|-----------|
| Google Dorks | Google Search Console — remover URLs sensíveis do índice |
| WHOIS | Usar privacidade de domínio (WHOIS Privacy) |
| Certificate Transparency | Inevitável — use subdomains genéricos |
| Shodan | Firewalls com regras de não-scan; `X-Robots-Tag: noindex` |
| GitHub leaks | Pre-commit hooks + secret scanning ativo |
| LinkedIn OSINT | Limitar informações de tecnologia em perfis públicos |

> **Nota legal:** Estas técnicas devem ser utilizadas exclusivamente em engajamentos autorizados ou para fins educacionais. O uso não autorizado é ilegal.