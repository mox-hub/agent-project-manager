import { defineConfig, devices } from '@playwright/test'

// E2E 测试针对本地全栈运行：frontend(5173) + server(4300)。
// server 不由 Playwright 托管（需要 dev.db 等环境），必须预先启动；
// frontend 若未启动会由 webServer 自动拉起，已启动则复用。
const FRONT_PORT = Number(process.env.E2E_FRONT_PORT ?? 5173)
const FRONT_URL = `http://localhost:${FRONT_PORT}`

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  timeout: 90_000,
  expect: { timeout: 25_000 },
  // 第一批用例串行执行：与共享的本地后端交互，避免数据互相干扰
  fullyParallel: false,
  workers: 1,
  // 本地 dev server 偶发瞬时网络错误/慢加载，保留一次重试兜底
  retries: 2,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: FRONT_URL,
    // 界面语言固定 zh-CN，选择器文案与 i18n 中文键一致
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    viewport: { width: 1600, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'e2e',
      testIgnore: /auth\.setup\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: FRONT_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
