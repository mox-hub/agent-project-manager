/**
 * no-naked-controls 豁免边界测试 —— G 类批 G0（方案 §六 验证第 3 条的固化）
 *
 * 边界口径（docs/design/修改方案-G类-分层解耦-2026-09-29.md §2.3 / 裁决 G3）：
 * - `components/raw/`    整目录豁免（原语的全部意义就是承载裸元素）→ 不报；
 * - `components/semantic/` 不豁免，裸控件 **error** 级 → 必须报且 severity = 2；
 * - 其余范围（modules/shared）维持 warn → 报但 severity = 1；
 * - `components/ui/` 原子层既有豁免不回退 → 不报。
 *
 * 实现说明：
 * - 用 ESLint `Linter`（v9 默认 flat config）内联驱动规则，filename 走与真实 lint
 *   相同的「src 相对 posix 路径」口径；JSX 用内置 espree 解析（探针代码无 TS 语法，
 *   AST 形态与 @typescript-eslint/parser 一致，避免对传递依赖的直接 import）。
 * - 第二组断言锁 **eslint.config.js 的 severity 接线**：semantic/** 覆盖块必须为
 *   error、基线块必须为 warn——规则内豁免与 config 内 severity 是两条独立防线，
 *   任一被误改都应在此红。
 */

import { describe, expect, it } from 'vitest'
import { Linter } from 'eslint'
import designGovernance from './design-governance.js'
import eslintConfig from '../eslint.config.js'

const NAKED_BUTTON = 'export function Probe() {\n  return <button type="button">probe</button>\n}\n'

const linter = new Linter({ configType: 'flat' })

function verify(code, filename, severity = 'warn') {
  return linter.verify(
    code,
    {
      // ESLint 9.39 的 Linter（flat config）要求显式 files 才会命中探针文件名；
      // 与真实 eslint.config.js 的 '**/*.{ts,tsx}' 口径一致。
      files: ['**/*.{ts,tsx}'],
      plugins: { 'design-governance': designGovernance },
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      rules: { 'design-governance/no-naked-controls': severity },
    },
    filename,
  )
}

describe('design-governance/no-naked-controls 豁免边界（G 类批 G0）', () => {
  it('components/raw/ 整目录豁免：裸 <button> 不报（原语的意义就是承载裸元素）', () => {
    expect(verify(NAKED_BUTTON, 'src/components/raw/probe.tsx')).toEqual([])
  })

  it('components/semantic/ 不豁免：裸 <button> 报 error（裁决 G3：零存量一步 error）', () => {
    const messages = verify(NAKED_BUTTON, 'src/components/semantic/probe.tsx', 'error')
    expect(messages).toHaveLength(1)
    expect(messages[0].ruleId).toBe('design-governance/no-naked-controls')
    expect(messages[0].severity).toBe(2) // 2 = error
  })

  it('其余范围（modules/shared）维持 warn 口径：报但 severity = 1', () => {
    const messages = verify(NAKED_BUTTON, 'src/modules/example/probe.tsx', 'warn')
    expect(messages).toHaveLength(1)
    expect(messages[0].ruleId).toBe('design-governance/no-naked-controls')
    expect(messages[0].severity).toBe(1) // 1 = warn
  })

  it('components/ui/ 原子层既有豁免不回退：裸 <table> 不报', () => {
    const table =
      'export function Probe() {\n  return <table><tbody><tr><td>x</td></tr></tbody></table>\n}\n'
    expect(verify(table, 'src/components/ui/probe.tsx')).toEqual([])
  })
})

describe('eslint.config.js severity 接线（G 类批 G0）', () => {
  it('semantic/** 覆盖块把 no-naked-controls 配为 error', () => {
    const override = eslintConfig.find(
      (c) => Array.isArray(c.files) && c.files.includes('src/components/semantic/**'),
    )
    expect(override).toBeDefined()
    expect(override.rules['design-governance/no-naked-controls']).toBe('error')
  })

  it('基线块维持其余范围 warn（不随 semantic 覆盖误伤）', () => {
    const baseline = eslintConfig.find(
      (c) =>
        Array.isArray(c.rules) === false &&
        c.rules &&
        c.rules['design-governance/no-naked-controls'] === 'warn',
    )
    expect(baseline).toBeDefined()
  })
})
