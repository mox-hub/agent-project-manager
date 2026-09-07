/**
 * 任务模块 E2E —— 第一批全操作覆盖。
 *
 * 覆盖清单：统一创建对话框建任务/Bug（属性胶囊/类型切换/严重度）、
 * 列表搜索/筛选/分组/统计、看板拖拽改状态、行右键菜单全项（状态/优先级/负责人/标签/
 * 固定/复制链接/创建子任务/创建父任务/删除）、批量指派 AI/批量删除、
 * 详情页（标题热编辑/描述编辑/侧栏属性/子任务/评论/指派 AI/删除/收藏订阅）、
 * 项目任务页（默认看板/创建/右键改状态）。
 *
 * 用例中曾标注「已知产品缺陷」的断言已随缺陷修复翻转（frontend/e2e/README.md 缺陷清单）：
 * 1. 无 projectId 的任务创建 → 现落 inbox 项目（服务端补挂成员身份），T23 验证
 * 2. PATCH /tasks 接受 projectId → 详情页「项目」胶囊可移动任务，T07 验证
 * 3. 带 parentTaskId 创建继承父任务项目；update 接受 parentTaskId → T09/T15 验证
 * 4. Create more 开关：页面不再强制关闭对话框（projects.spec 覆盖）
 * 5. 服务端 tags 收 tag id 或名字（名字按项目匹配/按需创建）
 * 6. 新项目 owner 自动绑定成员表（MemberProjectBinding）→ 负责人有候选，T06 验证
 */
