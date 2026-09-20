/**
 * 全局鉴权 setup：注册/登录 E2E 专用账号，执行一次真实 UI 登录并落盘 storageState。
 * 后续所有 e2e 用例复用该状态（含 localStorage 的 access_token）。
 */
import { test as setup, expect } from '@playwright/test'
import { ensureE2EUser, E2E_USER } from './helpers/api'

const authFile = 'e2e/.auth/user.json'

setup('authenticate', async ({ page, request }) => {
  // server 未启动时给出可操作的错误信息
  try {
    await ensureE2EUser(request)
  } catch (e) {
    throw new Error(
      `无法连接后端或登录失败（确认 apps/server 已运行在 :4300）: ${(e as Error).message}`,
    )
  }

  await page.goto('/login')
  await page.locator('#username').fill(E2E_USER.username)
  await page.locator('#password').fill(E2E_USER.password)
  await page.getByRole('button', { name: /登录|Sign In/ }).click()

  // 登录成功后经 /boot 冷启动页自动跳转 /app
  await page.waitForURL(/\/(app|boot)/, { timeout: 30_000 })
  await page.waitForURL(/\/app/, { timeout: 30_000 })
  await expect(page.locator('#username')).toHaveCount(0)
  await page.context().storageState({ path: authFile })
})
