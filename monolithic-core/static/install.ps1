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

$ZipUrl = "$ServerUrl/static/agent.zip"
$ZipPath = Join-Path $AgentDir "agent.zip"
Write-Host "Downloading fat agent package..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipPath

Write-Host "Extracting agent package..." -ForegroundColor Cyan
Expand-Archive -Path $ZipPath -DestinationPath $AgentDir -Force
Remove-Item $ZipPath

$ConfigPath = Join-Path $AgentDir "probe_config.json"
Write-Host "Saving configuration for Probe ID: $ProbeID..." -ForegroundColor Cyan
$Config = @{
    probe_id = $ProbeID
    server_url = $ServerUrl
    central_server_url = $ServerUrl
}
$Config | ConvertTo-Json | Set-Content $ConfigPath

Write-Host "Installing dependencies..." -ForegroundColor Cyan
Push-Location $AgentDir
pip install -r requirements.txt
Pop-Location

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "✅ Network Monitor Fat Agent Installed Successfully!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "Probe ID: $ProbeID"
Write-Host "Installed at: $AgentDir"
Write-Host ""
Write-Host "To start the agent, run the following command:" -ForegroundColor Cyan
Write-Host ""
Write-Host "python `"$AgentDir\main.py`"" -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Green
