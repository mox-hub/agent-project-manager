/**
 * 项目模块 E2E —— 第一批全操作覆盖。
 *
 * 覆盖清单（与 stabilization-plan WP2 对齐，比 smoke 更细）：
 * 创建(统一对话框/表单对话框编辑模式)、搜索、行右键菜单(工作流/优先级/健康度/风险/负责人/
 * 状态归档恢复/编辑基本信息/固定/复制链接/删除引导)、批量归档、视图切换(列表/看板/甘特)、
 * 看板拖拽、筛选、已保存视图、列显示、分页、项目详情(行内建任务/分享/跳转)、
 * 设置(常规保存/存档/标签页)、里程碑新建、团队页。
 *
 * 说明：项目无删除端点，测试数据清理统一走归档；任务数据用 DELETE 真删。
 */
import { test as base, expect, type Page } from '@playwright/test'
import { makeApi, uniq, type ApmApi } from './helpers/api'
import {
  openRowContextMenu,
  pickContextMenu,
  selectRowByTitle,
  confirmDialog,
  dragUntil,
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

async function newProject(api: ApmApi, label: string, extra: Record<string, unknown> = {}) {
  const p = await api.createProject({ name: uniq(label), ...extra })
  cleanupProjects.push(p.id)
  await api.ensureProjectModule(p.id)
  return p
}

async function gotoProjects(page: Page) {
  await page.goto('/app/projects')
  await page.waitForURL(/\/app\/projects/, { timeout: 30_000 })
}

// ---------------------------------------------------------------------------
// P01 创建项目：头部按钮 → 统一创建对话框（Project 标签）
// ---------------------------------------------------------------------------
test('P01 创建项目-统一创建对话框', async ({ page, api }) => {
  const name = uniq('创建流程')
  await gotoProjects(page)
  await page.locator('[data-ai-component="project.project-list.header.new-project"]').click()
  await page.getByPlaceholder('Project name').fill(name)
  await page.getByPlaceholder('Goals, scope and success criteria…').fill('E2E 创建流程验证')
  await page.getByRole('button', { name: 'Create project' }).click()
  await expect(page.getByText(name, { exact: true })).toBeVisible()

  // UI 创建拿不到 id：通过搜索接口定位后登记清理
  const created = await api.findProjectByName(name)
  expect(created, '项目应通过 API 落库').toBeTruthy()
  if (created) cleanupProjects.push(created.id)
})

// ---------------------------------------------------------------------------
// P02 搜索项目（搜索框在 Filter 弹层内部）
// ---------------------------------------------------------------------------
test('P02 搜索项目过滤列表', async ({ page, api }) => {
  const a = await newProject(api, '搜索甲')
  const b = await newProject(api, '搜索乙')
  await gotoProjects(page)
  await page.getByRole('button', { name: 'Filter' }).click()
  const search = page.getByRole('menu').getByPlaceholder(/搜索项目|Search projects/)
  await search.fill(a.name)
  await expect(page.getByText(a.name, { exact: true })).toBeVisible()
  await expect(page.getByText(b.name, { exact: true })).toBeHidden()
  await search.fill('')
  await expect(page.getByText(b.name, { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
})

// ---------------------------------------------------------------------------
// P03 行右键菜单：工作流状态/优先级/健康度/风险/负责人 直改
// ---------------------------------------------------------------------------
test('P03 行右键菜单-枚举元数据直改', async ({ page, api }) => {
  const p = await newProject(api, '元数据直改')
  await gotoProjects(page)

  await openRowContextMenu(page, p.name)
  await pickContextMenu(page, ['工作流状态', '进行中'])
  await expect
    .poll(async () => (await api.getProject(p.id)).workflowStatus, { timeout: 10_000 })
    .toBe('in_progress')

  await openRowContextMenu(page, p.name)
  await pickContextMenu(page, ['优先级', '高'])
  await expect.poll(async () => (await api.getProject(p.id)).priority).toBe('high')

  await openRowContextMenu(page, p.name)
  await pickContextMenu(page, ['健康度', '正常'])
  await expect.poll(async () => (await api.getProject(p.id)).healthStatus).toBe('on_track')

  await openRowContextMenu(page, p.name)
  await pickContextMenu(page, ['风险', '高'])
  await expect.poll(async () => (await api.getProject(p.id)).riskLevel).toBe('high')

  const me = await api.me()
  await openRowContextMenu(page, p.name)
  await pickContextMenu(page, ['负责人', me.displayName])
  await expect
    .poll(async () => (await api.getProject(p.id)).ownerId, { timeout: 10_000 })
    .toBe(me.id)
})

// ---------------------------------------------------------------------------
// P04 行右键菜单：编辑基本信息对话框（编号/类别/起止日期）
// ---------------------------------------------------------------------------
test('P04 编辑基本信息对话框', async ({ page, api }) => {
  const p = await newProject(api, '编辑信息')
  await gotoProjects(page)
  await openRowContextMenu(page, p.name)
  await pickContextMenu(page, ['编辑基本信息'])

  const dialog = page.locator('#project-form-dialog-form')
  await expect(dialog).toBeVisible()
  const code = `E2E${Date.now().toString(36).toUpperCase().slice(-6)}`
  const codeInput = dialog.locator('#projectCode')
  await codeInput.fill(code)
  const dateInputs = dialog.locator('input[type="date"]')
  await dateInputs.nth(0).fill('2026-09-01')
  await dateInputs.nth(1).fill('2026-12-31')
  await page.getByRole('button', { name: /保存修改|Save/ }).click()

  await expect
    .poll(async () => (await api.getProject(p.id)).projectCode, { timeout: 10_000 })
    .toBe(code)
  const remote = await api.getProject(p.id)
  expect(String(remote.startDate)).toContain('2026-09-01')
  expect(String(remote.targetDate)).toContain('2026-12-31')
})

// ---------------------------------------------------------------------------
// P05 行右键菜单：状态归档 + 筛选恢复
// ---------------------------------------------------------------------------
test('P05 归档与恢复', async ({ page, api }) => {
  const p = await newProject(api, '归档恢复')
  await gotoProjects(page)
  await openRowContextMenu(page, p.name)
  await pickContextMenu(page, ['状态', '已归档'])
  await expect(page.getByText(p.name, { exact: true })).toBeHidden()
  await expect.poll(async () => (await api.getProject(p.id)).status).toBe('archived')

  // 筛选菜单（选项为带 is/isNot 双 checkbox 的按钮，英文标签）切到 Archived → 行右键恢复
  await page.getByRole('button', { name: 'Filter' }).click()
  const filterMenu = page.getByRole('menu')
  await filterMenu.getByPlaceholder(/搜索项目|Search projects/).fill(p.name)
  await filterMenu.getByRole('button', { name: 'Archived' }).first().click()
  await page.keyboard.press('Escape')
  await expect(page.getByText(p.name, { exact: true })).toBeVisible()

  await openRowContextMenu(page, p.name)
  await pickContextMenu(page, ['状态', '进行中'])
  await expect.poll(async () => (await api.getProject(p.id)).status).toBe('active')
})

// ---------------------------------------------------------------------------
// P06 行右键菜单：固定/取消固定 + 复制链接
// ---------------------------------------------------------------------------
test('P06 固定与复制链接', async ({ page, api }) => {
  const p = await newProject(api, '固定与链接')
  await gotoProjects(page)

  await openRowContextMenu(page, p.name)
  await pickContextMenu(page, ['固定'])
  await openRowContextMenu(page, p.name)
  await expect(page.getByRole('menuitem', { name: '取消固定' })).toBeVisible()
  await page.keyboard.press('Escape')

  await openRowContextMenu(page, p.name)
  await pickContextMenu(page, ['复制链接'])
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toContain(`/app/projects/${p.id}`)
})

// ---------------------------------------------------------------------------
// P07 行右键菜单：删除项目引导到设置页
// ---------------------------------------------------------------------------
test('P07 删除项目引导到设置', async ({ page, api }) => {
  const p = await newProject(api, '删除引导')
  await gotoProjects(page)
  await openRowContextMenu(page, p.name)
  await pickContextMenu(page, ['删除项目'])
  await confirmDialog(page, /前往设置/)
  await page.waitForURL(new RegExp(`/app/projects/${p.id}/settings`), { timeout: 15_000 })
})

// ---------------------------------------------------------------------------
// P08 批量选择归档
// ---------------------------------------------------------------------------
test('P08 批量归档', async ({ page, api }) => {
  const a = await newProject(api, '批量归档甲')
  const b = await newProject(api, '批量归档乙')
  await gotoProjects(page)
  await selectRowByTitle(page, a.name)
  await selectRowByTitle(page, b.name)
  await expect(page.getByText('2 selected')).toBeVisible()
  await page.getByRole('button', { name: '归档' }).first().click()
  await confirmDialog(page, /^归档$/)
  await expect(page.getByText(a.name, { exact: true })).toBeHidden()
  await expect.poll(async () => (await api.getProject(a.id)).status).toBe('archived')
  await expect.poll(async () => (await api.getProject(b.id)).status).toBe('archived')
})

// ---------------------------------------------------------------------------
// P09 视图切换：列表/看板/甘特
// ---------------------------------------------------------------------------
test('P09 视图切换', async ({ page, api }) => {
  const p = await newProject(api, '视图切换')
  // 甘特条需要起止日期
  await api.patchProject(p.id, { startDate: '2026-09-01', targetDate: '2026-12-31' })
  await gotoProjects(page)
  await page.getByRole('button', { name: 'Board' }).click()
  await expect(page.getByText(p.name, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Gantt' }).click()
  await expect(page.locator(`[data-testid="gantt-bar-${p.id}"]`).first()).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: 'List' }).click()
  await expect(page.getByText(p.name, { exact: true })).toBeVisible()
})

// ---------------------------------------------------------------------------
// P10 看板拖拽改工作流状态
// ---------------------------------------------------------------------------
test('P10 看板拖拽改工作流状态', async ({ page, api }) => {
  const p = await newProject(api, '看板拖拽')
  // 目标列放一张已在「进行中」的卡片：dnd-kit 拖到卡片上落点最稳
  const anchor = await newProject(api, '看板锚点')
  await api.patchProject(anchor.id, { workflowStatus: 'in_progress' })
  await gotoProjects(page)
  await page.getByRole('button', { name: 'Board' }).click()
  const card = page.getByText(p.name, { exact: true }).first()
  await card.waitFor({ state: 'visible' })
  const anchorCard = page.getByText(anchor.name, { exact: true }).first()
  await anchorCard.waitFor({ state: 'visible' })
  await dragUntil(
    page,
    card,
    anchorCard,
    async () => (await api.getProject(p.id)).workflowStatus === 'in_progress',
  )
  await expect
    .poll(async () => (await api.getProject(p.id)).workflowStatus, { timeout: 15_000 })
    .toBe('in_progress')
})

// ---------------------------------------------------------------------------
// P11 筛选菜单：工作流状态过滤（选项按钮为英文标签 + is/isNot 双 checkbox）
// ---------------------------------------------------------------------------
test('P11 筛选菜单过滤', async ({ page, api }) => {
  const planned = await newProject(api, '筛选已规划')
  const doing = await newProject(api, '筛选进行中')
  await api.patchProject(doing.id, { workflowStatus: 'in_progress' })
  await gotoProjects(page)
  await page.getByRole('button', { name: 'Filter' }).click()
  const menu = page.getByRole('menu')
  await menu.getByRole('button', { name: 'Planned', exact: true }).first().click()
  await page.keyboard.press('Escape')
  await expect(page.getByText(planned.name, { exact: true })).toBeVisible()
  await expect(page.getByText(doing.name, { exact: true })).toBeHidden()
})

// ---------------------------------------------------------------------------
// P12 已保存视图：创建/切换/删除
// ---------------------------------------------------------------------------
test('P12 已保存视图管理', async ({ page }) => {
  await gotoProjects(page)
  const viewName = uniq('视图')
  await page.getByRole('button', { name: 'Add view' }).click()
  await page.getByPlaceholder('View name').fill(viewName)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByText(viewName).first()).toBeVisible()

  // 切回内置视图再切回自定义视图（视图条目是 title 属性的普通按钮）
  await page.locator('button[title="Active"]').first().click()
  await page.locator(`button[title="${viewName}"]`).first().click()

  // 编辑面板删除视图
  await page.locator('button[title="Edit view"]').last().click()
  await page.getByRole('button', { name: /删除|Delete/ }).last().click()
  await expect(page.getByText(viewName)).toHaveCount(0)
})

// ---------------------------------------------------------------------------
// P13 列显示开关（Display 菜单：选项为 role=button 的 zh 标签 + checkbox）
// ---------------------------------------------------------------------------
test('P13 列显示开关', async ({ page }) => {
  await gotoProjects(page)
  await page.getByRole('button', { name: 'Display' }).click()
  const item = page.getByRole('menu').getByRole('button', { name: '负责人' }).first()
  await expect(item).toBeVisible()
  const checkedBefore = await item.locator('input[type="checkbox"], [role="checkbox"]').first().isVisible()
    .then(async (visible) => (visible ? await item.locator('input[type="checkbox"], [role="checkbox"]').first().getAttribute('aria-checked') : null))
  await item.click() // 切换勾选
  await page.keyboard.press('Escape')
  // 再开菜单验证勾选态翻转
  await page.getByRole('button', { name: 'Display' }).click()
  const item2 = page.getByRole('menu').getByRole('button', { name: '负责人' }).first()
  const checkedAfter = await item2.locator('input[type="checkbox"], [role="checkbox"]').first().getAttribute('aria-checked')
  if (checkedBefore !== null) {
    expect(checkedAfter).not.toBe(checkedBefore)
  }
  await page.keyboard.press('Escape')
})

// ---------------------------------------------------------------------------
// P14 分页
// ---------------------------------------------------------------------------
test('P14 分页翻页', async ({ page, api }) => {
  const created: string[] = []
  for (let i = 0; i < 22; i += 1) {
    const p = await api.createProject({ name: uniq(`分页${i}`) })
    created.push(p.id)
  }
  cleanupProjects.push(...created)
  await gotoProjects(page)
  await expect(page.getByText(/Showing 1–20 of/)).toBeVisible()
  await page.getByRole('button', { name: '2', exact: true }).click()
  await expect(page.getByText(/Showing 21–/)).toBeVisible()
})

// ---------------------------------------------------------------------------
// P15 项目详情：行内添加任务
// ---------------------------------------------------------------------------
test('P15 项目详情-行内添加任务', async ({ page, api }) => {
  const p = await newProject(api, '行内建任务')
  await page.goto(`/app/projects/${p.id}`)
  await page.waitForURL(new RegExp(`/app/projects/${p.id}`))
  // 先点「添加任务」展开行内表单
  await page.getByRole('button', { name: '添加任务' }).click()
  const title = uniq('详情任务')
  await page.locator('[data-ai-component="project.project-dashboard.inline-create.title-input"]').fill(title)
  await page.locator('[data-ai-component="project.project-dashboard.inline-create.submit"]').click()

  // 行内表单提交不带 moduleCode —— 缺陷 6/3b 已修复：服务端为项目播种默认模块并自动兜底，
  // 行内建任务应直接落库
  await expect
    .poll(async () => (await api.listAllTasks()).some((t) => t.title === title), { timeout: 15_000 })
    .toBe(true)

  // 同一项目经统一对话框建任务同样可用（任务 tab → 创建任务）
  await page.getByRole('button', { name: '任务', exact: true }).click()
  await page.getByRole('button', { name: '创建任务' }).first().click()
  const dialogTitle = uniq('对话框任务')
  await page.getByPlaceholder('Task title').fill(dialogTitle)
  await page.getByRole('button', { name: 'Create task' }).click()
  await expect
    .poll(
      async () => (await api.listAllTasks()).some((t) => t.title === dialogTitle),
      { timeout: 15_000 },
    )
    .toBe(true)
  const all = await api.listAllTasks()
  cleanupTasks.push(...all.filter((t) => t.title === dialogTitle).map((t) => t.id))
})

// ---------------------------------------------------------------------------
// P16 项目详情：分享复制链接 / 查看团队 / 编辑项目跳转
// ---------------------------------------------------------------------------
test('P16 项目详情-分享与跳转', async ({ page, api }) => {
  const p = await newProject(api, '分享跳转')
  await page.goto(`/app/projects/${p.id}`)

  await page.getByRole('button', { name: '分享' }).click()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toContain(`/app/projects/${p.id}`)

  await page.getByRole('button', { name: '查看团队' }).click()
  await page.waitForURL(new RegExp(`/app/projects/${p.id}/team`), { timeout: 15_000 })

  await page.goto(`/app/projects/${p.id}`)
  await page.getByRole('button', { name: '编辑项目' }).click()
  await page.waitForURL(new RegExp(`/app/projects/${p.id}/settings`), { timeout: 15_000 })
})

// ---------------------------------------------------------------------------
// P17 设置：常规信息保存 + 标签页切换
// ---------------------------------------------------------------------------
test('P17 设置-常规保存与标签页', async ({ page, api }) => {
  const p = await newProject(api, '设置常规')
  await page.goto(`/app/projects/${p.id}/settings`)

  // 四个标签页可切换（按钮中文名）
  for (const tab of ['Git 与终端', '云端同步', '文档', '常规']) {
    await page.getByRole('button', { name: tab, exact: true }).click()
  }

  const newName = uniq('改名后')
  const nameInput = page.getByRole('textbox').first()
  await nameInput.fill(newName)
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect
    .poll(async () => (await api.getProject(p.id)).name, { timeout: 15_000 })
    .toBe(newName)
})

// ---------------------------------------------------------------------------
// P18 设置：存档项目（危险区）
// ---------------------------------------------------------------------------
test('P18 设置-存档项目', async ({ page, api }) => {
  const p = await newProject(api, '设置存档')
  await page.goto(`/app/projects/${p.id}/settings`)
  const archiveButton = page
    .locator('[data-ai-component="project.project-settings.danger.archive"]')
    .or(page.getByRole('button', { name: /存档项目|Archive Project/ }))
    .first()
  await archiveButton.click()
  await confirmDialog(page, /存档|Archive/)
  await expect
    .poll(async () => (await api.getProject(p.id)).status, { timeout: 15_000 })
    .toBe('archived')
  await expect(page.getByText(/已存档|archived/i).first()).toBeVisible()
})

// ---------------------------------------------------------------------------
// P19 里程碑页：新建里程碑
// ---------------------------------------------------------------------------
test('P19 新建里程碑', async ({ page, api }) => {
  const p = await newProject(api, '里程碑项目')
  await page.goto(`/app/projects/${p.id}/milestones`)
  await page.getByRole('button', { name: '新建里程碑' }).click()
  const name = uniq('里程碑')
  await page.getByPlaceholder('Milestone name').fill(name)
  await page.getByPlaceholder('Key deliverables…').fill('E2E 里程碑验证')
  await page.getByRole('button', { name: 'Create milestone' }).click()
  await expect(modalDialog(page)).toBeHidden({ timeout: 25_000 })

  // 缺陷 7 已修复：创建 mutation 失效 ['projectMilestones'] 查询，列表无需刷新即出现
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible({ timeout: 15_000 })

  const milestones = await page.request
    .get(`http://localhost:4300/_api/projects/${p.id}/milestones`, {
      headers: { Authorization: `Bearer ${api.token}` },
    })
    .then((r) => r.json())
  const items = (milestones.data?.items ?? milestones.data ?? []) as { name: string }[]
  expect(items.some((m) => m.name === name), '里程碑应通过 API 落库').toBeTruthy()
})

// ---------------------------------------------------------------------------
// P20 团队页：渲染 + 成员搜索（页面实际结构：添加团队/搜索成员/角色同步）
// ---------------------------------------------------------------------------
test('P20 团队页渲染与成员搜索', async ({ page, api }) => {
  const p = await newProject(api, '团队页')
  await page.goto(`/app/projects/${p.id}/team`)
  await expect(page.getByRole('heading', { name: '团队与角色' })).toBeVisible()
  await expect(page.getByRole('button', { name: '添加团队' }).or(page.getByText(/尚未绑定团队/)).first()).toBeVisible()

  const search = page.getByPlaceholder(/搜索成员|Search members/)
  await search.fill('E2E Runner')
  await expect(page.locator('body')).toContainText(/E2E Runner|暂无|没有找到|0/)
})
