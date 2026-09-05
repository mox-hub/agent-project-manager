/**
 * Bug 模块 E2E：报告 Bug、列表筛选/搜索/Board 拖拽、批量删除、
 * Bug 详情页（标题热编辑/侧栏属性/评论/删除）。
 */
import { test as base, expect, type Page } from '@playwright/test'
import { makeApi, uniq, type ApmApi } from './helpers/api'
import {
  openRowContextMenu,
  pickContextMenu,
  confirmDialog,
  dragUntil,
  capsuleByRowLabel,
  pickCapsuleOption,
  dialogTitleInput,
  modalDialog,
} from './helpers/ui'

const test = base.extend<{ api: ApmApi }>({
  api: async ({ request }, use) => {
    await use(await makeApi(request))
  },
})

let cleanupProjects: string[] = []
let cleanupTasks: string[] = []

test.beforeEach(() => {
  cleanupProjects = []
  cleanupTasks = []
})

test.afterEach(async ({ api }) => {
  for (const id of cleanupTasks) await api.deleteTask(id).catch(() => {})
  for (const id of cleanupProjects) await api.archiveProject(id).catch(() => {})
})

async function newProject(api: ApmApi, label: string) {
  const p = await api.createProject({ name: uniq(label) })
  cleanupProjects.push(p.id)
  await api.ensureProjectModule(p.id)
  return p
}

async function newBug(api: ApmApi, title: string, projectId: string, extra: Record<string, unknown> = {}) {
  const t = await api.createTask({ title, projectId, moduleCode: 'TASK', type: 'bug', ...extra })
  cleanupTasks.push(t.id)
  return t
}

async function openBugFilter(page: Page) {
  const filterTrigger = page
    .locator('[data-ai-component="task.bug-list.filter-menu"]')
    .or(page.getByRole('button', { name: '筛选' }))
    .first()
  await filterTrigger.click()
}

async function gotoBugs(page: Page) {
  await page.goto('/app/bugs')
  await page.waitForURL(/\/app\/bugs/, { timeout: 30_000 })
  await page
    .locator('[data-ai-component="task.bug-list.new-button"], button')
    .filter({ hasText: '报告 Bug' })
    .first()
    .waitFor({ state: 'visible', timeout: 60_000 })
}

// ---------------------------------------------------------------------------
test('B01 报告Bug-对话框与严重度', async ({ page, api }) => {
  const p = await newProject(api, '建Bug项目')
  await gotoBugs(page)
  await page.getByRole('button', { name: '报告 Bug' }).click()
  const dialog = modalDialog(page)
  await dialog.waitFor({ state: 'visible' })
  const title = uniq('页面Bug')
  await dialogTitleInput(page, 'Bug title').fill(title)
  await pickCapsuleOption(page, dialog, /^Severity$/, /S1 严重/, /S1/)
  await pickCapsuleOption(page, dialog, /^Project$/, p.name, p.name)
  await page.waitForTimeout(1200) // 模块查询加载
  await page.getByRole('button', { name: 'Report bug' }).click()
  await expect(dialog).toBeHidden({ timeout: 25_000 })

  await expect
    .poll(
      async () => {
        const all = await api.listAllTasks()
        return (all as unknown as { title?: string; severity?: string; type?: string }[]).find(
          (t) => t.title === title,
        )
      },
      { timeout: 15_000 },
    )
    .toMatchObject({ severity: 'high', type: 'bug' })
})

test('B02 Bug列表-搜索与严重度筛选', async ({ page, api }) => {
  const p = await newProject(api, 'Bug筛选项目')
  const a = await newBug(api, uniq('崩溃Bug'), p.id, { severity: 'critical' })
  const b = await newBug(api, uniq('样式Bug'), p.id, { severity: 'low' })
  await gotoBugs(page)

  // 筛选级联菜单：字段名回退英文 Severity
  await openBugFilter(page)
  const sevField = page.getByRole('menuitem', { name: /^Severity/ }).first()
  await sevField.hover()
  await page.getByRole('menuitemcheckbox', { name: /^严重/ }).last().click()
  // 条件条出现所选值（Linear 形态 chips）
  await expect(page.locator('body')).toContainText(/严重|Critical/, { timeout: 10_000 })
  await openBugFilter(page)
  await expect(page.getByText(a.title, { exact: true }).first()).toBeVisible({ timeout: 15_000 })

  // 搜索在弹层内
  await openBugFilter(page)
  // 严重度筛选仍生效：搜索命中筛选内目标（a 为严重）
  const search = page.getByRole('menu').getByPlaceholder(/搜索|Search/)
  await search.fill(a.title)
  await expect(page.getByText(a.title, { exact: true }).first()).toBeVisible({ timeout: 15_000 })
  await page.keyboard.press('Escape')
})

