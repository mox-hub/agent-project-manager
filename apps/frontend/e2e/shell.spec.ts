/**
 * Shell / 引导页 / 仪表盘 E2E：侧边栏导航、命令面板、浮动面板、BootPage、
 * 全局仪表盘 KPI 卡与快捷操作、analytics 只读页。
 */
import { test as base, expect, type Page } from '@playwright/test'
import { makeApi, uniq, type ApmApi } from './helpers/api'
import { openCommandPalette } from './helpers/ui'

const test = base.extend<{ api: ApmApi }>({
  api: async ({ request }, use) => {
    await use(await makeApi(request))
  },
})

test('SH01 侧边栏导航覆盖全部主导航路由', async ({ page }) => {
  test.setTimeout(240_000)
  await page.goto('/app/projects')
  await page.locator('nav').waitFor({ state: 'visible' })
  const routes: [RegExp, RegExp][] = [
    [/^仪表盘$/, /\/app\/projects\/dashboard/],
    [/^任务$/, /\/app\/issues/],
    [/^Bug 列表$/, /\/app\/bugs/],
    [/^验收$/, /\/app\/acceptance/],
    [/^文档管理$/, /\/app\/documents/],
    [/^Git 仓库$/, /\/app\/repositories/],
    [/^成员$/, /\/app\/members/],
    [/^团队$/, /\/app\/teams/],
    [/^帮助$/, /\/app\/help/],
    // 设置是全屏页（无侧边栏），必须放在最后
    [/^设置$/, /\/app\/settings/],
  ]
  for (const [name, url] of routes) {
    await page.getByRole('link', { name }).first().click()
    await page.waitForURL(url, { timeout: 20_000 })
  }
})

test('SH02 命令面板 Ctrl+K 开合', async ({ page }) => {
  await page.goto('/app/projects')
  await page.getByRole('button', { name: /创建项目|新建/ }).first().waitFor({ state: 'visible', timeout: 30_000 })
  // 缺陷 #10 已修复：CommandDialog 补上 cmdk root，Ctrl+K 稳定打开面板
  const opened = await openCommandPalette(page)
  expect(opened, 'Ctrl+K 应打开命令面板').toBe(true)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: /创建项目|新建/ }).first()).toBeVisible({ timeout: 30_000 })
})

test('SH03 浮动快捷面板：工作区与主题切换', async ({ page }) => {
  await page.goto('/app/projects')
  await page.getByRole('button', { name: '展开快捷面板' }).click()
  await expect(page.getByText(/新建工作区/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /项目仪表盘/ }).first()).toBeVisible()
  // 深色模式切换（html.dark class 翻转）
  const html = page.locator('html')
  const before = await html.getAttribute('class')
  await page.getByRole('button', { name: /深色|浅色|主题/ }).first().click()
  await expect
    .poll(async () => await html.getAttribute('class'), { timeout: 10_000 })
    .not.toBe(before)
  await page.getByRole('button', { name: '收起快捷面板' }).click()
})

test('SH04 BootPage 启动检查页渲染', async ({ page }) => {
  await page.goto('/boot')
  // 检查清单与主按钮出现（后端可达时全部通过）
  await expect(page.getByRole('button', { name: /进入系统|进入登录|重试失败项/ }).first()).toBeVisible({
    timeout: 45_000,
  })
})

// ---------------------------------------------------------------------------
// 全局仪表盘
// ---------------------------------------------------------------------------

test('D01 仪表盘 KPI 卡渲染与钻取弹窗', async ({ page, api }) => {
  // 造一条真实数据让 KPI 非空
  const p = await api.createProject({ name: uniq('仪表盘项目') })
  await api.ensureProjectModule(p.id)
  await page.goto('/app/projects/dashboard')
  await expect(page.getByText('团队成员').first()).toBeVisible({ timeout: 30_000 })
  for (const label of ['AI 活动', '本月成本', '严重 Bug', '进行中任务', '健康分']) {
    await expect(page.getByText(label).first()).toBeVisible()
  }
  // 点击「团队成员」卡 → 钻取弹窗
  await page.getByText('团队成员').first().click()
  const dialog = page.locator('[data-slot="dialog-content"], [role="dialog"]').last()
  await expect(dialog).toBeVisible({ timeout: 15_000 })
  await page.keyboard.press('Escape')

  await api.archiveProject(p.id)
})

test('D02 仪表盘快捷操作按钮跳转', async ({ page }) => {
  await page.goto('/app/projects/dashboard')
  await expect(page.getByText('快捷操作').first()).toBeVisible({ timeout: 30_000 })
  // 点「查看任务」快捷按钮应离开仪表盘
  const quick = page.getByRole('button', { name: /查看任务/ }).first()
  await quick.click()
  await page.waitForURL(/\/app\/issues\//, { timeout: 20_000 })
})

test('D03 analytics 只读统计页渲染', async ({ page }) => {
  await page.goto('/app/analytics')
  await expect(page.locator('body')).toContainText(/风险|统计|任务|Analytics/i, { timeout: 30_000 })
})
