param(
    [string]$BaseUrl = "http://localhost:8791",
    [string]$PeerId = "cyberpeer"
)

$ErrorActionPreference = "Stop"

$uri = "$BaseUrl/readiness/chamber/$PeerId"
$result = Invoke-RestMethod -Uri $uri -Method Get

Write-Host "CyberPeer Chamber Readiness"
Write-Host "Peer: $($result.peer_id)"
Write-Host "Write path: $($result.write_path)"
Write-Host "Ready: $($result.ok)"
Write-Host ""

Write-Host "Tensor distribution:"
$result.tensor_distribution.PSObject.Properties | ForEach-Object {
    Write-Host ("  {0}: {1}" -f $_.Name, $_.Value)
}

Write-Host ""
Write-Host "Gates:"
$result.gates.PSObject.Properties | ForEach-Object {
    Write-Host ("  {0}: {1}" -f $_.Name, $_.Value)
}

if (-not $result.ok) {
    Write-Host ""
    Write-Host "Blockers:"
    $result.blockers | ForEach-Object {
        Write-Host "  - $_"
    }
    exit 1
}

exit 0