test('B03 Bug Board 拖拽改严重度', async ({ page, api }) => {
  const p = await newProject(api, 'Bug拖拽项目')
  const t = await newBug(api, uniq('拖拽Bug'), p.id, { severity: 'low' })
  const anchor = await newBug(api, uniq('锚点Bug'), p.id, { severity: 'critical' })
  await gotoBugs(page)
  await page.getByRole('button', { name: 'Board', exact: true }).click()
  // 看板切入时默认按状态分组：拖拽改严重度前先切「按严重性」分组
  await page.getByRole('button', { name: 'Display' }).click()
  const sevGroup = page.getByRole('menu').getByRole('button', { name: /按严重性|Severity/ }).first()
  if (await sevGroup.isVisible().catch(() => false)) {
    await sevGroup.click()
    await page.keyboard.press('Escape')
  } else {
    await page.keyboard.press('Escape')
  }

  const card = page.getByText(t.title, { exact: true }).first()
  await card.waitFor({ state: 'visible' })
  const anchorCard = page.getByText(anchor.title, { exact: true }).first()
  await anchorCard.waitFor({ state: 'visible' })
  await dragUntil(
    page,
    card,
    anchorCard,
    () =>
      api
        .getTask(t.id)
        .then((r) => r.severity === 'critical')
        .catch(() => false),
  )
})

test('B04 Bug 行右键菜单-状态/严重度直改', async ({ page, api }) => {
  const p = await newProject(api, 'Bug右键项目')
  const t = await newBug(api, uniq('右键Bug'), p.id)
  await gotoBugs(page)

  await openRowContextMenu(page, t.title)
  await pickContextMenu(page, ['状态', 'In Progress'])
  await expect.poll(async () => (await api.getTask(t.id)).status).toBe('in_progress')

  await openRowContextMenu(page, t.title)
  await pickContextMenu(page, ['严重度', 'Critical'])
  await expect.poll(async () => String((await api.getTask(t.id)).severity)).toBe('critical')
})

test('B05 Bug 批量删除', async ({ page, api }) => {
  const p = await newProject(api, 'Bug批量项目')
  const a = await newBug(api, uniq('批量Bug甲'), p.id)
  const c = await newBug(api, uniq('批量Bug乙'), p.id)
  await gotoBugs(page)

  const rowA = page.locator('div[data-row-id]').filter({ has: page.getByText(a.title, { exact: true }) })
  const rowC = page.locator('div[data-row-id]').filter({ has: page.getByText(c.title, { exact: true }) })
  await rowA.getByRole('checkbox').click()
  await rowC.getByRole('checkbox').click()
  await expect(page.getByText('2 selected')).toBeVisible()
  await page.getByRole('button', { name: /^删除$/ }).first().click()
  await confirmDialog(page, /^删除$/)
  cleanupTasks = cleanupTasks.filter((id) => id !== a.id && id !== c.id)
  await expect
    .poll(
      async () =>
        api
          .getTask(a.id)
          .then(() => false)
          .catch(() => true),
      { timeout: 15_000 },
    )
    .toBe(true)
})

// ---------------------------------------------------------------------------
test('B06 Bug 详情页-标题热编辑与侧栏属性', async ({ page, api }) => {
  const p = await newProject(api, 'Bug详情项目')
  const t = await newBug(api, uniq('详情Bug'), p.id)
  await page.goto(`/app/bugs/${t.id}`)
  await page.waitForURL(new RegExp(`/app/bugs/${t.id}`), { timeout: 30_000 })
  await page.locator('textarea').first().waitFor({ state: 'visible', timeout: 60_000 })

  // 标题热编辑
  const renamed = uniq('Bug改名')
  await page.locator('textarea').first().fill(renamed)
  await page.waitForTimeout(2500)
  await expect.poll(async () => (await api.getTask(t.id)).title, { timeout: 15_000 }).toBe(renamed)

  // 侧栏状态/严重度
  const sidebar = page.locator('aside').filter({ hasText: '负责人' }).last()
  await pickCapsuleOption(page, sidebar, /^状态$/, /^进行中$/, /进行中/)
  await expect.poll(async () => (await api.getTask(t.id)).status).toBe('in_progress')
  await pickCapsuleOption(page, sidebar, /^严重度$/, /S2 一般|Medium/, /S2|Medium/)
  await expect.poll(async () => String((await api.getTask(t.id)).severity)).toBe('medium')
})

test('B07 Bug 详情页-评论', async ({ page, api }) => {
  const p = await newProject(api, 'Bug评论项目')
  const t = await newBug(api, uniq('评论Bug'), p.id)
  await page.goto(`/app/bugs/${t.id}`)
  await page.locator('textarea').first().waitFor({ state: 'visible', timeout: 60_000 })

  const input = page.getByPlaceholder('留下评论…')
  const comment = uniq('Bug评论')
  await input.fill(comment)
  await page.getByRole('button', { name: '发送评论' }).click()
  await expect(page.getByText(comment).first()).toBeVisible({ timeout: 15_000 })
})

test('B08 Bug 详情页-删除回列表', async ({ page, api }) => {
  const p = await newProject(api, 'Bug删除项目')
  const t = await newBug(api, uniq('删除Bug'), p.id)
  await page.goto(`/app/bugs/${t.id}`)
  await page.locator('textarea').first().waitFor({ state: 'visible', timeout: 60_000 })

  await page.getByRole('button', { name: /^删除$/ }).first().click()
  await confirmDialog(page, /删除|Delete/)
  await page.waitForURL(/\/app\/bugs/, { timeout: 15_000 })
  cleanupTasks = cleanupTasks.filter((id) => id !== t.id)
  await expect
    .poll(
      async () =>
        api
          .getTask(t.id)
          .then(() => false)
          .catch(() => true),
      { timeout: 15_000 },
    )
    .toBe(true)
})