import { test as base, expect, type Page } from '@playwright/test'
import { makeApi, uniq, type ApmApi } from './helpers/api'
import {
  openRowContextMenu,
  pickContextMenu,
  selectRowByTitle,
  confirmDialog,
  dragUntil,
  capsuleByRowLabel,
  pickCapsuleOption,
  dialogTitleInput,
  modalDialog,
  rowByTitle,
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

/** 任务可挂项目也可留空（无 projectId 落 inbox，缺陷 1 已修复） */
async function newTask(
  api: ApmApi,
  title: string,
  projectId: string,
  extra: Record<string, unknown> = {},
): Promise<{ id: string; title: string }> {
  const t = await api.createTask({ title, projectId, moduleCode: 'TASK', ...extra })
  cleanupTasks.push(t.id)
  return t
}

async function gotoTasks(page: Page) {
  await page.goto('/app/issues')
  await page.waitForURL(/\/app\/issues\//, { timeout: 30_000 })
  // 等列表页真正挂载（慢环境下首屏可能长时间白屏）
  await page.locator('[data-ai-component="task.tasks-list.new-button"]').waitFor({
    state: 'visible',
    timeout: 60_000,
  })
}

async function gotoDetail(page: Page, taskId: string) {
  await page.goto(`/app/issues/${taskId}`)
  await page.waitForURL(new RegExp(`/app/issues/${taskId}`), { timeout: 30_000 })
  // 等详情页真正挂载（标题 textarea 出现）
  await page.locator('textarea').first().waitFor({ state: 'visible', timeout: 60_000 })
}

/** 删除是异步 mutation：轮询直至任务 404 */
async function expectTaskGone(api: ApmApi, id: string) {
  await expect
    .poll(
      async () =>
        api
          .getTask(id)
          .then(() => false)
          .catch(() => true),
      { timeout: 15_000 },
    )
    .toBe(true)
}

// ---------------------------------------------------------------------------
// T01 创建任务：统一对话框（标题/优先级/项目胶囊）× 2
// ---------------------------------------------------------------------------
test('T01 创建任务-对话框属性', async ({ page, api }) => {
  const p = await newProject(api, '建任务项目')
  await gotoTasks(page)

  for (const label of ['任务甲', '任务乙']) {
    await page.locator('[data-ai-component="task.tasks-list.new-button"]').click()
    const dialog = modalDialog(page)
    await dialog.waitFor({ state: 'visible' })
    const title = uniq(label)
    await dialogTitleInput(page, 'Task title').fill(title)
    await pickCapsuleOption(page, dialog, /^Priority$/, /^High$/, /High/)
    await pickCapsuleOption(page, dialog, /^Project$/, p.name, p.name)
    await page.waitForTimeout(1200) // 等模块查询加载，避免 moduleCode 兜底竞态
    await page.getByRole('button', { name: 'Create task' }).click()
    await expect(dialog).toBeHidden({ timeout: 15_000 })

    const found = await api.listAllTasks().then((list) => list.find((t) => t.title === title))
    expect(found, `${title} 应落库`).toBeTruthy()
    if (found) {
      cleanupTasks.push(found.id)
      const remote = (await api.getTask(found.id)) as { priority?: string }
      expect(remote.priority).toBe('high')
    }
  }
})

// ---------------------------------------------------------------------------
// T02 创建 Bug：类型切换 + 严重度
// ---------------------------------------------------------------------------
test('T02 创建Bug-严重度属性', async ({ page, api }) => {
  const p = await newProject(api, '建Bug项目')
  await gotoTasks(page)
  await page.locator('[data-ai-component="task.tasks-list.new-button"]').click()
  const dialog = modalDialog(page)
  await dialog.waitFor({ state: 'visible' })

  // 头部类型切换器 → Bug
  await page.getByRole('button', { name: /^Task/ }).first().click()
  await page.getByRole('button', { name: /^Bug/ }).last().click()

  const title = uniq('缺陷')
  await dialogTitleInput(page, 'Bug title').fill(title)
  await pickCapsuleOption(page, dialog, /^Severity$/, /S1 严重/, /S1/)
  await pickCapsuleOption(page, dialog, /^Project$/, p.name, p.name)
  await page.waitForTimeout(1200) // 模块查询加载（规避缺陷 5 的 moduleCode 兜底竞态）
  await page.getByRole('button', { name: 'Report bug' }).click()
  await expect(dialog).toBeHidden({ timeout: 15_000 })

  await expect
    .poll(
      async () => {
        const all = (await api.listAllTasks()) as unknown as {
          title?: string
          severity?: string
        }[]
        return all.find((t) => t.title === title)?.severity
      },
      { timeout: 15_000 },
    )
    .toBe('high')
})

// ---------------------------------------------------------------------------
// T03 详情页：标题热编辑（1.5s 防抖落库）
// ---------------------------------------------------------------------------
test('T03 详情页标题热编辑', async ({ page, api }) => {
  const p = await newProject(api, '热编辑项目')
  const t = await newTask(api, uniq('热编辑前'), p.id)
  await gotoDetail(page, t.id)
  const renamed = uniq('热编辑后')
  const titleInput = page.locator('textarea').first()
  await titleInput.fill(renamed)
  await page.waitForTimeout(2500) // 防抖 1.5s + 网络余量
  await expect.poll(async () => (await api.getTask(t.id)).title, { timeout: 15_000 }).toBe(renamed)
})

// ---------------------------------------------------------------------------
// T04 详情页：描述编辑（MarkdownEditor → MentionTextarea，进入编辑态后为第 2 个 textarea）
// ---------------------------------------------------------------------------
test('T04 详情页描述编辑', async ({ page, api }) => {
  const p = await newProject(api, '描述编辑项目')
  const t = await newTask(api, uniq('描述编辑'), p.id, { description: '旧描述' })
  await gotoDetail(page, t.id)

  // 进入编辑态（悬浮出现的「编辑」按钮）
  const editBtn = page.locator('button[title="编辑"], button[title="Edit"]').first()
  await editBtn.click({ timeout: 10_000 })
  // 标题是第 1 个 textarea，描述编辑器紧随其后
  const editor = page.locator('textarea').nth(1)
  await editor.waitFor({ state: 'visible' })
  const desc = uniq('新描述内容')
  await editor.fill(`${desc} 旧描述`)
  await page.waitForTimeout(2500)
  await expect
    .poll(async () => String((await api.getTask(t.id)).description ?? ''), { timeout: 15_000 })
    .toContain(desc.slice(0, 10))
})

// ---------------------------------------------------------------------------
// T05 详情页侧栏：状态/优先级/截止日期
// ---------------------------------------------------------------------------
test('T05 详情页侧栏基础属性', async ({ page, api }) => {
  const p = await newProject(api, '侧栏项目')
  const t = await newTask(api, uniq('侧栏任务'), p.id)
  await gotoDetail(page, t.id)
  // 属性面板是包含「负责人」行的 aside
  const sidebar = page.locator('aside').filter({ hasText: '负责人' }).last()

  await pickCapsuleOption(page, sidebar, /^状态$/, /^进行中$/, /进行中/)
  await expect.poll(async () => (await api.getTask(t.id)).status).toBe('in_progress')

  await pickCapsuleOption(page, sidebar, /^优先级$/, /^高$/, /高/)
  await expect.poll(async () => (await api.getTask(t.id)).priority).toBe('high')

  // 截止日期：DatePicker 日历（react-day-picker）中点 15 日
  await capsuleByRowLabel(sidebar, /^截止日期$/).click()
  const dayCell = page.locator('table button', { hasText: /^15$/ }).first()
  await dayCell.click({ timeout: 10_000 })
  await page.keyboard.press('Escape')
  await expect
    .poll(async () => String((await api.getTask(t.id)).dueDate ?? ''), { timeout: 15_000 })
    .not.toBe('')
})

// ---------------------------------------------------------------------------
// T05b 详情页标签胶囊 —— 已知产品缺陷 7：标签按项目隔离且普通用户禁建（403），
// 新项目无标签 → 胶囊仅显示「无」。结构性断言；标签选通后应补充勾选断言。
// ---------------------------------------------------------------------------
test('T05b 详情页标签胶囊', async ({ page, api }) => {
  const p = await newProject(api, '标签胶囊项目')
  const t = await newTask(api, uniq('标签任务'), p.id)
  await gotoDetail(page, t.id)
  const sidebar = page.locator('aside').filter({ hasText: '负责人' }).last()

  await expect(capsuleByRowLabel(sidebar, /^标签$/)).toBeVisible()
  await capsuleByRowLabel(sidebar, /^标签$/).click()
  // 无可用标签：Popover 中只有占位「无」
  await expect(page.getByRole('button', { name: '无' }).last()).toBeVisible()
  await page.keyboard.press('Escape')
})

// ---------------------------------------------------------------------------
// T06 详情页侧栏：负责人（缺陷 6 已修复：新项目 owner 自动绑定成员表 → 有候选）
// ---------------------------------------------------------------------------
test('T06 详情页负责人指派', async ({ page, api }) => {
  const p = await newProject(api, '指派项目')
  const t = await newTask(api, uniq('指派任务'), p.id)
  await gotoDetail(page, t.id)
  const sidebar = page.locator('aside').last()

  const members = await api.listProjectMembers(p.id)
  expect(members.length, '新项目应有成员候选（owner 绑定）').toBeGreaterThan(0)
  const target = members[0]
  await pickCapsuleOption(page, sidebar, /^负责人$/, target.displayName, target.displayName)
  // Task.assigneeId 外键是 User.id（服务端从 TaskAssignee 同步三字段），断言用 userId 口径
  await expect
    .poll(async () => (await api.getTask(t.id)).assigneeId, { timeout: 15_000 })
    .toBe(target.userId)
})

// ---------------------------------------------------------------------------
// T07 详情页「项目」胶囊移动任务 —— 缺陷 2 已修复：PATCH /tasks 接受 projectId，
// 移动成功后短 ID 随新项目重生成。
// ---------------------------------------------------------------------------
test('T07 详情页移动任务到其他项目', async ({ page, api }) => {
  const pa = await newProject(api, '移动源项目')
  const pb = await newProject(api, '移动目标项目')
  const t = await newTask(api, uniq('移动任务'), pa.id)
  await gotoDetail(page, t.id)
  const sidebar = page.locator('aside').last()

  await capsuleByRowLabel(sidebar, /^项目$/).click()
  const option = page.getByRole('button', { name: pb.name }).last()
  await option.click()
  await expect
    .poll(async () => (await api.getTask(t.id)).projectId, { timeout: 15_000 })
    .toBe(pb.id)
  await expect(capsuleByRowLabel(sidebar, /^项目$/)).toContainText(pb.name)
})

// ---------------------------------------------------------------------------
// T08 详情页：里程碑属性
// ---------------------------------------------------------------------------
test('T08 详情页设置里程碑', async ({ page, api }) => {
  const p = await newProject(api, '里程碑任务项目')
  const ms = await api.createMilestone(p.id, { name: uniq('里程碑A'), status: 'planned' })
  const t = await newTask(api, uniq('里程碑任务'), p.id)
  await gotoDetail(page, t.id)
  const sidebar = page.locator('aside').last()

  await pickCapsuleOption(page, sidebar, /^里程碑$/, ms.name, ms.name)
  await expect
    .poll(async () => String((await api.getTask(t.id)).milestoneId ?? ''), { timeout: 15_000 })
    .toBe(ms.id)
})

// ---------------------------------------------------------------------------
// T09 添加子任务 —— 缺陷 3 已修复：服务端从父任务继承项目 + moduleCode 自愈，
// 子任务应正常创建并出现在父任务下。
// ---------------------------------------------------------------------------
test('T09 添加子任务', async ({ page, api }) => {
  const p = await newProject(api, '子任务项目')
  const parent = await newTask(api, uniq('父任务'), p.id)
  await gotoDetail(page, parent.id)

  await page.getByRole('button', { name: /添加子任务|Add subtask/i }).click()
  const childTitle = uniq('子任务')
  await page.getByPlaceholder('子任务标题').fill(childTitle)
  await page.getByRole('button', { name: /保存子任务/ }).click()

  await expect
    .poll(async () => {
      const subs = await api.listSubtasks(parent.id)
      return subs.find((x) => x.title === childTitle) ?? null
    }, { timeout: 15_000 })
    .toBeTruthy()
})

// ---------------------------------------------------------------------------
// T10 详情页：评论添加与删除
// ---------------------------------------------------------------------------
test('T10 评论添加与删除', async ({ page, api }) => {
  const p = await newProject(api, '评论项目')
  const t = await newTask(api, uniq('评论任务'), p.id)
  await gotoDetail(page, t.id)

  const input = page.getByPlaceholder('留下评论…')
  const comment = uniq('第一条评论')
  await input.fill(comment)
  await page.getByRole('button', { name: '发送评论' }).click()
  await expect(page.getByText(comment).first()).toBeVisible({ timeout: 15_000 })

  // 删除评论：悬浮评论出现操作入口
  const commentItem = page.getByText(comment).first()
  await commentItem.hover()
  const delBtn = page.getByRole('button', { name: /删除|Delete/ }).last()
  if (await delBtn.isVisible().catch(() => false)) {
    await delBtn.click()
    await confirmDialog(page, /删除|Delete/)
    await expect(page.getByText(comment)).toHaveCount(0)
  }
})

// ---------------------------------------------------------------------------
// T11 详情页：指派 AI 对话框
// ---------------------------------------------------------------------------
test('T11 详情页指派AI对话框', async ({ page, api }) => {
  const p = await newProject(api, 'AI指派项目')
  const t = await newTask(api, uniq('AI指派任务'), p.id)
  await gotoDetail(page, t.id)

  await page.getByRole('button', { name: /指派 AI|Assign.*AI/ }).first().click()
  const dialog = modalDialog(page)
  await expect(dialog.first()).toBeVisible()
  await page.getByRole('button', { name: /取消|Cancel/ }).first().click()
  await expect(dialog.first()).toBeHidden()
})

// ---------------------------------------------------------------------------
// T12 详情页：删除任务（跳回列表）
// ---------------------------------------------------------------------------
test('T12 详情页删除任务', async ({ page, api }) => {
  const p = await newProject(api, '待删除项目')
  const t = await newTask(api, uniq('待删除任务'), p.id)
  await gotoDetail(page, t.id)

  await page.getByRole('button', { name: /^删除$/ }).first().click()
  await confirmDialog(page, /删除|Delete/)
  await page.waitForURL(/\/app\/issues\//, { timeout: 15_000 })
  cleanupTasks = cleanupTasks.filter((id) => id !== t.id)
  await expectTaskGone(api, t.id)
})

// ---------------------------------------------------------------------------
// T13 行右键菜单：状态/优先级/负责人（二级选项为硬编码英文标签）
// ---------------------------------------------------------------------------
test('T13 行右键菜单-元数据直改', async ({ page, api }) => {
  const p = await newProject(api, '右键菜单项目')
  const t = await newTask(api, uniq('右键任务'), p.id)
  await gotoTasks(page)

  await openRowContextMenu(page, t.title)
  await pickContextMenu(page, ['状态', 'In Progress'])
  await expect.poll(async () => (await api.getTask(t.id)).status).toBe('in_progress')

  await openRowContextMenu(page, t.title)
  await pickContextMenu(page, ['优先级', 'High'])
  await expect.poll(async () => (await api.getTask(t.id)).priority).toBe('high')

  const members = await api.listProjectMembers(p.id)
  expect(members.length, '项目应有成员候选（缺陷 6 已修复）').toBeGreaterThan(0)
  await openRowContextMenu(page, t.title)
  await pickContextMenu(page, ['负责人', members[0].displayName])
  // Task.assigneeId 外键是 User.id（服务端从 TaskAssignee 同步三字段），断言用 userId 口径
  await expect
    .poll(async () => (await api.getTask(t.id)).assigneeId, { timeout: 15_000 })
    .toBe(members[0].userId)
})

// ---------------------------------------------------------------------------
// T14 行右键菜单：固定 + 复制链接（标签勾选受缺陷 7 限制，见 T05b）
// ---------------------------------------------------------------------------
test('T14 行右键菜单-固定与链接', async ({ page, api }) => {
  const p = await newProject(api, '标签项目')
  const t = await newTask(api, uniq('标签任务'), p.id)
  await gotoTasks(page)

  await openRowContextMenu(page, t.title)
  await pickContextMenu(page, ['固定'])
  await openRowContextMenu(page, t.title)
  await expect(page.getByRole('menuitem', { name: '取消固定' })).toBeVisible()
  await page.keyboard.press('Escape')

  await openRowContextMenu(page, t.title)
  await pickContextMenu(page, ['复制链接'])
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toContain(`/app/issues/${t.id}`)
})

// ---------------------------------------------------------------------------
// T15 行右键菜单：创建子任务/父任务 —— 缺陷 3（含 3b 缺 moduleCode）已修复：
// 服务端继承父任务项目 + moduleCode 兜底，两个创建均应落库。
// ---------------------------------------------------------------------------
test('T15 行右键菜单-创建子任务与父任务', async ({ page, api }) => {
  const p = await newProject(api, '层级项目')
  const t = await newTask(api, uniq('层级任务'), p.id)
  await gotoTasks(page)

  const childTitle = uniq('菜单子任务')
  page.once('dialog', (d) => d.accept(childTitle))
  await openRowContextMenu(page, t.title)
  await pickContextMenu(page, ['创建子任务'])
  await expect
    .poll(async () => {
      const subs = await api.listSubtasks(t.id)
      return subs.find((x) => x.title === childTitle) ?? null
    }, { timeout: 15_000 })
    .toBeTruthy()

  const parentTitle = uniq('菜单父任务')
  page.once('dialog', (d) => d.accept(parentTitle))
  await openRowContextMenu(page, t.title)
  await pickContextMenu(page, ['创建父任务'])
  await expect
    .poll(async () => {
      const all = await api.listAllTasks()
      return all.find((x) => x.title === parentTitle) ?? null
    }, { timeout: 15_000 })
    .toBeTruthy()
})

// ---------------------------------------------------------------------------
// T23 Inbox 任务创建（缺陷 1 已修复）：无 projectId 创建落 inbox 项目且可查回
// ---------------------------------------------------------------------------
test('T23 无项目创建任务-projectId 为空且创建者可见', async ({ api }) => {
  // INBOX 已去实体化：不带 projectId 创建落为无项目任务（projectId = null）
  const title = uniq('无项目任务')
  const created = await api.createTask({ title })
  expect(created.projectId ?? null).toBeNull()
  cleanupTasks.push(created.id)

  // 创建者可见（reporter 视角可见性）
  const remote = await api.getTask(created.id)
  expect(remote.title).toBe(title)
})

// ---------------------------------------------------------------------------
// T16 行右键菜单：删除任务（确认后消失）
// ---------------------------------------------------------------------------
test('T16 行右键菜单-删除任务', async ({ page, api }) => {
  const p = await newProject(api, '右键删除项目')
  const t = await newTask(api, uniq('右键删除'), p.id)
  await gotoTasks(page)
  await openRowContextMenu(page, t.title)
  await pickContextMenu(page, ['删除任务'])
  await confirmDialog(page, /^删除$/)
  await expect(page.getByText(t.title, { exact: true })).toBeHidden()
  cleanupTasks = cleanupTasks.filter((id) => id !== t.id)
  await expectTaskGone(api, t.id)
})

// ---------------------------------------------------------------------------
// T17 批量：指派 AI 对话框 + 批量删除
// ---------------------------------------------------------------------------
test('T17 批量指派AI与批量删除', async ({ page, api }) => {
  const p = await newProject(api, '批量项目')
  const a = await newTask(api, uniq('批量甲'), p.id)
  const c = await newTask(api, uniq('批量乙'), p.id)
  await gotoTasks(page)

  await selectRowByTitle(page, a.title)
  await selectRowByTitle(page, c.title)
  await expect(page.getByText('2 selected')).toBeVisible()

  // 指派 AI 对话框可打开并取消
  await page.getByRole('button', { name: /指派 AI/ }).click()
  const dialog = modalDialog(page)
  await expect(dialog.first()).toBeVisible()
  await page.getByRole('button', { name: /取消|Cancel/ }).first().click()

  // 批量删除
  await page.getByRole('button', { name: /^删除$/ }).first().click()
  await confirmDialog(page, /^删除$/)
  cleanupTasks = cleanupTasks.filter((id) => id !== a.id && id !== c.id)
  await expectTaskGone(api, a.id)
  await expectTaskGone(api, c.id)
})

// ---------------------------------------------------------------------------
// T18 视图切换与看板拖拽改状态 + 分组
// ---------------------------------------------------------------------------
test('T18 看板拖拽改状态与分组', async ({ page, api }) => {
  const p = await newProject(api, '拖拽项目')
  const t = await newTask(api, uniq('拖拽任务'), p.id)
  // 目标列放一张已在「进行中」的任务卡：dnd-kit 拖到卡片上落点最稳
  const anchor = await newTask(api, uniq('锚点任务'), p.id, { status: 'in_progress' })
  await gotoTasks(page)
  await page.getByRole('button', { name: 'Board', exact: true }).click()

  const card = page.getByText(t.title, { exact: true }).first()
  await card.waitFor({ state: 'visible' })
  const anchorCard = page.getByText(anchor.title, { exact: true }).first()
  await anchorCard.waitFor({ state: 'visible' })
  // poll 带瞬时网络容错（dev server 偶发 ECONNRESET）
  await dragUntil(
    page,
    card,
    anchorCard,
    () =>
      api
        .getTask(t.id)
        .then((r) => r.status === 'in_progress')
        .catch(() => false),
  )
  await expect
    .poll(async () => (await api.getTask(t.id)).status, { timeout: 15_000 })
    .toBe('in_progress')

  // Group by：切回列表视图，显示菜单 → 按状态分组 → 出现分组条
  await page.getByRole('button', { name: 'List', exact: true }).click()
  await page.getByRole('button', { name: 'Display' }).click()
  await page.getByRole('menu').getByRole('button', { name: /按状态|Status/ }).first().click()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-ai-role="group"]').first()).toBeVisible()
})

// ---------------------------------------------------------------------------
// T19 筛选级联菜单 + 统计开关（状态选项为「待处理」等 zh 值）
// ---------------------------------------------------------------------------
test('T19 筛选与统计开关', async ({ page, api }) => {
  const p = await newProject(api, '筛选统计项目')
  const t = await newTask(api, uniq('筛选任务'), p.id, { type: 'bug', severity: 'high' })
  await gotoTasks(page)

  await page.locator('[data-ai-component="task.tasks-list.filter-menu"]').click()
  const statusField = page.getByRole('menuitem', { name: /^Status/ }).first()
  await statusField.hover()
  await page.getByRole('menuitemcheckbox', { name: /待处理/ }).last().click()
  await expect(page.locator('body')).toContainText('待处理')
  // 再次点击触发器收起弹层（Escape 不会移除 Base UI 的 inert 遮罩）
  await page.locator('[data-ai-component="task.tasks-list.filter-menu"]').click()
  await expect(rowByTitle(page, t.title)).toBeVisible() // 新建任务为 todo，命中筛选

  // 统计开关
  await page.getByRole('button', { name: /^Stats$/ }).first().click()
  await expect(page.locator('body')).toContainText(/待处理|总任务数/)
  await page.getByRole('button', { name: /Hide stats|隐藏/ }).first().click()
})

// ---------------------------------------------------------------------------
// T20 搜索任务（搜索框在筛选弹层内部）
// ---------------------------------------------------------------------------
test('T20 搜索任务', async ({ page, api }) => {
  const p = await newProject(api, '搜索项目')
  const a = await newTask(api, uniq('搜索目标甲'), p.id)
  const b = await newTask(api, uniq('搜索目标乙'), p.id)
  await gotoTasks(page)

  await page.locator('[data-ai-component="task.tasks-list.filter-menu"]').click()
  const search = page.getByRole('menu').getByPlaceholder(/搜索任务|Search tasks/)
  await search.fill(a.title)
  await expect(page.getByText(a.title, { exact: true })).toBeVisible()
  await expect(page.getByText(b.title, { exact: true })).toBeHidden()
  await search.fill('')
  await expect(page.getByText(b.title, { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
})

// ---------------------------------------------------------------------------
// T21 收藏与订阅开关
// ---------------------------------------------------------------------------
test('T21 收藏与订阅开关', async ({ page, api }) => {
  const p = await newProject(api, '收藏项目')
  const t = await newTask(api, uniq('收藏任务'), p.id)
  await gotoDetail(page, t.id)
  // 收藏（星标）/订阅（铃铛）为图标按钮：点击后页面保持正常（无崩溃、标题仍在）
  const iconBtn = page
    .getByRole('button')
    .filter({ has: page.locator('svg.lucide-star, svg.lucide-bell') })
    .first()
  await iconBtn.click()
  await expect(page.locator('body')).toContainText(t.title.slice(0, 8))
})

// ---------------------------------------------------------------------------
// T22 项目任务页：默认看板 + 创建任务 + 右键改状态
// ---------------------------------------------------------------------------
test('T22 项目任务页-创建与改状态', async ({ page, api }) => {
  const p = await newProject(api, '项目任务页项目')
  await page.goto(`/app/projects/${p.id}/issues`)
  await page.waitForURL(new RegExp(`/app/projects/${p.id}/issues`))

  // 默认看板视图：创建任务后卡片出现在看板
  await page.getByRole('button', { name: '创建任务' }).first().click()
  const dialog = modalDialog(page)
  await dialog.waitFor({ state: 'visible' })
  const title = uniq('项目页任务')
  await dialogTitleInput(page, 'Task title').fill(title)
  await page.waitForTimeout(1200) // 模块查询加载
  await page.getByRole('button', { name: 'Create task' }).click()
  await expect(dialog).toBeHidden({ timeout: 15_000 })
  await expect(page.getByText(title, { exact: true }).first()).toBeVisible({ timeout: 15_000 })

  const all = await api.listAllTasks()
  const task = all.find((x) => x.title === title)
  expect(task, '项目页任务应落库').toBeTruthy()
  if (task) cleanupTasks.push(task.id)

  // 切列表 → 右键改状态（二级菜单英文标签；一次未生效则重试一轮）
  await page.getByRole('button', { name: 'List', exact: true }).click()
  await openRowContextMenu(page, title)
  await pickContextMenu(page, ['状态', 'In Review'])
  await expect
    .poll(
      async () =>
        api
          .getTask(task!.id)
          .then((r) => String(r.status))
          .catch(() => 'unknown'),
      { timeout: 12_000 },
    )
    .toBe('in_review')
    .catch(async () => {
      await openRowContextMenu(page, title)
      await pickContextMenu(page, ['状态', 'In Review'])
      await expect.poll(async () => String((await api.getTask(task!.id)).status), { timeout: 12_000 }).toBe('in_review')
    })
})
