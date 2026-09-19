<#
.SYNOPSIS
    把 APM 仓库与 pnpm store 从 E: (SATA HDD) 迁移到 D: (NVMe)。

.DESCRIPTION
    背景：仓库与 pnpm store 都位于 E: HDD，实测冷文件打开 55–85 ms/个（D: NVMe 为 0.17 ms），
    导致 vitest 冷跑单文件 1146s、worktree 里 pnpm install 长时间无进展。

    本脚本【只复制、不删除源】。校验通过后由你手工删除 E: 上的旧目录。

    为什么不能用 git clone 重建：
      - docs/（228 个文档）未被 git 跟踪（.gitignore:140）
      - apps/server/.env*、prisma/dev.db、workspaces.json 等本地文件同样未跟踪
      - 各 worktree 的未提交改动
    → 必须文件系统级整目录复制。

    为什么排除 node_modules：
      pnpm 的 node_modules 是指向 store 的【硬链接】。跨卷复制会退化成整份内容复制
      （巨大且慢），且硬链接身份丢失。迁移后重新 install 会基于新 store 重建硬链接。

.PARAMETER Execute
    默认只做预检与干跑（打印将要执行的 robocopy 命令）。加上该开关才真正复制。

.EXAMPLE
    # 第一步：预检（不改动任何东西）
    powershell -ExecutionPolicy Bypass -File scripts\migrate-to-d.ps1

    # 第二步：确认无误后执行
    powershell -ExecutionPolicy Bypass -File scripts\migrate-to-d.ps1 -Execute
#>
[CmdletBinding()]
param(
    [string]$Source      = "E:\Project\agent-project-manager",
    [string]$Target      = "D:\workspace\agent-project-manager",
    [string]$SourceStore = "E:\.pnpm-store",
    [string]$TargetStore = "D:\dev\pnpm-store",
    [string[]]$ExtraWorktrees = @("E:\Project\apm-v0.4.10-release"),
    [switch]$SkipStore,
    [switch]$Execute
)

$ErrorActionPreference = "Stop"

# 不复制的内容：全部可由 `pnpm install` / 构建重新生成
$ExcludeDirs = @("node_modules", ".turbo", "dist", "target", ".pnpm-store")

# 空壳残留目录（0 文件、不在 `git worktree list` 中）已于 2026-09-18 删除，此处留空备用；
# 将来若再出现同类残留，把目录名加进来即可跳过。
# 注意：`.worktrees/c07-qa-baseline` 虽是孤儿（无 .git、不在 worktree list 中），但里面有完整
# 源码树，**不排除**——源盘还要保留 24h，是否删除由人工决定（其分支已合入 develop）。
$ExcludeWorktrees = @()

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn2($msg){ Write-Host "  [!!] $msg" -ForegroundColor Yellow }

# ---------------------------------------------------------------- 0. 预检
Write-Step "0. 预检"

if (-not (Test-Path -LiteralPath $Source)) { throw "源目录不存在：$Source" }
Write-Ok "源目录存在：$Source"

$srcRoot = Get-Item -LiteralPath $Source
$dstDrive = (Split-Path -Qualifier $Target).TrimEnd(':')
$srcDrive = (Split-Path -Qualifier $Source).TrimEnd(':')
if ($dstDrive -eq $srcDrive) { Write-Warn2 "源与目标在同一盘（${srcDrive}:），迁移没有意义" }

if (Test-Path -LiteralPath $Target) {
    $existing = @(Get-ChildItem -LiteralPath $Target -Force)
    if ($existing.Count -gt 0) {
        throw "目标目录已存在且非空：$Target`n请先清空或改用其它 -Target。"
    }
    Write-Warn2 "目标目录已存在但为空，将继续。"
}

# 磁盘空间：源体积（排除 node_modules 等）+ store 体积
Write-Host "  统计源体积（排除 node_modules/dist/target/.turbo，可能要几分钟）..." -ForegroundColor DarkGray
$robArgs = @($Source, $Target, "/E", "/L", "/NJH", "/NP", "/NFL", "/NDL", "/BYTES", "/XJ")
# /XD 只接受【裸目录名】（排除树中任意层级同名目录）或【完整路径】；
# 写成 "$Source\*\node_modules" 这种通配路径会被判为「无效参数 #14」并以退出码 16 直接失败。
$robArgs += @("/XD") + $ExcludeDirs
$plan = & robocopy @robArgs 2>&1 | Out-String
# robocopy 的汇总行随系统语言变化（英文 Bytes / 中文 字节）
if ($plan -match "(?m)^\s*(?:Bytes|字节)\s*[:：]\s*(\d+)") {
    $repoBytes = [int64]$Matches[1]
    Write-Ok ("仓库（不含依赖）约 {0:N1} GB" -f ($repoBytes / 1GB))
} else { $repoBytes = 0; Write-Warn2 "无法解析体积，跳过空间校验" }

