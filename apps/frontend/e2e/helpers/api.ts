/**
 * E2E API 助手：绕过 UI 直接构造/清理测试数据。
 *
 * - 使用专用账号 e2e-runner（不存在则自动注册），不触碰用户已有数据
 * - 所有请求走 server(4300) 的 /_api 前缀，信封结构 { status, success, data }
 * - 项目无删除端点：清理时统一归档；任务用 DELETE 真删
 */
import type { APIRequestContext } from '@playwright/test'

export const API_BASE = process.env.E2E_API_BASE ?? 'http://127.0.0.1:4300/_api'

export const E2E_USER = {
  email: 'e2e-runner@example.com',
  username: 'e2e-runner',
  password: 'e2e-pass-123',
  displayName: 'E2E Runner',
}

type Envelope<T> = { status: number; success: boolean; data: T; description?: string }

/** 确保 E2E 账号存在并登录，返回 accessToken（网络瞬时错误自动重试） */
export async function ensureE2EUser(request: APIRequestContext): Promise<string> {
  let lastErr: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const reg = await request.post(`${API_BASE}/auth/register`, { data: E2E_USER })
      if (!reg.ok() && reg.status() !== 409 && reg.status() !== 400) {
        throw new Error(`注册 E2E 用户失败: ${reg.status()} ${await reg.text()}`)
      }
      const login = await request.post(`${API_BASE}/auth/login`, {
        data: { username: E2E_USER.username, password: E2E_USER.password },
      })
      if (!login.ok()) {
        throw new Error(
          `E2E 登录失败（server 未启动或账号异常）: ${login.status()} ${await login.text()}`,
        )
      }
      const body = (await login.json()) as Envelope<{ accessToken: string }>
      return body.data.accessToken
    } catch (e) {
      lastErr = e
      const network = e instanceof Error && /ECONNRESET|ECONNREFUSED|ETIMEDOUT|socket hang up/i.test(e.message)
      if (!network || attempt === 2) throw e
      await new Promise((r) => setTimeout(r, 800))
    }
  }
  throw lastErr
}

