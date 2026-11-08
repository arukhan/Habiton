# Non-destructive local smoke test. Run from project root after Docker starts.
$ErrorActionPreference = 'Stop'
Write-Host 'Habiton services:' -ForegroundColor Cyan
docker compose ps
Write-Host 'Backend health:' -ForegroundColor Cyan
Invoke-RestMethod -Uri 'http://localhost:8080/api/health' | ConvertTo-Json
Write-Host 'Frontend HTTP status:' -ForegroundColor Cyan
(Invoke-WebRequest -Uri 'http://localhost:3000/login' -UseBasicParsing).StatusCode
Write-Host 'Now log in as demo@habiton.local and test Recovery in your browser.' -ForegroundColor Green
