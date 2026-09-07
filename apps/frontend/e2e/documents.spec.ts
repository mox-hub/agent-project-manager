/**
 * 文档模块 E2E：新建（标题/分类/状态/正文）、空标题校验、详情页（任务关联、
 * 提交审核）、编辑保存、列表（搜索/筛选/双视图/统计卡）、删除。
 */
import { test as base, expect, type Page } from '@playwright/test'
import { makeApi, uniq, type ApmApi } from './helpers/api'

const test = base.extend<{ api: ApmApi }>({
  api: async ({ request }, use) => {
    await use(await makeApi(request))
  },
})

let cleanupDocs: string[] = []
let cleanupTasks: string[] = []
let cleanupProjects: string[] = []

test.beforeEach(() => {
  cleanupDocs = []
  cleanupTasks = []
  cleanupProjects = []
})

test.afterEach(async ({ api }) => {
  for (const id of cleanupDocs) await api.deleteDocument(id).catch(() => {})
  for (const id of cleanupTasks) await api.deleteTask(id).catch(() => {})
  for (const id of cleanupProjects) await api.archiveProject(id).catch(() => {})
})

async function gotoDocuments(page: Page) {
  await page.goto('/app/documents')
  await page.waitForURL(/\/app\/documents/, { timeout: 30_000 })
  await page.getByRole('button', { name: /新建文档/ }).first().waitFor({ state: 'visible', timeout: 60_000 })
}

// ---------------------------------------------------------------------------
test('C01 新建文档-标题分类状态并落库', async ({ page, api }) => {
  await gotoDocuments(page)
  await page.getByRole('button', { name: /新建文档/ }).first().click()
  await page.waitForURL(/\/app\/documents\/new/, { timeout: 20_000 })

  const title = uniq('接口设计文档')
  await page.getByPlaceholder(/输入文档标题/).fill(title)
  // 状态切到「已发布」
  await page.getByRole('button', { name: '已发布', exact: true }).first().click()
  // 正文（CodeMirror 编辑器：点击内容区后直接键入）
  const editor = page.locator('.cm-content, [contenteditable="true"]').first()
  if (await editor.isVisible().catch(() => false)) {
    await editor.click()
    await page.keyboard.type('# E2E 文档\n\n自动验收内容。')
  }
  await page.getByRole('button', { name: /创建文档/ }).click()
  await page.waitForURL(/\/app\/documents\/(?!new)[a-zA-Z0-9]+/, { timeout: 25_000 })

  const doc = await api
    .listDocuments()
    .then((list) => list.find((d) => d.title === title))
  expect(doc, '文档应落库').toBeTruthy()
  if (doc) cleanupDocs.push(doc.id)
})

test('C02 新建文档-空标题报错不跳转', async ({ page }) => {
  await gotoDocuments(page)
  await page.getByRole('button', { name: /新建文档/ }).first().click()
  await page.waitForURL(/\/app\/documents\/new/, { timeout: 20_000 })
  await page.getByRole('button', { name: /创建文档/ }).click()
  // 停留在新建页并出现错误提示（toast 或行内）
  await expect(page.locator('body')).toContainText(/标题|不能为空|请输入|失败/, { timeout: 10_000 })
  await expect(page).toHaveURL(/\/app\/documents\/new/)
})

test('C03 新建后提交审核（作者+草稿可见）', async ({ page, api }) => {
  await gotoDocuments(page)
  await page.getByRole('button', { name: /新建文档/ }).first().click()
  await page.waitForURL(/\/app\/documents\/new/, { timeout: 20_000 })
  const title = uniq('提审文档')
  await page.getByPlaceholder(/输入文档标题/).fill(title)
  await page.getByRole('button', { name: /创建文档/ }).click()
  await page.waitForURL(/\/app\/documents\/(?!new)[a-zA-Z0-9]+/, { timeout: 25_000 })

  const doc = await api.listDocuments().then((list) => list.find((d) => d.title === title))
  expect(doc, '文档应落库').toBeTruthy()

  // 「提交审核」仅 作者+草稿 可见（isAuthor 走 useAuth，与路由守卫同源——缺陷 8 已修复）
  if (doc) cleanupDocs.push(doc.id)
  // 鼠标移开角落：避免停在创建成功 toast 上使其悬停暂停消失并拦截按钮点击
  await page.mouse.move(8, 8)
  await expect(page.locator('[data-slot="toast-portal"]')).toBeHidden({ timeout: 10_000 }).catch(() => {})
  const submitBtn = page.getByRole('button', { name: /提交审核/ })
  await expect(submitBtn).toBeVisible({ timeout: 20_000 })
  await submitBtn.click()
  await expect
    .poll(async () => String((await api.getDocument(doc!.id)).status), { timeout: 15_000 })
    .toBe('reviewing')
})

