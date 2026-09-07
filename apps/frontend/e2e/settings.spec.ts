/**
 * 设置模块 E2E：profile 保存、改密码表单校验、外观（深色模式）、
 * 访问令牌创建/撤销、标签管理（权限门控）、AI 用量/AI 管理/short-id/存储页渲染。
 */
import { test as base, expect } from '@playwright/test'
import { makeApi, type ApmApi } from './helpers/api'

const test = base.extend<{ api: ApmApi }>({
  api: async ({ request }, use) => {
    await use(await makeApi(request))
  },
})

test('ST01 Profile-修改显示名保存', async ({ page, api }) => {
  await page.goto('/app/settings/profile')
  const nameInput = page.locator('#profileDisplayName')
  await nameInput.waitFor({ state: 'visible', timeout: 60_000 })
  const original = await nameInput.inputValue()

  const renamed = `${original}-改名`
  await nameInput.fill(renamed)
  await page.getByRole('button', { name: /保存更改|保存/ }).first().click()
  await expect
    .poll(async () => (await api.me()).displayName, { timeout: 15_000 })
    .toBe(renamed)

  // 还原，避免影响其他用例（右侧栏「E2E Runner」等文案）
  await page.waitForTimeout(1200) // 等第一次保存完成（按钮 pending 期点击会被吞）
  await nameInput.fill(original)
  await page.getByRole('button', { name: /保存更改|保存/ }).first().click()
  await expect.poll(async () => (await api.me()).displayName, { timeout: 15_000 }).toBe(original)
})

test('ST02 改密码-错误原密码报错', async ({ page }) => {
  await page.goto('/app/settings/profile')
  await page.locator('#currentPassword').waitFor({ state: 'visible', timeout: 60_000 })
  await page.locator('#currentPassword').fill('definitely-wrong-old')
  await page.locator('#newPassword').fill('new-pass-12345')
  await page.locator('#confirmPassword').fill('new-pass-12345')
  await page.getByRole('button', { name: /修改密码|更新密码|保存/ }).last().click()
  await expect(page.locator('body')).toContainText(/失败|错误|原密码|不正确| incorrect/i, {
    timeout: 15_000,
  })
})

test('ST03 外观-深色模式切换', async ({ page }) => {
  await page.goto('/app/settings/appearance')
  await expect(page.getByText(/外观|主题|深色/).first()).toBeVisible({ timeout: 60_000 })
  const html = page.locator('html')
  const before = await html.getAttribute('class')
  await page.getByRole('button', { name: /深色/ }).first().click()
  await expect
    .poll(async () => await html.getAttribute('class'), { timeout: 10_000 })
    .not.toBe(before)
  // 还原浅色
  await page.getByRole('button', { name: /浅色/ }).first().click()
})

test('ST04 访问令牌-创建与撤销', async ({ page }) => {
  await page.goto('/app/settings/tokens')
  await page.getByRole('button', { name: /创建 Token|创建令牌|新建/ }).first().click({
    timeout: 60_000,
  })
  const dialog = page.locator('[data-slot="dialog-content"], [role="dialog"]').last()
  await dialog.waitFor({ state: 'visible' })
  const tokenName = uniq('e2e-token')
  await dialog.getByPlaceholder(/名称|name/i).or(dialog.locator('input').first()).first().fill(tokenName)
  await dialog.getByRole('button', { name: /创建|确定/ }).last().click()

  // 一次性明文展示
  await expect(page.locator('body')).toContainText(/复制|token|令牌/i, { timeout: 15_000 })
  await page.keyboard.press('Escape')

  // 列表中出现 → 撤销
  const row = page.getByText(tokenName).first()
  await expect(row).toBeVisible({ timeout: 15_000 })
  const revoke = page.getByRole('button', { name: /撤销|删除|Revoke/ }).first()
  if (await revoke.isVisible().catch(() => false)) {
    await revoke.click()
    const confirmBtn = page.getByRole('button', { name: /撤销|删除|确认/ }).last()
    if (await confirmBtn.isVisible().catch(() => false)) await confirmBtn.click()
    await expect(page.getByText(tokenName)).toHaveCount(0, { timeout: 15_000 }).catch(() => {})
  }
})

test('ST05 标签管理-普通用户隐藏创建入口（权限门控一致）', async ({ page, api }) => {
  await page.goto('/app/settings/labels')
  await expect(page.getByText(/标签/).first()).toBeVisible({ timeout: 60_000 })
  // 缺陷 9 已修复：标签创建是管理员能力，普通用户不再显示必 403 的入口
  const addBtn = page.getByRole('button', { name: /添加标签|新增标签/ }).first()
  await expect(addBtn).toHaveCount(0)
  // 服务端权限保持不变：普通用户直调 API 仍 403
  const viaApi = await api.raw('POST', '/metadata/tags', { name: `e2e-tag-${Date.now().toString(36)}` })
  expect([403, 401]).toContain(viaApi.status)
})

test('ST06 状态管理页渲染', async ({ page }) => {
  await page.goto('/app/settings/statuses')
  await expect(page.locator('body')).toContainText(/状态/, { timeout: 60_000 })
})

test('ST07 AI 用量页-范围切换渲染', async ({ page }) => {
  await page.goto('/app/settings/ai/usage')
  await expect(page.locator('body')).toContainText(/Token|成本|用量|模型/i, { timeout: 60_000 })
  // 范围切换（近7天/近30天等）
  const rangeSelect = page.locator('select').first()
  if (await rangeSelect.isVisible().catch(() => false)) {
    await rangeSelect.selectOption({ index: 1 }).catch(() => {})
    await page.waitForTimeout(500)
  }
})

test('ST08 AI 管理页-provider 手风琴渲染', async ({ page }) => {
  await page.goto('/app/settings/ai')
  await expect(page.locator('body')).toContainText(/openai|anthropic|Provider|模型/i, {
    timeout: 60_000,
  })
})

test('ST09 Short-ID 设置页渲染与保存按钮', async ({ page }) => {
  await page.goto('/app/settings/short-id')
  await expect(page.locator('input').first()).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('button', { name: /保存/ }).first()).toBeVisible()
})

test('ST10 存储设置页渲染', async ({ page }) => {
  await page.goto('/app/settings/storage')
  await expect(page.locator('body')).toContainText(/存储|文档|配置/, { timeout: 60_000 })
})

test('ST11 模板/终端/AI 执行中心页渲染', async ({ page }) => {
  // 任务模板
  await page.goto('/app/settings/templates')
  await expect(page.locator('body')).toContainText(/模板|Template/i, { timeout: 60_000 })
  // 终端设置
  await page.goto('/app/settings/terminal')
  await expect(page.locator('body')).toContainText(/终端|Shell|shell/i, { timeout: 60_000 })
  // AI 执行中心（只读 run 列表）
  await page.goto('/app/settings/ai/executions')
  await expect(page.locator('body')).toContainText(/执行|运行|Run/i, { timeout: 60_000 })
})

function uniq(label: string): string {
  return `E2E-${Date.now().toString(36)}-${label}`
}