$storeBytes = 0
if (-not $SkipStore -and (Test-Path -LiteralPath $SourceStore)) {
    $storeBytes = (Get-ChildItem -LiteralPath $SourceStore -Recurse -File -Force -ErrorAction SilentlyContinue |
                   Measure-Object -Property Length -Sum).Sum
    Write-Ok ("pnpm store 约 {0:N1} GB" -f ($storeBytes / 1GB))
}

if ($repoBytes -gt 0) {
    $needGB = ($repoBytes + $storeBytes) / 1GB * 1.15
    $freeGB = (Get-PSDrive -Name $dstDrive).Free / 1GB
    if ($freeGB -lt $needGB) { throw ("目标盘 {0}: 空间不足：需要约 {1:N1} GB，可用 {2:N1} GB" -f $dstDrive, $needGB, $freeGB) }
    Write-Ok ("目标盘 {0}: 可用 {1:N1} GB，预计需要 {2:N1} GB" -f $dstDrive, $freeGB, $needGB)
}

Write-Host ""
Write-Warn2 "开始前请确认已【完全退出】："
Write-Host "     - 所有 Claude Code 会话（含 .worktrees/* 里开着的）"
Write-Host "     - pnpm dev / vite / nest 等 dev server"
Write-Host "     - VS Code / Cursor 等编辑器（它们会锁住文件）"
Write-Host "     - 正在跑的测试"
if (-not $Execute) {
    Write-Host "`n（当前为预检模式，未复制任何文件。确认无误后加 -Execute 重新运行）" -ForegroundColor Yellow
}

# ---------------------------------------------------------------- 1. 复制仓库
Write-Step "1. 复制仓库 $Source  ->  $Target"

$copyArgs = @($Source, $Target, "/E", "/COPY:DAT", "/DCOPY:DAT", "/R:2", "/W:2", "/MT:16", "/NFL", "/NDL", "/NP", "/XJ")
# 同预检：/XD 只吃裸目录名或完整路径，不能带 * 通配（否则「无效参数 #14」+ 退出码 16）
$copyArgs += @("/XD") + $ExcludeDirs
foreach ($w in $ExcludeWorktrees) { $copyArgs += @("/XD", (Join-Path $Source ".worktrees\$w")) }

if (-not $Execute) {
    Write-Host ("  robocopy " + ($copyArgs -join " ")) -ForegroundColor DarkGray
} else {
    Write-Host ("  robocopy " + ($copyArgs -join " ")) -ForegroundColor DarkGray
    # 刻意不做文件计数：那要再全树遍历一遍，而源盘是 HDD（实测单次全树遍历 >45 分钟），
    # 等于在复制前白加几十分钟。改为时间戳 + 完成时报告耗时。
    Write-Host "  开始复制……源盘是 HDD，这一步可能几十分钟；期间无输出属正常，不是卡死。" -ForegroundColor DarkGray
    $t0 = Get-Date
    # 输出留在变量里：正常时只报耗时（robocopy 的汇总行很长），失败时打印出来供定位
    $rcOut = & robocopy @copyArgs 2>&1
    # robocopy 退出码 < 8 视为成功
    if ($LASTEXITCODE -ge 8) {
        Write-Host "`n---- robocopy 原始输出（最后 25 行）----" -ForegroundColor DarkGray
        $rcOut | Select-Object -Last 25 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
        throw "robocopy 复制仓库失败，退出码 $LASTEXITCODE（16=用法错误或权限不足，一个文件都没复制）"
    }
    $mins = [math]::Round(((Get-Date) - $t0).TotalMinutes, 1)
    Write-Ok "仓库复制完成（耗时 $mins 分钟）"
}

# ---------------------------------------------------------------- 2. 复制 store
if (-not $SkipStore) {
    Write-Step "2. 复制 pnpm store $SourceStore  ->  $TargetStore"
    if (-not (Test-Path -LiteralPath $SourceStore)) {
        Write-Warn2 "源 store 不存在，跳过（迁移后 pnpm install 会重新下载）"
    } else {
        $storeArgs = @((Join-Path $SourceStore "v11"), (Join-Path $TargetStore "v11"),
                       "/E", "/COPY:DAT", "/DCOPY:DAT", "/R:2", "/W:2", "/MT:16", "/NFL", "/NDL", "/NP", "/XJ")
        if (-not $Execute) {
            Write-Host ("  robocopy " + ($storeArgs -join " ")) -ForegroundColor DarkGray
        } else {
            New-Item -ItemType Directory -Force -Path (Join-Path $TargetStore "v11") | Out-Null
            # 约 17.7 万个文件，同样不做预算计数（理由见第 1 步）
            Write-Host "  开始复制……约 17.7 万个文件，无输出属正常。" -ForegroundColor DarkGray
            $t1 = Get-Date
            $rcOut1 = & robocopy @storeArgs 2>&1
            if ($LASTEXITCODE -ge 8) {
                Write-Host "`n---- robocopy 原始输出（最后 25 行）----" -ForegroundColor DarkGray
                $rcOut1 | Select-Object -Last 25 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
                throw "robocopy 复制 store 失败，退出码 $LASTEXITCODE"
            }
            $mins1 = [math]::Round(((Get-Date) - $t1).TotalMinutes, 1)
            Write-Ok "store 复制完成（耗时 $mins1 分钟；迁移后 pnpm install 才能用硬链接而非重新下载）"
        }
    }
}

