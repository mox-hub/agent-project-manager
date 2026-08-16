$ErrorActionPreference = 'Continue'
$BASE = 'http://localhost:4300/_api'

function J($url, $method = 'GET', $body = $null, $token = $null) {
  $headers = @{ 'Content-Type' = 'application/json' }
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  $params = @{ Uri = "$BASE$url"; Method = $method; Headers = $headers; TimeoutSec = 15 }
  if ($body) { $params['Body'] = ($body | ConvertTo-Json -Depth 10) }
  try {
    $r = Invoke-WebRequest @params -UseBasicParsing
    $json = $r.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
    return [pscustomobject]@{ status = $r.StatusCode; ok = $true; data = $json }
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    $msg = $null
    try { $msg = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd() } catch {}
    return [pscustomobject]@{ status = $code; ok = $false; err = $msg; msg = $_.Exception.Message }
  }
}

Write-Host "=== 1. login ===" -ForegroundColor Cyan
$login = J '/auth/login' 'POST' @{ username = 'admin'; password = 'password123' }
$token = $login.data.data.accessToken
Write-Host "login status=$($login.status) token=$($token.Length)"

$targetProj = 'sample-project-1'

Write-Host "`n=== 2. list members by project ===" -ForegroundColor Cyan
$members = J "/members/project/$targetProj" 'GET' $null $token
Write-Host "status=$($members.status) count=$($members.data.data.Count)"
$members.data.data | Select-Object id, name, role, agentType, subjectType | Format-Table | Out-String | Write-Host

Write-Host "`n=== 3. find AI agent for dispatcher ===" -ForegroundColor Cyan
$aiAgent = $members.data.data | Where-Object { $_.agentType -eq 'ai_agent' -or $_.subjectType -eq 'ai_agent' } | Select-Object -First 1
if (-not $aiAgent) {
  Write-Host "no AI agent in members, try /ai/agents" -ForegroundColor Yellow
  $agents = J "/ai/agents?projectId=$targetProj" 'GET' $null $token
  Write-Host "agents status=$($agents.status) count=$($agents.data.data.Count)"
  $agents.data.data | Select-Object id, name, subjectType, agentType | Format-Table | Out-String | Write-Host
  $aiAgent = $agents.data.data | Select-Object -First 1
}
Write-Host "picked agent: $($aiAgent | ConvertTo-Json -Depth 3)"

Write-Host "`n=== 4. create test task ===" -ForegroundColor Cyan
$newKey = "DIT-{0}-{1}" -f (Get-Date -Format 'HHmmss'), (Get-Random -Minimum 100 -Maximum 999)
$taskResp = J "/tasks" 'POST' @{
  projectId = $targetProj
  moduleCode = 'TASK'
  title = "dispatch integration test ($newKey)"
  description = "auto by ps"
  status = 'todo'
  priority = 'medium'
} $token
Write-Host "status=$($taskResp.status)"
Write-Host "task: $($taskResp.data | ConvertTo-Json -Depth 5)"
$taskId = $taskResp.data.data.id
Write-Host "taskId=$taskId"

Write-Host "`n=== 5. assign task to AI (real) ===" -ForegroundColor Cyan
if ($aiAgent) {
  # assign-task expects agentSubjectId = the AI member id (subjectId), NOT the binding id
  $memberId = $aiAgent.subjectId
  Write-Host "using agent binding id=$($aiAgent.id), member id (subjectId)=$memberId"
  $assign = J "/ai/assign-task" 'POST' @{
    taskId = $taskId
    agentSubjectId = $memberId
    projectId = $targetProj
  } $token
  Write-Host "status=$($assign.status)"
  Write-Host "result: $($assign.data | ConvertTo-Json -Depth 5)"
} else {
  Write-Host "no AI agent, skip" -ForegroundColor Yellow
}

Write-Host "`n=== 6. inspect execution runs ===" -ForegroundColor Cyan
$runs = J "/execution/runs?projectId=$targetProj&limit=20" 'GET' $null $token
Write-Host "status=$($runs.status) total=$($runs.data.data.total) count=$($runs.data.data.runs.Count)"
$runs.data.data.runs | Select-Object id, taskId, projectId, status, runtimeId | Format-Table | Out-String | Write-Host

Write-Host "`n=== 7. inspect task-assignees ===" -ForegroundColor Cyan
$assignees = J "/task-assignees/task/$taskId" 'GET' $null $token
Write-Host "status=$($assignees.status) count=$($assignees.data.data.Count)"
$assignees.data.data | Select-Object taskId, memberId, role, isPrimary | Format-Table | Out-String | Write-Host

Write-Host "`n=== 8. inspect task final state ===" -ForegroundColor Cyan
$taskFinal = J "/tasks/$taskId" 'GET' $null $token
Write-Host "status=$($taskFinal.status)"
Write-Host "task: $($taskFinal.data | ConvertTo-Json -Depth 5)"

Write-Host "`n=== DONE ===" -ForegroundColor Green
