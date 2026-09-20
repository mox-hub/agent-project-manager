/**
 * UI 交互助手：封装两模块反复出现的操作模式（行右键菜单、创建对话框、属性胶囊、行多选）。
 * 选择器约定见各函数注释；界面语言固定 zh-CN（见 playwright.config.ts）。
 */
import { type Page, type Locator, expect } from '@playwright/test'

/** DataList 行根节点（含行首多选框与右键菜单触发区） */
export function rowByTitle(page: Page, title: string): Locator {
  return page.locator('div[data-row-id]').filter({ has: page.getByText(title, { exact: true }) })
}

/** Base UI 模态对话框内容节点（toast 也是 role=dialog，须用 data-slot 区分） */
export function modalDialog(page: Page): Locator {
  return page.locator('[data-slot="dialog-content"]')
}

/** 行右键菜单：对行内标题文本右键（ContextMenu.Trigger 包裹整行，事件冒泡） */
export async function openRowContextMenu(page: Page, title: string) {
  const titleEl = page.getByText(title, { exact: true }).first()
  await titleEl.waitFor({ state: 'visible' })
  await titleEl.click({ button: 'right' })
  await expect(page.getByRole('menu').first()).toBeVisible()
}

/** 点击右键菜单项；支持 `['父级', '子级']` 打开二级子菜单（hover 展开后点击） */
export async function pickContextMenu(page: Page, path: string[]) {
  for (let i = 0; i < path.length; i += 1) {
    const name = path[i]
    const isLast = i === path.length - 1
    const scope: Locator =
      i === 0 ? page.getByRole('menu').first() : page.locator('[data-slot="context-menu-sub-content"]').last()
    const item = scope
      .getByRole('menuitem', { name })
      .or(scope.getByRole('menuitemcheckbox', { name }))
      .first()
    await item.waitFor({ state: 'visible' })
    if (isLast) {
      await item.click()
    } else {
      await item.hover()
      await page.locator('[data-slot="context-menu-sub-content"]').last().waitFor({ state: 'visible' })
    }
  }
}

/** 对话框标题输入（占位符固定：Task title / Bug title / Project name / Milestone name） */
export function dialogTitleInput(page: Page, placeholder: string): Locator {
  return page.getByPlaceholder(placeholder)
}

/**
 * 属性行胶囊按钮：PropertyRow 结构为 `<span>标签</span><div><button/></div>`，
 * 按标签文本定位同行胶囊。scope 限定搜索范围（创建对话框 / 详情侧栏）。
 */
export function capsuleByRowLabel(scope: Locator, label: RegExp): Locator {
  return scope
    .locator('span', { hasText: label })
    .last()
    .locator('xpath=following-sibling::div[1]')
    .getByRole('button')
    .first()
}

/** 打开胶囊的 Popover 并选择选项；可选断言胶囊显示的新值 */
export async function pickCapsuleOption(
  page: Page,
  scope: Locator,
  label: RegExp,
  optionName: RegExp | string,
  expectedText?: RegExp | string,
) {
  await capsuleByRowLabel(scope, label).click()
  const option = page.getByRole('button', { name: optionName }).last()
  await option.click()
  if (expectedText) {
    await expect(capsuleByRowLabel(scope, label)).toContainText(expectedText)
  }
}

/** 多选行：点击行首 checkbox（DataList SelectCell，role=checkbox） */
export async function selectRowByTitle(page: Page, title: string) {
  await rowByTitle(page, title).getByRole('checkbox').click()
}

/**
 * 打开命令面板（Ctrl+K）。崩溃缺陷 #10 已修复；保留短暂重试以吸收慢环境时序。
 * 返回是否成功打开。
 */
export async function openCommandPalette(page: Page, attempts = 4): Promise<boolean> {
  for (let i = 0; i < attempts; i += 1) {
    await page.keyboard.press('Control+k')
    const opened = await page
      .getByRole('heading', { name: 'Command Palette' })
      .waitFor({ state: 'visible', timeout: 4000 })
      .then(() => true)
      .catch(() => false)
    if (opened) return true
    // 崩溃恢复：错误页出现「刷新页面」按钮
    const refresh = page.getByRole('button', { name: '刷新页面' })
    if (await refresh.isVisible().catch(() => false)) {
      await refresh.click()
      await page.getByRole('button', { name: /创建项目|新建/ }).first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {})
      await page.waitForTimeout(800)
    }
  }
  return false
}

/** 确认对话框（useConfirm）：点击确认按钮 */
export async function confirmDialog(page: Page, confirmLabel: RegExp) {
  const btn = page.getByRole('button', { name: confirmLabel }).last()
  await expect(btn).toBeVisible()
  await btn.click()
}

/** dnd-kit 看板拖拽：pointer 按下 → 分步移动 → 松开（激活距离默认 8px），落到目标中心 */
export async function dragCard(page: Page, source: Locator, target: Locator) {
  const from = await source.boundingBox()
  const to = await target.boundingBox()
  if (!from || !to) throw new Error('拖拽源/目标不可见')
  const startX = from.x + from.width / 2
  const startY = from.y + from.height / 2
  const endX = to.x + to.width / 2
  const endY = to.y + Math.max(60, Math.min(to.height / 2, 300))
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + 12, startY + 6, { steps: 4 })
  await page.mouse.move((startX + endX) / 2, (startY + endY) / 2, { steps: 16 })
  await page.mouse.move(endX, endY, { steps: 16 })
  await page.waitForTimeout(600) // 等待 dnd-kit 计算落点高亮
  await page.mouse.up()
  await page.waitForTimeout(300)
}

/** 拖拽重试封装：dnd-kit 偶发不落点，最多尝试 attempts 次直至 poll 断言通过 */
export async function dragUntil(
  page: Page,
  source: Locator,
  target: Locator,
  poll: () => Promise<boolean>,
  attempts = 3,
) {
  for (let i = 0; i < attempts; i += 1) {
    await dragCard(page, source, target)
    for (let w = 0; w < 8; w += 1) {
      if (await poll()) return
      await page.waitForTimeout(500)
    }
  }
  throw new Error(`拖拽重试 ${attempts} 次后仍未生效`)
}
