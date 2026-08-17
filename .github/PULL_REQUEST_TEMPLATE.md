## 变更摘要
- 需求/问题链接:
- 本次修改范围:
- 风险级别: 低 / 中 / 高

## 文档同步（阻断项）
- [ ] 已更新需求文档（`docs/meta/requirements/*`）或说明无需更新
- [ ] 已更新设计文档（`docs/02-架构设计/*`）或说明无需更新
- [ ] 已更新变更记录（`CHANGELOG.md`）
- [ ] 已更新文档同步证据（`docs-sync-manifest.json`，涉及核心模块时必填）

## 验收条件（Given-When-Then）
- Given:
- When:
- Then:

## UI 统一风格改造（阻断项，涉及前端时必填）
- [ ] 页面主题声明（本次页面主任务主题）已填写
- [ ] 交互策略声明（内嵌优先/弹层例外原因）已填写
- [ ] AI 标识覆盖说明（`data-ai-*`）已填写
- [ ] 动效说明与 `prefers-reduced-motion` 降级说明已填写

### UI 变更说明
- 页面主题：
- 交互策略：
- AI 标识覆盖率（核心交互元素）：
- 动效与降级策略：

## 测试证据（阻断项）
- [ ] `pnpm type-check`
- [ ] `pnpm -r lint`
- [ ] `pnpm --filter "./apps/frontend" run test --run`
- [ ] `pnpm --filter "./apps/server" run test --runInBand`
- [ ] `pnpm check:docs-sync`

### 命令输出摘要
```text
在此粘贴关键输出（通过/失败原因）
```

## 回滚方案
- 回滚步骤:
- 数据影响评估:
