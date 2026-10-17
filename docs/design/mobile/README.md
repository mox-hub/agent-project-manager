---
title: 移动端材料索引（M0）
description: APM 移动端（Expo + React Native 伴随式掌上治理台）前期材料总索引——效力链导航、材料状态表、决策基线、批次规划
status: active
scope: apps/mobile
created: "2026-10-11"
governance: "设计规范正文见 ./PRINCIPLES-MOBILE.md（独立卷，scope: apps/mobile）；本目录是移动端材料唯一落点（docs/design/ 是全仓唯一入库的 docs 例外）"
---

# 移动端材料索引（M0）

> **为什么材料落在这里**：`.gitignore` 规则为 `docs/*` + 唯一例外 `!docs/design/`——只有 `docs/design/` 下的文件入库（可评审、有历史、可回滚）。`docs/design/mobile/` 是移动端全部材料的唯一落点。
>
> **本目录的性质**：M0 期（0.8.x 周期内）产出的是**前期材料**，不含移动端生产代码。能力卡见 `docs/01-需求/能力清单-v1.md` §4.8（`CAP-M-01…M-10`，全部 `planned`）。

## 一、决策基线（2026-10-11 用户拍板，不再讨论）

| 项 | 裁决 | 落点 |
|---|---|---|
| 技术路线 | **Expo + React Native**，独立 App，iOS + Android 双端一码 | [ADR-M-001](./ADR-M-001-移动端技术路线.md) |
| 产品定位 | **伴随式掌上治理台**——只读 + 轻写；非目标＝代码编辑、工作区管理、流程画布、深度富文本编辑（一律回桌面） | [页面蓝图](./页面蓝图.md) |
| 平台 | iOS + Android 双端，手机竖屏为主（平板降级，不做专门适配） | [PRINCIPLES-MOBILE](./PRINCIPLES-MOBILE.md) §2 |
| 节奏 | **设计先行 + 并行铺路**：0.8.x 内出全套材料 + 技术选型 spike；0.9 起分批实现 | [排期与出口判据](./排期与出口判据.md) |
| 规范立卷 | 另立**独立卷** `PRINCIPLES-MOBILE.md`，不并入前端宪法；前端宪法 §15.2 原文保留 + 交叉引用 | [PRINCIPLES-MOBILE](./PRINCIPLES-MOBILE.md) |

## 二、效力链（移动端）

```
docs/design/mobile/PRINCIPLES-MOBILE.md   ← 移动端设计规范唯一真相源（版本号只在该卷头部声明一处）
        ↓
apps/mobile/scripts/check-*.mjs            ← 该卷的机器执行镜像（对标前端 10 个 check-*.mjs 的效力链位置）
        ↓
apps/mobile/** 代码
```

**与前端宪法的关系**：两者**平行**，不互相覆盖。前端宪法 `scope: apps/frontend` 的条文（含 §15.2「不做手机版适配」）对前端/桌面壳**继续成立**；移动端自有 UI 与规范，由本目录的独立卷管辖。两卷共用同一套**角色语义**（语义色/状态/信任等级口径），但**数值与实现管道各自独立**（前端走 Tailwind + CSS 变量，移动端走 RN style + 自有 token 管道）。

## 三、材料状态表

| # | 文件 | 内容 | 状态 |
|---|------|------|------|
| 0 | `README.md`（本文件） | 索引 + 状态表 + 效力链导航 | ✅ 已落 |
| 1 | [ADR-M-001-移动端技术路线.md](./ADR-M-001-移动端技术路线.md) | 固化 Expo+RN 裁决、排除项理由、spike 跑法 | ✅ 已落 |
| 2 | [交互模式-原语映射.md](./交互模式-原语映射.md) | 桌面交互原语 → 移动替代模式逐条判定 | ✅ 已落 |
| 3 | [页面蓝图.md](./页面蓝图.md) | 导航图（Stack+Tab）、页清单、数据来源与端点、深链映射 | ✅ 已落 |
| 4 | [能力卡-M线-副本.md](./能力卡-M线-副本.md) | `CAP-M-01…M-10` 可评审副本（含六问作答），与能力清单 §4.8 同步 | ✅ 已落 |
| 5 | [PRINCIPLES-MOBILE.md](./PRINCIPLES-MOBILE.md) | 移动端设计规范**独立卷**（`scope: apps/mobile`），13 章 | ✅ 已落 |
| 6 | [工程接入方案.md](./工程接入方案.md) | `apps/mobile` 目录、`apm-contract` 抽包、turbo/CI/knip/lint-staged 逐条 | ✅ 已落 |
| 7 | [后端适配清单.md](./后端适配清单.md) | 移动端需补的端点/字段，分级「阻断/增强」 | ✅ 已落 |
| 8 | [测试策略.md](./测试策略.md) | 单测/契约/组件（RN TL）/e2e（Maestro）/真机矩阵 | ✅ 已落 |
| 9 | [发布与分发方案.md](./发布与分发方案.md) | EAS Build/Submit/Update、iOS 签名、Android keystore、内测通道 | ✅ 已落 |
| 10 | [spike-Expo-RN-报告.md](./spike-Expo-RN-报告.md) | spike 结论 + 实测数据 | ⏳ 待跑（跑法见 ADR-M-001 §5） |
| 11 | [排期与出口判据.md](./排期与出口判据.md) | M0–M3 阶段、每阶段出口、与 0.8.x/0.9.x 咬合 | ✅ 已落 |
| 12 | `CHANGELOG.md` 行 | 每批材料落地登记一行，满足 `check:docs-sync` | ✅ 已落 |

> **例外说明**：`spike`（#10）是本轮**唯一会写 `docs/design/` 之外代码**的动作（会创建 `apps/mobile/` 试验工程）。**该试验工程的落地需单独取得确认**；未确认前 #10 保持「待跑」，不影响其余材料的完整性。

## 四、与需求治理的钩子

- **能力卡**：`docs/01-需求/能力清单-v1.md` §4.8（`CAP-M-01…M-10`，10 卡，`planned`）。开工前须走 `requirement-intake` 逐卡登记（置 `doing` + 拆细 GAP）。
- **测试义务**：`docs/01-需求/测试映射矩阵-v1.md` `GAP-T-69`（**占位**，开工时逐卡拆细）。
- **六问**：逐卡作答见 [能力卡-M线-副本.md](./能力卡-M线-副本.md)；红线（AI 不得自己生成标准、自己宣称符合、再把自己的结论当独立证据）在 M-03/M-05 两卡有专门落点。