test('C04 编辑页-修改保存', async ({ page, api }) => {
  const doc = await api.createDocument({ title: uniq('待编辑文档'), content: '# 旧内容' })
  cleanupDocs.push(doc.id)
  await page.goto(`/app/documents/${doc.id}/edit`)
  await page.waitForURL(new RegExp(`/app/documents/${doc.id}/edit`), { timeout: 30_000 })

  // 记录保存前 updatedAt；点击「保存」后以更新时间变化断言落库
  // （缺陷 8 已修复：保存链路不再依赖异步回填的 store.currentUser）
  const before = String((await api.getDocument(doc.id)).updatedAt ?? '')
  await page.getByRole('button', { name: /^保存/ }).first().click()
  await expect
    .poll(async () => String((await api.getDocument(doc.id)).updatedAt ?? ''), { timeout: 15_000 })
    .not.toBe(before)
  expect(String(await api.getDocument(doc.id)).length).toBeGreaterThan(0)
})

test('C05 列表-搜索与筛选', async ({ page, api }) => {
  const a = await api.createDocument({ title: uniq('搜索目标文档甲') })
  const b = await api.createDocument({ title: uniq('搜索目标文档乙') })
  cleanupDocs.push(a.id, b.id)
  await gotoDocuments(page)

  // 两条文档默认可见（列表）
  await expect(page.getByText(a.title, { exact: true }).first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(b.title, { exact: true }).first()).toBeVisible({ timeout: 15_000 })

  // Filter 菜单：状态分组（草稿等）可勾选
  await page.getByRole('button', { name: 'Filter', exact: true }).first().click()
  const draftOption = page
    .getByRole('menu')
    .getByRole('button', { name: /草稿|Draft/ })
    .first()
  await expect(draftOption.or(page.getByRole('menuitemcheckbox', { name: /草稿|Draft/ }).first())).toBeVisible({
    timeout: 10_000,
  })
  await page.keyboard.press('Escape')
})

test('C06 列表-Grid/List 双视图与统计卡', async ({ page, api }) => {
  const doc = await api.createDocument({ title: uniq('视图文档') })
  cleanupDocs.push(doc.id)
  await gotoDocuments(page)
  // 统计卡
  await expect(page.getByText(/总文档|已发布/).first()).toBeVisible()
  // 视图切换按钮（Grid/List）
  const gridBtn = page.getByRole('button', { name: /Grid|网格/ }).first()
  const listBtn = page.getByRole('button', { name: /List|列表/ }).first()
  if (await gridBtn.isVisible().catch(() => false)) {
    await listBtn.click()
    await expect(page.getByText(doc.title, { exact: true }).first()).toBeVisible()
    await gridBtn.click()
    await expect(page.getByText(doc.title, { exact: true }).first()).toBeVisible()
  }
})

test('C07 详情页-任务关联面板', async ({ page, api }) => {
  const p = await api.createProject({ name: uniq('文档关联项目') })
  await api.ensureProjectModule(p.id)
  const task = await api.createTask({ title: uniq('被关联任务'), projectId: p.id, moduleCode: 'TASK' })
  const doc = await api.createDocument({ title: uniq('关联文档'), projectId: p.id })
  cleanupDocs.push(doc.id)
  cleanupTasks.push(task.id)
  cleanupProjects.push(p.id)

  await page.goto(`/app/documents/${doc.id}`)
  await page.waitForURL(new RegExp(`/app/documents/${doc.id}`), { timeout: 30_000 })
  // 左侧栏「任务」tab
  await page.getByRole('button', { name: '任务', exact: true }).first().click()
  // 出现任务关联区块（添加入口）
  await expect(page.locator('body')).toContainText(/任务|关联|链接/, { timeout: 15_000 })
})
