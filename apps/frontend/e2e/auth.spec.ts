/**
 * 认证模块 E2E：登录（错误/成功）、注册、退出登录。
 * 本文件使用空 storageState（覆盖 project 配置），模拟未登录浏览器。
 */
import { test, expect } from '@playwright/test'
import { E2E_USER } from './helpers/api'
import { commandPaletteInput, openCommandPalette } from './helpers/ui'

// E2E 前端地址与 playwright.config.ts 保持一致（供 storageState 的 origin 使用）
const FRONT_URL = `http://localhost:${Number(process.env.E2E_FRONT_PORT ?? 5173)}`

/**
 * 未登录态：清空 cookies/会话，但**预置 onboarding 完成标记**。
 *
 * 用例意图是「未登录」，不含「首次访问」——而空 storageState 会让 OnboardingGate
 * 渲染首次启动向导，遮蔽整张页面（A04 需要页头「创建项目」按钮可见才能打开命令面板）。
 * 故仅注入 app-storage 的 onboardingCompleted=true（zustand persist v1 的 partialize
 * 只保留该键所在的白名单字段，缺省字段回落 store 初始值）。
 */
test.use({
  storageState: {
    cookies: [],
    origins: [
      {
        origin: FRONT_URL,
        localStorage: [
          { name: 'app-storage', value: JSON.stringify({ state: { onboardingCompleted: true }, version: 1 }) },
        ],
      },
    ],
  },
})

test.describe('认证流程', () => {
  test('A01 登录页-错误凭据报错', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#username').fill('e2e-runner')
    await page.locator('#password').fill('wrong-password-xxx')
    await page.getByRole('button', { name: /登录|Sign In/ }).click()
    await expect(page.locator('body')).toContainText(/失败|错误|invalid|错误|不正确|INVALID/i, {
      timeout: 15_000,
    })
    await expect(page).toHaveURL(/\/login/)
  })

  test('A02 登录成功跳转 /app', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#username').fill(E2E_USER.username)
    await page.locator('#password').fill(E2E_USER.password)
    await page.getByRole('button', { name: /登录|Sign In/ }).click()
    await page.waitForURL(/\/app/, { timeout: 30_000 })
    await expect(page.locator('body')).toContainText(/项目|任务|仪表盘/)
  })

  test('A03 注册新用户并自动登录', async ({ page }) => {
    const email = `e2e-reg-${Date.now().toString(36)}@example.com`
    await page.goto('/register')
    await page.getByPlaceholder(/name@example.com|邮箱/).fill(email)
    const nameInput = page.getByPlaceholder(/姓名（可选）|Name/)
    if (await nameInput.isVisible().catch(() => false)) await nameInput.fill('E2E 注册用户')
    await page.getByPlaceholder(/密码（至少 8 位）|Password/).fill('e2e-reg-pass-123')
    await page.getByPlaceholder(/确认密码|Confirm/).fill('e2e-reg-pass-123')
    await page.getByRole('button', { name: /注册并登录|Register/ }).click()
    await page.waitForURL(/\/app/, { timeout: 30_000 })
  })

  test('A04 退出登录（命令面板）', async ({ page }) => {
    // 先走一次 UI 登录拿到会话
    await page.goto('/login')
    await page.locator('#username').fill(E2E_USER.username)
    await page.locator('#password').fill(E2E_USER.password)
    await page.getByRole('button', { name: /登录|Sign In/ }).click()
    await page.waitForURL(/\/app/, { timeout: 30_000 })

    // 等应用挂载完成后打开命令面板（缺陷 #10 已修复，面板稳定打开）
    await page.getByRole('button', { name: /创建项目|新建/ }).first().waitFor({ state: 'visible', timeout: 30_000 })
    const opened = await openCommandPalette(page)
    expect(opened, 'Ctrl+K 应打开命令面板').toBe(true)
    // 面板输入框自动聚焦，直接填充（点击会被对话框焦点陷阱拦截）；
    // 用 data-slot 定位而非 placeholder——placeholder 随界面语言变化（zh-CN「搜索命令...」）
    const paletteInput = commandPaletteInput(page)
    // 查询词必须**只**命中登出命令：'log' 会同时命中「发版交付」（关键词含 changelog），
    // 高亮被其抢走，Enter 会走到发版页而非登出；'登出'（登出命令 keyword 之一）唯一命中。
    await paletteInput.fill('登出')
    // 过滤结果渲染需要一个 tick，等条目可见而不是立即查询
    const item = page.getByText(/退出登录|Log out/i).last()
    await item.waitFor({ state: 'visible', timeout: 5000 })
    // /app 页轮询导致面板持续 re-render，鼠标点击易被判 "element is not stable"；
    // 输入已过滤到唯一项，Enter 触发当前高亮项即登出
    await page.keyboard.press('Enter')
    await page.waitForURL(/\/login/, { timeout: 15_000 })
    // 会话已失效：本地 token 被清除
    const token = await page.evaluate(() => localStorage.getItem('access_token'))
    expect(token === null || token === '').toBeTruthy()
  })

  test('A05 未登录访问受保护路由重定向 /login', async ({ page }) => {
    await page.goto('/app/issues')
    await page.waitForURL(/\/(login|boot)/, { timeout: 30_000 })
  })

  /**
   * A06/A07 是「登录之后会自动弹出到登录页面」的回归。
   *
   * 成因：服务端按 x-workspace-id 把数据访问路由到对应工作区库，而身份/会话在各库中
   * 独立存在——选定一个本会话主体不存在（或根本未注册）的工作区后，/auth/me 与
   * /auth/login 都会被拒（正确密码也报「用户名或密码错误」），于是：请求 401 → 清登录态
   * → 踢回 /login → 重新登录仍带该 id → 再次被拒。且该选择持久化在 localStorage 与
   * 桌面壳镜像中，重启依旧，用户无法自救。
   *
   * 这里用**未注册**工作区 id（404 WORKSPACE_NOT_FOUND）触发，其对环境无依赖、结果确定；
   * 「有效但非本会话」的 401 形态由 api-client 单测覆盖。
   */
  test('A06 陈旧工作区选择不得把已登录用户踢回登录页（自愈为默认工作区）', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#username').fill(E2E_USER.username)
    await page.locator('#password').fill(E2E_USER.password)
    await page.getByRole('button', { name: /登录|Sign In/ }).click()
    await page.waitForURL(/\/app/, { timeout: 30_000 })

    // 模拟残留的失效工作区选择（曾在桌面壳/浏览器里选过、之后该工作区被删或未注册）
    await page.evaluate(() => localStorage.setItem('apm-workspace-id', 'ws-does-not-exist-999'))
    await page.goto('/app')

    // 必须留在 /app：选择被丢弃、登录态保留
    await expect(page).toHaveURL(/\/app/, { timeout: 30_000 })
    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem('apm-workspace-id')), {
        timeout: 15_000,
      })
      .toBeNull()
    expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeTruthy()
  })

  test('A07 登录请求携带失效工作区选择时仍能登录成功', async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => localStorage.setItem('apm-workspace-id', 'ws-does-not-exist-999'))
    await page.locator('#username').fill(E2E_USER.username)
    await page.locator('#password').fill(E2E_USER.password)
    await page.getByRole('button', { name: /登录|Sign In/ }).click()

    await page.waitForURL(/\/app/, { timeout: 30_000 })
    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem('apm-workspace-id')), {
        timeout: 15_000,
      })
      .toBeNull()
  })
})