export interface ApmApi {
  token: string
  me(): Promise<{ id: string; username: string; displayName: string }>
  createProject(data: {
    name: string
    description?: string
    type?: string
    visibility?: string
    priority?: string
    startDate?: string
    targetDate?: string
  }): Promise<{ id: string; name: string; [k: string]: unknown }>
  getProject(id: string): Promise<Record<string, unknown>>
  patchProject(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>>
  archiveProject(id: string): Promise<void>
  createTask(data: {
    title: string
    projectId?: string
    description?: string
    type?: 'task' | 'bug'
    status?: string
    priority?: string
    severity?: string
    assigneeId?: string
    dueDate?: string
    tags?: string[]
    parentIssueId?: string
    moduleCode?: string
  }): Promise<{ id: string; title: string; [k: string]: unknown }>
  getTask(id: string): Promise<Record<string, unknown>>
  patchTask(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>>
  deleteTask(id: string): Promise<void>
  createMilestone(
    projectId: string,
    data: { name: string; description?: string; targetDate?: string | null; status?: string },
  ): Promise<{ id: string; name: string }>
  listProjectMembers(projectId: string): Promise<{ id: string; userId?: string; displayName: string }[]>
  listAllTasks(): Promise<{ id: string; title: string; status: string; projectId?: string | null }[]>
  findProjectByName(name: string): Promise<{ id: string } | null>
  /** 项目建任务前置：补建默认 TASK 模块（服务端强制校验 moduleCode 归属） */
  ensureProjectModule(projectId: string): Promise<void>
  listTags(): Promise<{ id: string; name: string }[]>
  listSubtasks(parentId: string): Promise<{ id: string; title: string }[]>
  /** 文档 */
  createDocument(data: {
    title: string
    content?: string
    category?: string
    status?: string
    projectId?: string
  }): Promise<{ id: string; title: string; [k: string]: unknown }>
  getDocument(id: string): Promise<Record<string, unknown>>
  patchDocument(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>>
  deleteDocument(id: string): Promise<void>
  listDocuments(): Promise<{ id: string; title: string; status?: string }[]>
  /** 团队 */
  createTeam(data: { name: string; slug?: string }): Promise<{ id: string; name: string }>
  listTeams(): Promise<{ id: string; name: string; status?: string }[]>
  archiveTeam(id: string): Promise<void>
  addTeamMember(teamId: string, memberId: string): Promise<void>
  removeTeamMember(teamId: string, memberId: string): Promise<void>
  bindTeamProject(teamId: string, projectId: string): Promise<void>
  unbindTeamProject(teamId: string, projectId: string): Promise<void>
  listTeamMembers(teamId: string): Promise<{ id: string }[]>
  /** 成员 */
  listMembers(): Promise<{ id: string; displayName: string; type?: string }[]>
  /** 验收 */
  createAcceptance(data: {
    issueId: string
    title: string
    description?: string
    completionType?: string
  }): Promise<{ id: string; title: string }>
  listAcceptance(): Promise<{ id: string; title: string; status?: string }[]>
  deleteAcceptance(id: string): Promise<void>
  /** 通用原始请求（断言状态码用） */
  raw(method: string, path: string, data?: unknown): Promise<{ status: number; body: unknown }>
}

export async function makeApi(request: APIRequestContext): Promise<ApmApi> {
  const token = await ensureE2EUser(request)
  const modulesEnsured = new Set<string>()
  const isNetworkError = (e: unknown) =>
    e instanceof Error && /ECONNRESET|ECONNREFUSED|ETIMEDOUT|socket hang up/i.test(e.message)
  /** dev server 偶发瞬时网络错误：网络层失败自动重试 2 次 */
  const fetchWithRetry: typeof request.fetch = async (url, options) => {
    let lastErr: unknown
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await request.fetch(url, options)
      } catch (e) {
        lastErr = e
        if (!isNetworkError(e) || attempt === 2) throw e
        await new Promise((r) => setTimeout(r, 800))
      }
    }
    throw lastErr
  }
  const call = async <T>(method: string, path: string, data?: unknown): Promise<T> => {
    const res = await fetchWithRetry(`${API_BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      data,
    })
    if (!res.ok()) {
      throw new Error(`API ${method} ${path} 失败: ${res.status()} ${await res.text()}`)
    }
    const body = (await res.json()) as Envelope<T>
    return body.data
  }
  return {
    token,
    me: async () => {
      // /auth/me 信封 data 为 { user, roles }，取 user
      const d = await call<{ user?: { id: string; username: string; displayName: string } }>('GET', '/auth/me')
      return d.user ?? (d as unknown as { id: string; username: string; displayName: string })
    },
    createProject: (data) =>
      call('POST', '/projects', {
        // server DTO 对 type/visibility 做枚举校验，缺省会被 400 拒绝；
        // projectCode 缺省时服务端按名称首字母+随机数生成，极易撞唯一约束
        type: 'team',
        visibility: 'internal',
        priority: 'medium',
        projectCode: `E2E-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1e6)}`,
        ...data,
      }),
    getProject: (id) => call('GET', `/projects/${id}`),
    patchProject: (id, data) => call('PATCH', `/projects/${id}`, data),
    archiveProject: async (id) => {
      await call('POST', `/projects/${id}/archive`, {})
    },
    createTask: async (data) => {
      // 服务端建项目已自动播种默认模块（缺陷 6 修复），这里保留兜底：
      // 存量项目或模块查询竞态下补建 TASK 模块。
      if (data.projectId && !modulesEnsured.has(data.projectId)) {
        modulesEnsured.add(data.projectId)
        await fetchWithRetry(`${API_BASE}/projects/${data.projectId}/modules`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            data: { name: '默认模块', code: 'TASK' },
          })
          .catch(() => undefined)
      }
      return call('POST', '/issues', {
        ...(data.projectId ? { moduleCode: 'TASK' } : {}),
        ...data,
      })
    },
    getTask: (id) => call('GET', `/issues/${id}`),
    patchTask: (id, data) => call('PATCH', `/issues/${id}`, data),
    deleteTask: async (id) => {
      await fetchWithRetry(`${API_BASE}/issues/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    },
    createMilestone: (projectId, data) => call('POST', `/projects/${projectId}/milestones`, data),
    listProjectMembers: async (projectId) => {
      const d = await call('GET', `/members/project/${projectId}`)
      if (Array.isArray(d)) return d as { id: string; userId?: string; displayName: string }[]
      // 分页信封 data 可能是 { data: [...], total } 或 { items: [...] }
      const obj = d as {
        data?: { id: string; userId?: string; displayName: string }[]
        items?: { id: string; userId?: string; displayName: string }[]
      }
      return obj.data ?? obj.items ?? []
    },
    findProjectByName: async (name) => {
      const d = await call<{ items?: { id: string; name: string }[] }>(
        'GET',
        `/projects?q=${encodeURIComponent(name)}`,
      )
      const hit = (d.items ?? []).find((it) => it.name === name)
      return hit ? { id: hit.id } : null
    },
    ensureProjectModule: async (projectId) => {
      if (modulesEnsured.has(projectId)) return
      modulesEnsured.add(projectId)
      await fetchWithRetry(`${API_BASE}/projects/${projectId}/modules`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        data: { name: '默认模块', code: 'TASK' },
      }).catch(() => undefined)
    },
    listTags: () => call('GET', '/metadata/tags'),
    listSubtasks: (parentId) =>
      call('GET', `/issues/all?parentIssueId=${parentId}`).then((d: unknown) => {
        if (Array.isArray(d)) return d
        const obj = d as { data?: unknown; items?: unknown }
        return (obj.data ?? obj.items ?? []) as ApmApi['listSubtasks'] extends () => Promise<infer T> ? T : never
      }),
    listAllTasks: () => call('GET', '/issues/all').then((d: unknown) => {
      // 信封 data 内层数组可能为 { data: [...] } 或 { items: [...] }
      if (Array.isArray(d)) return d
      const obj = d as { data?: unknown; items?: unknown }
      return (obj.data ?? obj.items ?? []) as ApmApi['listAllTasks'] extends () => Promise<infer T> ? T : never
    }),
    createDocument: (data) => call('POST', '/documents', data),
    getDocument: (id) => call('GET', `/documents/${id}`),
    patchDocument: (id, data) => call('PUT', `/documents/${id}`, data),
    deleteDocument: async (id) => {
      await fetchWithRetry(`${API_BASE}/documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    },
    listDocuments: () => call('GET', '/documents').then((d: unknown) => {
      if (Array.isArray(d)) return d
      const obj = d as { data?: unknown; items?: unknown }
      return (obj.data ?? obj.items ?? []) as ApmApi['listDocuments'] extends () => Promise<infer T> ? T : never
    }),
    createTeam: (data) => call('POST', '/teams', { slug: `e2e-${Date.now().toString(36)}`, ...data }),
    listTeams: () => call('GET', '/teams').then((d: unknown) => {
      if (Array.isArray(d)) return d
      const obj = d as { data?: unknown; items?: unknown }
      return (obj.data ?? obj.items ?? []) as ApmApi['listTeams'] extends () => Promise<infer T> ? T : never
    }),
    archiveTeam: async (id) => {
      await fetchWithRetry(`${API_BASE}/teams/${id}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        data: {},
      })
    },
    addTeamMember: (teamId, memberId) => call('POST', `/teams/${teamId}/members`, { memberId }),
    removeTeamMember: async (teamId, memberId) => {
      await fetchWithRetry(`${API_BASE}/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    },
    bindTeamProject: (teamId, projectId) => call('POST', `/teams/${teamId}/projects`, { projectId }),
    unbindTeamProject: async (teamId, projectId) => {
      await fetchWithRetry(`${API_BASE}/teams/${teamId}/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    },
    listTeamMembers: (teamId) => call('GET', `/teams/${teamId}/members`).then((d: unknown) => {
      if (Array.isArray(d)) return d
      const obj = d as { data?: unknown; items?: unknown }
      return (obj.data ?? obj.items ?? []) as ApmApi['listTeamMembers'] extends () => Promise<infer T> ? T : never
    }),
    listMembers: () => call('GET', '/members').then((d: unknown) => {
      if (Array.isArray(d)) return d
      const obj = d as { data?: unknown; items?: unknown }
      return (obj.data ?? obj.items ?? []) as ApmApi['listMembers'] extends () => Promise<infer T> ? T : never
    }),
    createAcceptance: (data) => call('POST', '/acceptance', data),
    listAcceptance: () => call('GET', '/acceptance').then((d: unknown) => {
      if (Array.isArray(d)) return d
      const obj = d as { data?: unknown; items?: unknown }
      return (obj.data ?? obj.items ?? []) as ApmApi['listAcceptance'] extends () => Promise<infer T> ? T : never
    }),
    deleteAcceptance: async (id) => {
      await fetchWithRetry(`${API_BASE}/acceptance/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    },
    raw: async (method, path, data) => {
      const res = await fetchWithRetry(`${API_BASE}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        data,
      })
      let body: unknown = null
      try {
        body = await res.json()
      } catch {
        body = null
      }
      return { status: res.status(), body }
    },
  }
}

let runCounter = 0
/** 生成全局唯一名称前缀（计数器前置：server 从名称派生 projectCode 截取前 10 位，须尽早出现差异） */
export function uniq(label: string): string {
  runCounter += 1
  return `E2E${runCounter}-${label}-${Date.now().toString(36).slice(-4)}`
}
