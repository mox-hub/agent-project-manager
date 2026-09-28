/**
 * design-governance.allowlist.json 读取器 —— E 类豁免机制的机器侧实现
 *
 * 三条规则（no-naked-controls / no-visual-override / no-adhoc-tone）在 report 前
 * 询问本模块「该违规是否已登记豁免」。登记文件在 apps/frontend 包根
 * `design-governance.allowlist.json`，字段约束见同目录
 * `design-governance.allowlist.schema.json`；登记行为受宪法 `docs/design/PRINCIPLES.md`
 * 附录 A.1 约束（文件 + 规则 + 原因 + 责任人 + 到期日，五者缺一即整份判无效）。
 * **附录登记与本实现必须成对改动**——只写登记不改代码等于没豁免，只改代码不写登记
 * 等于暗箱豁免。
 *
 * ## 失效语义（fail-closed）
 *
 * - 文件不存在 → 零豁免（等价空表），违规照常告警，**不是错误**；
 * - JSON 解析失败 / 字段缺失 / rule 不在词表 / 日期非法 / expiresAt 超过最长 90 天
 *   → **抛错**：让每一次 lint 直接失败，而不是静默忽略坏行（静默忽略与暗箱豁免
 *   同型——登记了却不生效，审计者无法察觉）；
 * - expiresAt 已过 → 该条**自动失效**，违规恢复告警；死行靠 90 天滚动复登记清除。
 *
 * 「最长 90 天」与 `scripts/gen-components-md.mjs` 再生进 COMPONENTS.md 的文案同源；
 * 到期须重新登记并复述理由，这是机制强制的周期性复核点。
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** 正斜杠归一（Windows 的 path.relative 给反斜杠，startsWith 会静默失败） */
const toPosix = (p) => p.split('\\').join('/')

const FRONTEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ALLOWLIST_PATH = path.join(FRONTEND_ROOT, 'design-governance.allowlist.json')

/** 登记面向的三条规则；`*` = 该范围对三条规则全豁免（附录 A.1「范围级豁免」形态） */
const KNOWN_RULES = ['no-naked-controls', 'no-visual-override', 'no-adhoc-tone']
const MAX_TTL_DAYS = 90
const DAY_MS = 24 * 60 * 60 * 1000
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function fail(message) {
  throw new Error(
    `[design-governance] design-governance.allowlist.json 无效（${ALLOWLIST_PATH}）\n${message}`,
  )
}

function loadEntries() {
  let raw
  try {
    raw = readFileSync(ALLOWLIST_PATH, 'utf8')
  } catch (err) {
    if (err && err.code === 'ENOENT') return []
    fail(`读取失败：${err?.message}`)
  }

  let data
  try {
    data = JSON.parse(raw)
  } catch (err) {
    fail(`JSON 解析失败：${err?.message}`)
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    fail('顶层必须是对象（{ version, entries }）')
  }
  if (data.version !== 1) fail('version 必须是 1')
  if (!Array.isArray(data.entries)) fail('entries 必须是数组')

  return data.entries.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      fail(`entries[${index}] 必须是对象`)
    }
    const at = (field) => `entries[${index}]（${entry.file ?? '?'}）.${field}`
    for (const field of ['rule', 'file', 'reason', 'owner', 'expiresAt']) {
      if (typeof entry[field] !== 'string' || entry[field].trim() === '') {
        fail(`${at(field)} 必填（非空字符串）`)
      }
    }
    if (entry.rule !== '*' && !KNOWN_RULES.includes(entry.rule)) {
      fail(`${at('rule')} 必须是 ${KNOWN_RULES.join(' / ')} 或 *`)
    }
    if (entry.file.includes('\\')) {
      fail(`${at('file')} 必须用正斜杠（相对 apps/frontend 包根）`)
    }
    if (!DATE_RE.test(entry.expiresAt) || Number.isNaN(Date.parse(entry.expiresAt))) {
      fail(`${at('expiresAt')} 必须是 YYYY-MM-DD 日期`)
    }
    // 天数上限按「本地零点整天数」比较：登记「today + 90 天」恰为合法上限，
    // 若拿当日 23:59:59 减当前时刻会把恰好 90 天的登记误判为超期。
    const [y, m, d] = entry.expiresAt.split('-').map(Number)
    const expiryDay = new Date(y, m - 1, d).getTime()
    const nowDate = new Date()
    const todayDay = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime()
    if ((expiryDay - todayDay) / DAY_MS > MAX_TTL_DAYS) {
      fail(
        `${at('expiresAt')} 超过最长 ${MAX_TTL_DAYS} 天登记期` +
          `（宪法附录 A.1）：请缩短到期日，或走迁移/裁决把形态收编`,
      )
    }
    return entry
  })
}

const entries = loadEntries()

/**
 * 判定「某文件在某规则下」是否已登记豁免。
 *
 * 匹配口径（与宪法附录 A.1 的「范围」列一致）：
 * - `file` 相对 apps/frontend 包根、posix 斜杠；
 * - 以 `/**` 结尾按目录前缀匹配，否则按文件精确匹配。
 * 过期条目视为不存在（自动失效）。
 */
export function isExempt(ruleId, filename) {
  const rel = toPosix(path.relative(FRONTEND_ROOT, filename))
  if (rel.startsWith('..')) return false
  const now = Date.now()
  return entries.some((entry) => {
    if (Date.parse(`${entry.expiresAt}T23:59:59`) < now) return false
    if (entry.rule !== '*' && entry.rule !== ruleId) return false
    if (entry.file.endsWith('/**')) return rel.startsWith(entry.file.slice(0, -3))
    return rel === entry.file
  })
}
