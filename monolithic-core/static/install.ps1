param (
    [Parameter(Mandatory=$true)]
    [string]$ProbeID,
    
    [string]$ServerUrl = "https://network-monitoring-2-0.onrender.com"
)

$AgentDir = Join-Path $env:USERPROFILE "NetworkMonitorAgent"

if (Test-Path $AgentDir) {
    Write-Host "Cleaning up previous installation..." -ForegroundColor Yellow
    Remove-Item -Path "$AgentDir\*" -Recurse -Force
} else {
    Write-Host "Creating agent directory at $AgentDir..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $AgentDir -Force | Out-Null
}

$ExeUrl = "$ServerUrl/static/agent.exe"
$ExePath = Join-Path $AgentDir "agent.exe"
Write-Host "Downloading standalone agent executable..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $ExeUrl -OutFile $ExePath

$ConfigPath = Join-Path $AgentDir "probe_config.json"
Write-Host "Saving configuration for Probe ID: $ProbeID..." -ForegroundColor Cyan
$Config = @{
    probe_id = $ProbeID
    server_url = $ServerUrl
    central_server_url = $ServerUrl
}
$Config | ConvertTo-Json | Set-Content $ConfigPath

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "✅ Network Monitor Fat Agent Installed Successfully!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "Probe ID: $ProbeID"
Write-Host "Installed at: $AgentDir"
Write-Host ""
Write-Host "Start the agent by running:" -ForegroundColor Cyan
Write-Host ""
Write-Host "& `"$AgentDir\agent.exe`"" -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Green
