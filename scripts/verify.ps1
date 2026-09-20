# 统一验证入口：Agent 改动后必须执行
# 用法：
#   powershell -ExecutionPolicy Bypass -File scripts/verify.ps1 -Scope quick|commit|ci
#   quick  : 前端 tsc --noEmit + 后端 compile + 文档防腐（迭代中）
#   commit : quick + 前端 build + 后端 test（提交前）；通过后刷新 spec 元数据
#   ci     : commit + E2E（预留）

param(
    [ValidateSet("quick", "commit", "ci")]
    [string]$Scope = "quick"
)

$ErrorActionPreference = "Continue"
$root = $PSScriptRoot | Split-Path
$script:failed = 0
$script:failItems = @()
$startedAt = Get-Date

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    [PASS] $msg" -ForegroundColor Green }
function Write-Bad($msg)  {
    Write-Host "    [FAIL] $msg" -ForegroundColor Red
    $script:failed = $script:failed + 1
    $script:failItems = $script:failItems + @($msg)
}

# ---------- 前端 ----------
if (Test-Path "$root/frontend/package.json") {
    if (-not (Test-Path "$root/frontend/node_modules")) {
        Write-Bad "frontend/node_modules 不存在，请先: cd frontend; npm install"
    }
    else {
        Write-Step "前端 tsc --noEmit"
        Push-Location "$root/frontend"
        npm run typecheck 2>&1 | Select-Object -Last 15 | Write-Host
        if ($LASTEXITCODE -eq 0) { Write-Ok "tsc" } else { Write-Bad "tsc" }

        if ($Scope -ne "quick") {
            Write-Step "前端 vite build"
            npm run build 2>&1 | Select-Object -Last 15 | Write-Host
            if ($LASTEXITCODE -eq 0) { Write-Ok "build" } else { Write-Bad "build" }
        }
        Pop-Location
    }
}
else {
    Write-Host "    [SKIP] frontend 未初始化" -ForegroundColor Yellow
}

# ---------- 后端 ----------
if (Test-Path "$root/backend/pom.xml") {
    $mvn = Get-Command mvn -ErrorAction SilentlyContinue
    if (-not $mvn) {
        Write-Host "    [SKIP] 未找到 mvn（后端验证跳过）" -ForegroundColor Yellow
    }
    else {
        Write-Step "后端 mvn compile"
        Push-Location "$root/backend"
        mvn -q compile 2>&1 | Select-Object -Last 15 | Write-Host
        if ($LASTEXITCODE -eq 0) { Write-Ok "compile" } else { Write-Bad "compile" }

        if ($Scope -ne "quick") {
            Write-Step "后端 mvn test"
            mvn -q test 2>&1 | Select-Object -Last 15 | Write-Host
            if ($LASTEXITCODE -eq 0) { Write-Ok "test" } else { Write-Bad "test" }
        }
        Pop-Location
    }
}
else {
    Write-Host "    [SKIP] backend 未初始化" -ForegroundColor Yellow
}

# ---------- E2E（预留） ----------
if ($Scope -eq "ci") {
    Write-Host "`n==> [SKIP] E2E 未配置（M2 接入 Playwright）" -ForegroundColor Yellow
}

# ---------- 文档防腐（缺口1：验证 spec 声明与仓库实态一致） ----------
Write-Step "文档防腐检查（AGENTS.md 声明路径 / spec 完整性）"
$declaredDirs = @(
    "frontend/src/routes", "frontend/src/layouts", "frontend/src/components",
    "frontend/src/stores", "frontend/src/pages", "frontend/src/api",
    "backend/src/main/java/com/mdviewer/portal",
    "backend/src/main/java/com/mdviewer/admin",
    "backend/src/main/java/com/mdviewer/auth",
    "backend/src/main/java/com/mdviewer/domain",
    "backend/src/main/java/com/mdviewer/common",
    "backend/src/main/java/com/mdviewer/config",
    "backend/src/main/java/com/mdviewer/sync",
    "docs", ".agent/specs", ".agent/skills", "scripts", "sql"
)
foreach ($d in $declaredDirs) {
    if (-not (Test-Path "$root/$d")) { Write-Bad "文档防腐: 声明的目录缺失 $d" }
}
foreach ($skill in @("add-portal-page", "add-admin-api", "verify-workflow")) {
    if (-not (Test-Path "$root/.agent/skills/$skill/SKILL.md")) { Write-Bad "文档防腐: skill 缺失 $skill" }
}
$specDirs = Get-ChildItem "$root/.agent/specs" -Directory | Where-Object { $_.Name -ne "_template" }
foreach ($sd in $specDirs) {
    foreach ($f in @("spec.md", "tasks.md", "acceptance.md")) {
        if (-not (Test-Path "$($sd.FullName)/$f")) { Write-Bad "文档防腐: spec 三件套不完整 $($sd.Name)/$f" }
    }
}
if ($script:failed -eq 0) { Write-Ok "docs-drift" }

# ---------- 防腐审计回写（缺口3：通过后刷新 active spec 元数据） ----------
if ($Scope -ne "quick" -and $script:failed -eq 0) {
    $today = Get-Date -Format "yyyy-MM-dd"
    foreach ($sd in $specDirs) {
        $specFile = Join-Path $sd.FullName "spec.md"
        if (-not (Test-Path $specFile)) { continue }
        $lines = Get-Content $specFile -Encoding UTF8
        $isActive = $false
        foreach ($ln in $lines) {
            if ($ln -like "*status:*active*") { $isActive = $true }
        }
        if (-not $isActive) { continue }
        $out = New-Object System.Collections.Generic.List[string]
        foreach ($ln in $lines) {
            if ($ln.StartsWith("| created_at / last_verified_at")) {
                $out.Add("| created_at / last_verified_at | $today |")
            }
            else {
                $out.Add($ln)
            }
        }
        Set-Content $specFile $out -Encoding UTF8
    }
    Write-Ok "spec last_verified_at refreshed"
}

# ---------- 度量流水（缺口4：追加 JSONL 供复盘） ----------
$metricsDir = "$root/.agent/metrics"
if (-not (Test-Path $metricsDir)) { New-Item -ItemType Directory -Path $metricsDir | Out-Null }
$duration = [int]((Get-Date) - $startedAt).TotalSeconds
$pass = $script:failed -eq 0
$tsStr = $startedAt.ToString("yyyy-MM-ddTHH:mm:ss")
$failJson = "[]"
if ($script:failItems.Count -gt 0) { $failJson = $script:failItems | ConvertTo-Json -Compress -AsArray }
$logLine = '{"ts":"' + $tsStr + '","scope":"' + $Scope + '","pass":' + $pass.ToString().ToLower() + ',"duration":' + $duration + ',"failures":' + $failJson + '}'
Add-Content "$metricsDir/verify-log.jsonl" $logLine -Encoding UTF8

# ---------- 汇总 ----------
Write-Host "`n================================" -ForegroundColor Cyan
if ($script:failed -eq 0) {
    Write-Host "VERIFY [$Scope] : ALL PASS" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "VERIFY [$Scope] : $($script:failed) 项失败，请依据上方首个错误修复" -ForegroundColor Red
    exit 1
}
