# agent-dev-loop.ps1
# 自动化回路：Linear issue -> orca worktree + Agent -> PR -> quality-gate -> 回写 Linear
#
# 用法:
#   ./scripts/agent-dev-loop.ps1 start  -Issue "https://linear.app/moxhub/issue/MOX-219/..." [-Agent codex|claude|opencode] [-Prompt "..."]
#   ./scripts/agent-dev-loop.ps1 start  -Issue "MOX-219" [-Agent codex]
#   ./scripts/agent-dev-loop.ps1 finish [-Base origin/develop] [-PrTitle "..."] [-PrBody "..."]
#
# 前置: orca 运行中 + Linear 已连接; gh 已登录 (repo + workflow scopes)
param(
  [Parameter(Position = 0)]
  [ValidateSet('start', 'finish')]
  [string]$Stage = 'start',

  [string]$Issue,                     # Linear issue URL 或 MOX-xxx
  [ValidateSet('codex', 'claude', 'opencode')]
  [string]$Agent = 'codex',
  [string]$Prompt = '',               # 附加提示（拼接到标准提示之后）
  [string]$Name = '',                 # worktree 名称，缺省由 issue 派生
  [string]$Base = 'origin/develop',
  [string]$RepoId = '436ba7a1-ccff-4350-9660-8067cc37b4bd', # agent-project-manager
  [string]$PrTitle = '',
  [string]$PrBody = '',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$RepoSel = "id:$RepoId"

function Run-O {
  # 执行 orca 命令（参数数组），返回合并输出字符串
  param([string[]]$OraArgs)
  $joined = ($OraArgs | ForEach-Object { if ($_ -match '\s') { "`"$_`"" } else { $_ } }) -join ' '
  Write-Host "> orca $joined" -ForegroundColor DarkGray
  if ($DryRun) { return '' }
  return (& orca @OraArgs 2>&1 | Out-String)
}

function Resolve-IssueInfo {
  if (-not $Issue) {
    $cur = Run-O @('worktree', 'current', '--json') | ConvertFrom-Json
    $li = $cur.result.worktree.linkedLinearIssue
    if (-not $li) { throw '未提供 -Issue，且当前 worktree 未关联 Linear issue' }
    return @{ identifier = $li }
  }
  $id = $Issue
  if ($Issue -match 'https?://') {
    $m = [regex]::Match($Issue, '(?:issue/)?([A-Z]+-\d+)')
    if ($m.Success) { $id = $m.Groups[1].Value } else { throw "无法从 URL 解析 issue identifier: $Issue" }
  }
  return @{ identifier = $id }
}

if ($Stage -eq 'start') {
  $info = Resolve-IssueInfo
  $identifier = $info.identifier
  $wtName = if ($Name) { $Name } else { $identifier.ToLowerInvariant() -replace '[^a-z0-9\-]', '-' }

  $tpl = @'
你正在处理一个 Linear 任务（issue __ISSUE__）。请按顺序执行：
1. 先运行 `orca linear issue --current --full --json` 读取完整任务上下文（标题/描述/标签/评论）。
2. 阅读仓库根目录 CLAUDE.md 与 architecture.md，理解项目规范与架构。
3. 实现该任务；涉及前端组件时遵循 shadcn/base-ui 约定，后端遵循 NestJS 模块约定。
4. 运行 `pnpm quality:gate` 确保 type-check / lint / test / docs-sync 全部通过。
5. git 提交并推送当前分支。
6. 运行 `gh pr create --base __BASE__ --fill` 创建 PR。
7. 用 `orca linear attach --current --url <PR链接> --title "PR/MR link"` 回写 Linear，并 `orca linear comment add --current --body-file -` 写一条完成摘要，最后 `orca linear status set --current --to "In Review"`。
'@
  $stdPrompt = $tpl.Replace('__ISSUE__', $identifier).Replace('__BASE__', $Base)
  if ($Prompt) { $stdPrompt += "`n`n附加要求：$Prompt" }

  if ($Agent -in @('codex', 'claude')) {
    Run-O @('worktree', 'create', '--repo', $RepoSel, '--name', $wtName,
            '--base-branch', $Base, '--linear-issue', $identifier,
            '--agent', $Agent, '--prompt', $stdPrompt, '--json') | Out-Null
  }
  else {
    # opencode：先建 worktree（不挂 agent），再开终端 + 发送提示
    $created = Run-O @('worktree', 'create', '--repo', $RepoSel, '--name', $wtName,
                      '--base-branch', $Base, '--linear-issue', $identifier, '--json')
    if ($DryRun) {
      Write-Host "  [dry-run] 后续将执行: orca terminal create --command opencode + terminal send"
    }
    else {
      $wtJson = $created | ConvertFrom-Json
      $wtId = $wtJson.result.worktree.id
      if (-not $wtId) { throw "worktree create 未返回 id" }
      Run-O @('terminal', 'create', '--worktree', "id:$wtId", '--title', $identifier,
              '--command', 'opencode', '--json') | Out-Null
      Run-O @('terminal', 'send', '--text', $stdPrompt, '--enter', '--json') | Out-Null
    }
  }
  Write-Host "`n[ok] worktree `"$wtName`" 已创建并关联 $identifier（agent=$Agent）。" -ForegroundColor Green
  if ($DryRun) { Write-Host "[dry-run] 未实际执行。" -ForegroundColor Yellow }
  exit 0
}

# ---------- finish ----------
$cur = Run-O @('worktree', 'current', '--json') | ConvertFrom-Json
$linked = $cur.result.worktree.linkedLinearIssue
if (-not $linked) { throw '当前 worktree 未关联 Linear issue，无法回写' }

# 1. 质量门禁（失败即中断）
Write-Host "`n[1/4] 质量门禁" -ForegroundColor Cyan
if (-not $DryRun) {
  & pnpm quality:gate
  if ($LASTEXITCODE -ne 0) { throw 'quality:gate 未通过，终止回路' }
}

# 2. 推送分支
Write-Host "`n[2/4] 推送分支" -ForegroundColor Cyan
if (-not $DryRun) {
  & git push -u origin HEAD
  if ($LASTEXITCODE -ne 0) { throw 'git push 失败' }
}

# 3. 创建 PR
Write-Host "`n[3/4] 创建 PR" -ForegroundColor Cyan
$ghArgs = @('pr', 'create', '--base', $Base)
if ($PrTitle) { $ghArgs += @('--title', $PrTitle) } else { $ghArgs += '--fill' }
if ($PrBody)  { $ghArgs += @('--body', $PrBody) }
$prUrl = if ($DryRun) { 'https://github.com/mox-hub/agent-project-manager/pull/DRYRUN' }
         else { (& gh @ghArgs 2>&1 | Out-String).Trim() }
if (-not $prUrl) { throw 'gh pr create 未返回 PR URL' }
Write-Host "  PR: $prUrl" -ForegroundColor Green

# 4. 回写 Linear（attach + comment + status）
Write-Host "`n[4/4] 回写 Linear ($linked)" -ForegroundColor Cyan
if (-not $DryRun) {
  Run-O @('linear', 'attach', '--current', '--url', $prUrl, '--title', 'PR/MR link', '--json') | Out-Null
  $summary = "完成实现，PR: $prUrl`n质量门禁已通过（type-check/lint/test/docs-sync）。"
  Run-O @('linear', 'comment', 'add', '--current', '--body', $summary, '--json') | Out-Null
  $st = Run-O @('linear', 'status', 'set', '--current', '--to', 'In Review', '--json')
  if ($st -match 'linear_invalid_state') {
    Write-Host "  [warn] 'In Review' 状态无效，请手动确认目标状态。" -ForegroundColor Yellow
  }
}
Write-Host "`n[ok] 回路完成：PR $prUrl -> Linear $linked 已回写。" -ForegroundColor Green
