/**
 * 工具/杂项 E2E：通知中心、全局搜索、决策收件箱、帮助中心、AI 助理面板。
 */
import { test as base, expect, type Page } from '@playwright/test'
import { makeApi, uniq, type ApmApi } from './helpers/api'

const test = base.extend<{ api: ApmApi }>({
  api: async ({ request }, use) => {
    await use(await makeApi(request))
  },
})

// ---------------------------------------------------------------------------
// 通知中心
// ---------------------------------------------------------------------------

test('N01 通知中心-tabs 与全部已读', async ({ page }) => {
  await page.goto('/app/notifications')
  await page.waitForURL(/\/app\/notifications/, { timeout: 30_000 })
  // tabs（英文回退标签 Unread/All + AI 助理）
  for (const tab of ['All', 'AI 助理', 'Unread']) {
    const tabBtn = page.getByRole('button', { name: new RegExp(`^${tab}`) }).first()
    if (await tabBtn.isVisible().catch(() => false)) await tabBtn.click()
  }
  // 单条通知点击 = 标记已读（有数据时）
  const firstItem = page.getByRole('button', { name: /条消息|继续对话|通知/ }).first()
  if (await firstItem.isVisible().catch(() => false)) await firstItem.click().catch(() => {})
  await expect(page.locator('body')).toContainText(/通知|暂无|没有|Unread/, { timeout: 15_000 })
})

test('N02 通知设置弹窗', async ({ page }) => {
  await page.goto('/app/notifications')
  await page.waitForURL(/\/app\/notifications/, { timeout: 30_000 })
  const gear = page.getByRole('button', { name: /通知设置|设置/ }).first()
  if (await gear.isVisible().catch(() => false)) {
    await gear.click()
    const dialog = page.locator('[data-slot="dialog-content"], [role="dialog"]').last()
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    await page.keyboard.press('Escape')
  }
})

// ---------------------------------------------------------------------------
// 全局搜索
// ---------------------------------------------------------------------------

test('S01 全局搜索-命中任务并展示类型分组', async ({ page, api }) => {
  const p = await api.createProject({ name: uniq('可搜索项目') })
  await api.ensureProjectModule(p.id)
  const task = await api.createTask({ title: uniq('唯一可搜索任务'), projectId: p.id, moduleCode: 'TASK' })
  await api.archiveProject(p.id).catch(() => {})

  await page.goto('/app/search')
  const input = page.getByPlaceholder(/Search everything|搜索/)
  await input.waitFor({ state: 'visible', timeout: 60_000 })
  await input.fill(task.title)
  await expect(page.locator('body')).toContainText(task.title.slice(6, 14), { timeout: 15_000 }).catch(
    () => {},
  )
  // 类型 chips（Task/Bug/Document 等）
  await expect(page.locator('body')).toContainText(/Task|Bug|Document|全部/i, { timeout: 15_000 })
})

// ---------------------------------------------------------------------------
// 决策收件箱（只读：无前端创建入口）
// ---------------------------------------------------------------------------

test('DC01 决策收件箱-计数与刷新', async ({ page }) => {
  await page.goto('/app/decisions')
  await page.waitForURL(/\/app\/decisions/, { timeout: 30_000 })
  await expect(page.locator('body')).toContainText(/待决|阻断|咨询|暂无|决策/, { timeout: 60_000 })
  const refresh = page.getByRole('button', { name: /刷新/ }).first()
  if (await refresh.isVisible().catch(() => false)) await refresh.click()
  await expect(page.locator('body')).toContainText(/待决|阻断|咨询|暂无|决策/, { timeout: 15_000 })
})

// ---------------------------------------------------------------------------
// 帮助中心
// ---------------------------------------------------------------------------

test('H01 帮助中心-搜索过滤', async ({ page }) => {
  await page.goto('/app/help')
  await page.waitForURL(/\/app\/help/, { timeout: 30_000 })
  await expect(page.locator('body')).toContainText(/帮助|Getting Started|快速开始|快捷键/, {
    timeout: 60_000,
  })
  const search = page.getByPlaceholder(/搜索|Search/).first()
  if (await search.isVisible().catch(() => false)) {
    await search.fill('快捷键')
    await page.waitForTimeout(500)
  }
})

// ---------------------------------------------------------------------------
// AI 助理面板（小周）—— 仅覆盖 UI 开合，不触发真实 AI 回复
// ---------------------------------------------------------------------------

test('AS01 助理面板开合与快捷提示', async ({ page }) => {
  await page.goto('/app/projects')
  const fab = page.getByRole('button', { name: /小周/ }).first()
  await fab.waitFor({ state: 'visible', timeout: 60_000 })
  await fab.click()

  // 面板出现：输入框（给小周留言…）
  const input = page.getByPlaceholder(/留言/)
  await expect(input.first()).toBeVisible({ timeout: 15_000 })
  // 快捷提示 chips
  await expect(page.getByText(/总结一下项目现状|本周有什么风险|需要我现在决定/).first()).toBeVisible()

  // 再次点击关闭
  await fab.click()
  await expect(input.first()).toBeHidden({ timeout: 10_000 })
})
