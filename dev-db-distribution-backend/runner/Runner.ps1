param(
    [Parameter(Mandatory = $false)]
    [string]$ConfigPath = (Join-Path -Path $PSScriptRoot -ChildPath "..\scripts\runner-config.json")
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -Path $ConfigPath)) {
    $sample = Join-Path -Path $PSScriptRoot -ChildPath "..\scripts\runner-config.sample.json"
    if (Test-Path -Path $sample) {
        Write-Warning "Config file not found; using sample config at $sample"
        $ConfigPath = $sample
    } else {
        throw "Configuration file not found at $ConfigPath"
    }
}

function Resolve-Config {
    param([string]$Path)
    $raw = Get-Content -Path $Path -Raw
    return $raw | ConvertFrom-Json
}

function New-BlobPath {
    param([string]$Prefix, [string]$ServerDns, [string]$Database, [string]$Ticket)
    $utcNow = Get-Date -AsUTC
    $year = $utcNow.ToString("yyyy")
    $month = $utcNow.ToString("MM")
    $day = $utcNow.ToString("dd")
    $timestamp = $utcNow.ToString("yyyyMMdd_HHmm")

    function Sanitize([string]$Value) {
        return ($Value -replace "[^a-zA-Z0-9._-]", "_")
    }

    $serverSegment = Sanitize $ServerDns
    $dbSegment = Sanitize $Database
    $ticketSegment = Sanitize $Ticket

    return "$Prefix/$serverSegment/$dbSegment/$year/$month/$day/$ticketSegment/db_full_${dbSegment}_$timestamp.bak"
}

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Url,
        [object]$Body = $null,
        [hashtable]$Headers
    )

    if ($null -ne $Body) {
        $json = $Body | ConvertTo-Json -Depth 6
        return Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers -ContentType "application/json" -Body $json -ErrorAction Stop
    }

    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers -ErrorAction Stop
}

$config = Resolve-Config -Path $ConfigPath
$apiBase = ($config.apiBase.TrimEnd('/'))
$headers = @{ Authorization = "Bearer $($config.apiToken)" }
$serverDns = $config.serverDns
$uploadPrefix = $config.containerPrefix
$localBackupDir = $config.localBackupDir
$azCopyPath = $config.azCopyPath
$sqlInstance = $config.sqlInstance
$cleanup = [bool]$config.cleanupAfterUpload

if (-not (Test-Path -Path $localBackupDir)) {
    New-Item -ItemType Directory -Path $localBackupDir -Force | Out-Null
}

while ($true) {
    $job = $null
    try {
        $nextUrl = "$apiBase/api/jobs/next?serverDns=$serverDns"
        $nextResponse = $null
        try {
            $nextResponse = Invoke-Api -Method "GET" -Url $nextUrl -Headers $headers
        } catch {
            Write-Warning "Failed to contact API for next job: $($_.Exception.Message)"
            Start-Sleep -Seconds 15
            continue
        }

        if (-not $nextResponse -or -not $nextResponse.data) {
            Start-Sleep -Seconds 15
            continue
        }

        $job = $nextResponse.data
        Write-Host "Processing job $($job.id) for database $($job.database)"

        $patchUrl = "$apiBase/api/jobs/$($job.id)"
        Invoke-Api -Method "PATCH" -Url $patchUrl -Headers $headers -Body @{ status = "RUNNING" } | Out-Null

        $blobPath = New-BlobPath -Prefix $uploadPrefix -ServerDns $job.server -Database $job.database -Ticket $job.ticket
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backupFileName = "${serverDns}_${($job.database -replace '[^a-zA-Z0-9_-]', '_')}_$timestamp.bak"
        $backupFilePath = Join-Path -Path $localBackupDir -ChildPath $backupFileName

        $sqlQuery = "BACKUP DATABASE [$($job.database)] TO DISK=N'$backupFilePath' WITH COPY_ONLY, COMPRESSION, STATS=10"
        Write-Host "Starting backup to $backupFilePath"
        & sqlcmd -S $sqlInstance -Q $sqlQuery -b
        if ($LASTEXITCODE -ne 0) {
            throw "sqlcmd exited with code $LASTEXITCODE"
        }

        if (-not (Test-Path -Path $backupFilePath)) {
            throw "Backup file not created at $backupFilePath"
        }

        $hash = (Get-FileHash -Path $backupFilePath -Algorithm SHA256).Hash.ToLower()
        Write-Host "SHA-256: $hash"

        $uploadResponse = Invoke-Api -Method "PATCH" -Url $patchUrl -Headers $headers -Body @{ status = "RUNNING"; blobPath = $blobPath }
        if (-not $uploadResponse.destUrl) {
            throw "Upload SAS URL missing in response"
        }
        $destUrl = $uploadResponse.destUrl

        Write-Host "Uploading with AzCopy"
        & "$azCopyPath" copy $backupFilePath $destUrl --from-to=LocalBlob --overwrite=ifSourceNewer --check-md5=FailIfDifferent
        if ($LASTEXITCODE -ne 0) {
            throw "AzCopy exited with code $LASTEXITCODE"
        }

        $completeBody = @{
            status = "COMPLETED"
            blobPath = $blobPath
            sha256 = $hash
            completedAt = (Get-Date).ToUniversalTime().ToString("o")
        }
        Invoke-Api -Method "PATCH" -Url $patchUrl -Headers $headers -Body $completeBody | Out-Null
        Write-Host "Job $($job.id) marked as completed"

        if ($cleanup -and (Test-Path -Path $backupFilePath)) {
            Remove-Item -Path $backupFilePath -ErrorAction SilentlyContinue
        }
    } catch {
        $err = $_.Exception.Message
        Write-Error "Job processing failed: $err"
        if ($job -and $job.id) {
            try {
                $failUrl = "$apiBase/api/jobs/$($job.id)"
                Invoke-Api -Method "PATCH" -Url $failUrl -Headers $headers -Body @{ status = "FAILED"; error = $err } | Out-Null
            } catch {
                Write-Warning "Failed to report job failure: $($_.Exception.Message)"
            }
        }
        Start-Sleep -Seconds 10
    }
}
