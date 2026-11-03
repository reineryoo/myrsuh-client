# Keep UTF-8 with BOM: Windows PowerShell 5.1 needs it for Russian text.
param([switch]$NoBrowser, [switch]$SmokeTest, [switch]$Lan)
$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$pythonPath = Join-Path $projectRoot '.venv\Scripts\python.exe'
$vitePath = Join-Path $projectRoot 'frontend\node_modules\vite\bin\vite.js'
if (!(Test-Path -LiteralPath $pythonPath) -or !(Test-Path -LiteralPath $vitePath)) {
    throw 'Сначала установите зависимости по инструкции README.md.'
}
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else {
    Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
}
if (!(Test-Path -LiteralPath $nodePath)) {
    throw 'Не найден Node.js. Установите Node.js 22.12 или новее и повторите запуск.'
}
$frontendHost = '127.0.0.1'
if ($Lan) {
    $lanCandidates = @(
        foreach ($adapter in [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()) {
            if ($adapter.OperationalStatus -ne 'Up' -or
                $adapter.NetworkInterfaceType -notin @('Wireless80211', 'Ethernet') -or
                $adapter.Description -match 'VMware|Hyper-V|Virtual|VPN|TAP|TUN|Loopback|WAN Miniport') { continue }
            $properties = $adapter.GetIPProperties()
            foreach ($unicast in $properties.UnicastAddresses) {
                $address = $unicast.Address.IPAddressToString
                if ($unicast.Address.AddressFamily -eq 'InterNetwork' -and
                    $address -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)') {
                    [pscustomobject]@{
                        Address = $address
                        Interface = $adapter.Name
                        Wireless = $adapter.NetworkInterfaceType -eq 'Wireless80211'
                        Gateway = $properties.GatewayAddresses.Count -gt 0
                    }
                }
            }
        }
    )
    $lanAdapter = $lanCandidates | Sort-Object -Property @{Expression='Wireless';Descending=$true}, @{Expression='Gateway';Descending=$true} | Select-Object -First 1
    if (!$lanAdapter) { throw 'Не найден локальный адрес Wi-Fi или Ethernet. Подключите компьютер и телефон к одной сети.' }
    $frontendHost = $lanAdapter.Address
}
$frontendUrl = 'http://{0}:5173/' -f $frontendHost
$logRoot = Join-Path $projectRoot '.logs'
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
foreach ($port in @(8000, 5173)) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        throw "Порт $port уже занят. Остановите предыдущий запуск или используйте ручной запуск из README."
    }
}
$backendProcess = $null
$frontendProcess = $null
try {
    $backendProcess = Start-Process -FilePath $pythonPath -ArgumentList @('-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8000') -WorkingDirectory (Join-Path $projectRoot 'backend') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logRoot 'backend.out.log') -RedirectStandardError (Join-Path $logRoot 'backend.err.log')
    $frontendProcess = Start-Process -FilePath $nodePath -ArgumentList @(('"' + $vitePath + '"'),'--host',$frontendHost) -WorkingDirectory (Join-Path $projectRoot 'frontend') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logRoot 'frontend.out.log') -RedirectStandardError (Join-Path $logRoot 'frontend.err.log')
    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        if ($backendProcess.HasExited -or $frontendProcess.HasExited) { throw 'Сервер завершился. Подробности — в папке .logs.' }
        try {
            $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/health' -TimeoutSec 1
            $page = Invoke-WebRequest -Uri $frontendUrl -TimeoutSec 1 -UseBasicParsing
            if ($health.status -eq 'ok' -and $page.StatusCode -eq 200) { $ready = $true; break }
        } catch { Start-Sleep -Milliseconds 750 }
    }
    if (!$ready) { throw 'Серверы не успели запуститься. Проверьте .logs и доступ к интернету.' }
    $apiHealth = Invoke-RestMethod -Uri ($frontendUrl + 'api/health') -TimeoutSec 5
    if ($apiHealth.status -ne 'ok') { throw 'Не работает соединение интерфейса с backend. Проверьте .logs.' }
    Write-Host ('MyRSUH: ' + $frontendUrl) -ForegroundColor Cyan
    if ($Lan) {
        Write-Host ('С телефона в той же Wi-Fi сети: ' + $frontendUrl) -ForegroundColor Green
        Write-Host ('Сетевой адаптер: ' + $lanAdapter.Interface)
    }
    Write-Host 'Для остановки нажмите Ctrl+C. Журналы запуска — в .logs.'
    if ($SmokeTest) { Write-Host 'Проверка запуска пройдена.'; return }
    if (!$NoBrowser) { Start-Process $frontendUrl }
    while (!$backendProcess.HasExited -and !$frontendProcess.HasExited) { Start-Sleep -Milliseconds 500 }
} finally {
    foreach ($ownedProcess in @($backendProcess, $frontendProcess)) {
        if ($null -ne $ownedProcess -and !$ownedProcess.HasExited) { Stop-Process -Id $ownedProcess.Id -ErrorAction SilentlyContinue }
    }
}
