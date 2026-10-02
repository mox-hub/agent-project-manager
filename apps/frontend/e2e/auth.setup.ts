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

  /**
   * 预置「已完成首次引导」标记后落盘 storageState。
   *
   * 首次启动向导（OnboardingGate）是**模态弹层**，会遮蔽整张页面——复用它落盘的用例
   * （SH02 命令面板、A04 等）因页头按钮不可见而超时。e2e 关注的是功能行为而非「首次访问」，
   * 故在共享 setup 里统一预置 app-storage.onboardingCompleted=true（zustand persist v1）。
   * 与既有 app-storage 内容合并写入，不清空其它持久化字段。
   */
  await page.evaluate(() => {
    let state: Record<string, unknown> = {}
    try {
      state = JSON.parse(localStorage.getItem('app-storage') ?? '')?.state ?? {}
    } catch {
      state = {}
    }
    localStorage.setItem(
      'app-storage',
      JSON.stringify({ state: { ...state, onboardingCompleted: true }, version: 1 }),
    )
  })

  await page.context().storageState({ path: authFile })
})