# ---------------------------------------------------------------- 3. 校验
if ($Execute) {
    Write-Step "3. 校验"
    # 本段刻意降级错误策略：目标不是 git 仓库、或某个子命令报错时，
    # 只该报警告，绝不能中断——否则第 4 步的人工修复清单就打印不出来了。
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {

    $srcHead = (& git -C $Source rev-parse HEAD 2>$null | Out-String).Trim()
    $dstHead = (& git -C $Target rev-parse HEAD 2>$null | Out-String).Trim()
    if (-not $srcHead -or -not $dstHead) { Write-Warn2 "无法读取 HEAD（源或目标不是 git 仓库），跳过该项" }
    elseif ($srcHead -eq $dstHead) { Write-Ok "HEAD 一致：$dstHead" }
    else { Write-Warn2 "HEAD 不一致：$srcHead -> $dstHead" }

    $srcBranch = (& git -C $Source rev-parse --abbrev-ref HEAD 2>$null | Out-String).Trim()
    if ($srcBranch) { Write-Ok "源分支：$srcBranch" }

    # docs/ 未被 git 跟踪，必须单独核对
    $srcDocs = @(Get-ChildItem -LiteralPath (Join-Path $Source "docs") -Recurse -File -ErrorAction SilentlyContinue).Count
    $dstDocs = @(Get-ChildItem -LiteralPath (Join-Path $Target "docs") -Recurse -File -ErrorAction SilentlyContinue).Count
    if ($srcDocs -eq $dstDocs) { Write-Ok "docs/ 文件数一致：$dstDocs" }
    else { Write-Warn2 "docs/ 文件数不一致：源 $srcDocs，目标 $dstDocs（docs/ 未被 git 跟踪，务必人工核对）" }

    # 未跟踪的本地文件抽查
    foreach ($f in @("apps\server\.env", "apps\server\.env.local", "apps\server\prisma\dev.db", "apps\frontend\.env.local")) {
        $a = Test-Path -LiteralPath (Join-Path $Source $f)
        $b = Test-Path -LiteralPath (Join-Path $Target $f)
        if ($a -and -not $b) { Write-Warn2 "缺失：$f" }
        elseif ($a) { Write-Ok "已带上：$f" }
    }

    $srcStatus = @(& git -C $Source status --porcelain 2>$null | Where-Object { $_ -notmatch '\.worktrees/' }).Count
    $dstStatus = @(& git -C $Target status --porcelain 2>$null | Where-Object { $_ -notmatch '\.worktrees/' }).Count
    Write-Ok "未提交改动条数：源 $srcStatus / 目标 $dstStatus（应一致）"

    } catch {
        Write-Warn2 "校验过程出错（**不影响已完成的复制**，请人工核对）：$($_.Exception.Message)"
    } finally {
        $ErrorActionPreference = $prevEAP
    }
}

# ---------------------------------------------------------------- 4. 迁移后动作（打印清单）
Write-Step "4. 迁移后手工步骤（复制校验通过后再执行）"

Write-Host @"

  a) 修复 pnpm store 配置（务必执行，否则会用默认的 D:\.pnpm-store）：
       pnpm config set store-dir "$TargetStore" --global

  b) 修复 worktree 元数据（worktree 里记录的是绝对路径）：
       cd $Target
       git worktree repair `
         "$Target\.worktrees\b07-trust-tiers" `
         "$Target\.worktrees\c03-project-steps" `
         "$Target\.worktrees\inbox"
     外部 worktree 需单独处理：$($ExtraWorktrees -join ", ")
     （c07-qa-baseline 不在此列：它已不是注册 worktree，只是一个无 .git 的孤儿源码目录，
       被当作普通文件复制过去；其分支 feat/c07-qa-quality-baseline 已合入 develop，
       确认无用后可整目录删除。）

  c) 在 D: 上重装依赖（store 已在同卷，走硬链接，快）：
       cd $Target
       pnpm install

  d) 修改硬编码的绝对路径（已逐个确认，我可以在新会话里帮你改并提交）：
       apps\desktop\src-tauri\src\frontend.rs:19   "E:/Project/agent-project-manager/apps/frontend"
       apps\server\.env.local:5                    DATABASE_URL="file:E:/Project/.../prisma/dev.db"
       apps\server\.env / apps\server\workspaces.json  需复核是否含 E: 路径

  e) 确认无误后再删除源目录（建议保留 24h 兜底）：
       Remove-Item -LiteralPath "$Source" -Recurse -Force

  f) 重新在本仓根目录启动 Claude Code（当前会话的工作目录在 $Source，迁移后会失效）

"@ -ForegroundColor Gray

if (-not $Execute) {
    Write-Host "预检结束，未改动任何文件。" -ForegroundColor Yellow
} else {
    Write-Host "迁移完成（源目录未删除）。" -ForegroundColor Green
}
