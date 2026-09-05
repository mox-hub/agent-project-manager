/**
 * 认证模块 E2E：登录（错误/成功）、注册、退出登录。
 * 本文件使用空 storageState（覆盖 project 配置），模拟未登录浏览器。
 */
import { test, expect } from '@playwright/test'
import { E2E_USER } from './helpers/api'
import { openCommandPalette } from './helpers/ui'

// 未登录态：清空 storageState
test.use({ storageState: { cookies: [], origins: [] } })

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
    // cmdk 输入框自动聚焦，直接填充（点击会被对话框焦点陷阱拦截）
    const paletteInput = page.getByPlaceholder(/Search for a command/i).first()
    await paletteInput.fill('log')
    const item = page.getByText(/退出登录|Log out/i).last()
    if (await item.isVisible().catch(() => false)) {
      await item.click()
    } else {
      // 退出登录命令注册了快捷键 L
      await page.keyboard.press('l')
    }
    await page.waitForURL(/\/login/, { timeout: 15_000 })
    // 会话已失效：本地 token 被清除
    const token = await page.evaluate(() => localStorage.getItem('access_token'))
    expect(token === null || token === '').toBeTruthy()
  })

  test('A05 未登录访问受保护路由重定向 /login', async ({ page }) => {
    await page.goto('/app/tasks')
    await page.waitForURL(/\/(login|boot)/, { timeout: 30_000 })
  })
})
