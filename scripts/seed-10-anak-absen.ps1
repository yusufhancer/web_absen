param(
    [string]$BaseUrl = "http://localhost/rasya-pjbl/web-absen",
    [string]$Password = "test12345",
    [int]$ClassId = 2,
    [switch]$SkipVerify
)

$ErrorActionPreference = "Stop"

$BaseUrl = $BaseUrl.TrimEnd("/")
$Students = @(
    @{ Nis = "2599001"; Name = "Test Anak 01"; AbsenNumber = 1; Status = "hadir" },
    @{ Nis = "2599002"; Name = "Test Anak 02"; AbsenNumber = 2; Status = "hadir" },
    @{ Nis = "2599003"; Name = "Test Anak 03"; AbsenNumber = 3; Status = "hadir" },
    @{ Nis = "2599004"; Name = "Test Anak 04"; AbsenNumber = 4; Status = "izin" },
    @{ Nis = "2599005"; Name = "Test Anak 05"; AbsenNumber = 5; Status = "hadir" },
    @{ Nis = "2599006"; Name = "Test Anak 06"; AbsenNumber = 6; Status = "sakit" },
    @{ Nis = "2599007"; Name = "Test Anak 07"; AbsenNumber = 7; Status = "hadir" },
    @{ Nis = "2599008"; Name = "Test Anak 08"; AbsenNumber = 8; Status = "hadir" },
    @{ Nis = "2599009"; Name = "Test Anak 09"; AbsenNumber = 9; Status = "izin" },
    @{ Nis = "2599010"; Name = "Test Anak 10"; AbsenNumber = 10; Status = "hadir" }
)

function Read-ApiError {
    param([object]$ErrorRecord)

    $detail = $ErrorRecord.ErrorDetails.Message
    if (-not [string]::IsNullOrWhiteSpace($detail)) {
        try {
            $json = $detail | ConvertFrom-Json
            if ($json.message) {
                return [string]$json.message
            }
        }
        catch {
            return $detail
        }
    }

    $response = $ErrorRecord.Exception.Response
    if ($null -eq $response) {
        return $ErrorRecord.Exception.Message
    }

    try {
        $stream = $response.GetResponseStream()
        $reader = [System.IO.StreamReader]::new($stream)
        $body = $reader.ReadToEnd()
        if ([string]::IsNullOrWhiteSpace($body)) {
            return $ErrorRecord.Exception.Message
        }

        $json = $body | ConvertFrom-Json
        if ($json.message) {
            return [string]$json.message
        }

        return $body
    }
    catch {
        return $ErrorRecord.Exception.Message
    }
}

function Invoke-Api {
    param(
        [ValidateSet("GET", "POST")]
        [string]$Method,
        [string]$Path,
        [object]$Body = $null,
        [Microsoft.PowerShell.Commands.WebRequestSession]$Session
    )

    $params = @{
        Method      = $Method
        Uri         = "$BaseUrl$Path"
        WebSession  = $Session
        ContentType = "application/json"
    }

    if ($null -ne $Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 5)
    }

    Invoke-RestMethod @params
}

$created = 0
$alreadyRegistered = 0
$submitted = 0
$alreadyAbsent = 0
$failed = 0

Write-Host "Seed 10 anak kelas X PPLG 2"
Write-Host "Base URL: $BaseUrl"
Write-Host ""

foreach ($student in $Students) {
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $label = "$($student.Nis) - $($student.Name)"

    try {
        try {
            Invoke-Api -Method POST -Path "/api/auth/register.php" -Session $session -Body @{
                nis      = $student.Nis
                name     = $student.Name
                password = $Password
                class_id = $ClassId
            } | Out-Null

            $created++
            Write-Host "REGISTER ok      -> $label"
        }
        catch {
            $message = Read-ApiError $_
            if ($message -like "*NIS sudah terdaftar*") {
                $alreadyRegistered++
                Write-Host "REGISTER exists  -> $label"
            }
            else {
                throw
            }
        }

        Invoke-Api -Method POST -Path "/api/auth/login.php" -Session $session -Body @{
            nis      = $student.Nis
            password = $Password
            role     = "pelajar"
        } | Out-Null
        Write-Host "LOGIN ok         -> $label"

        try {
            Invoke-Api -Method POST -Path "/api/attendances/create.php" -Session $session -Body @{
                absen_number   = $student.AbsenNumber
                status         = $student.Status
                kata_hari_ini  = "Test absen anak {0:00}" -f $student.AbsenNumber
            } | Out-Null

            $submitted++
            Write-Host "ABSEN ok         -> $label ($($student.Status))"
        }
        catch {
            $message = Read-ApiError $_
            if ($message -like "*Sudah absen hari ini*") {
                $alreadyAbsent++
                Write-Host "ABSEN exists     -> $label"
            }
            else {
                throw
            }
        }
    }
    catch {
        $failed++
        Write-Host "FAILED           -> $label :: $(Read-ApiError $_)"
    }

    Write-Host ""
}

Write-Host "Summary"
Write-Host "Created accounts       : $created"
Write-Host "Existing accounts      : $alreadyRegistered"
Write-Host "Submitted attendances  : $submitted"
Write-Host "Already absent today   : $alreadyAbsent"
Write-Host "Failed                 : $failed"

if (-not $SkipVerify) {
    Write-Host ""
    Write-Host "Verification as guru G002"

    try {
        $teacherSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
        Invoke-Api -Method POST -Path "/api/auth/login.php" -Session $teacherSession -Body @{
            nis      = "G002"
            password = "guru123"
            role     = "guru"
        } | Out-Null

        $pending = Invoke-Api -Method GET -Path "/api/attendances/pending.php" -Session $teacherSession
        $leaderboard = Invoke-Api -Method GET -Path "/api/leaderboard/today.php" -Session $teacherSession

        $testNis = $Students | ForEach-Object { $_.Nis }
        $pendingItems = @($pending.items | Where-Object { $testNis -contains $_.nis })
        $leaderboardItems = @($leaderboard.items | Where-Object { $testNis -contains $_.nis })

        Write-Host "Pending test items     : $($pendingItems.Count)"
        Write-Host "Leaderboard test items : $($leaderboardItems.Count)"

        if ($pendingItems.Count -ne 10) {
            Write-Host "WARN pending expected 10, got $($pendingItems.Count)"
        }

        if ($leaderboardItems.Count -ne 0) {
            Write-Host "WARN leaderboard expected 0 pending test items, got $($leaderboardItems.Count)"
        }
    }
    catch {
        Write-Host "VERIFY failed          : $(Read-ApiError $_)"
    }
}
