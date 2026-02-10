# 文档索引（Documentation Index）

欢迎来到 Agent Project Manager 项目文档中心。本文档提供所有文档的索引与快速导航。

---

## 📚 文档结构

```
docs/
├── README.md                    # 本文档（文档索引）
├── architecture-design.md       # 总架构设计
├── architecture-frontend.md     # 前端架构与实现
├── architecture-backend.md      # 后端架构与实现
├── design-system.md             # UI/UX 设计规范
├── development-guide.md         # 开发指南
├── deployment-guide.md          # 部署指南
├── api/                        # API 设计文档
│   ├── README.md
│   ├── api-project.md
│   ├── api-ai-hub.md
│   └── ...
├── data-model/                 # 数据模型设计
│   ├── README.md
│   ├── model-project.md
│   └── ...
└── feature-design/             # 功能模块设计
    ├── feature-project.md
    ├── feature-ai-hub.md
    └── ...
```

---

## 🚀 快速开始

### 新开发者入门

1. **了解项目** → [总架构设计](./architecture-design.md)
2. **搭建环境** → [开发指南 - 环境搭建](./development-guide.md#3-环境搭建)
3. **阅读代码规范** → [开发指南 - 代码规范](./development-guide.md#4-代码规范)
4. **开始开发** → [开发指南 - 快速开始检查清单](./development-guide.md#13-快速开始检查清单)

### 前端开发者

1. **前端架构** → [前端架构与实现](./architecture-frontend.md)
2. **设计规范** → [UI/UX 设计规范](./design-system.md)
3. **API 对接** → [API 文档](./api/README.md)

### 后端开发者

1. **后端架构** → [后端架构与实现](./architecture-backend.md)
2. **API 设计** → [API 文档](./api/README.md)
3. **数据模型** → [数据模型设计](./data-model/README.md)

### 运维/部署人员

1. **部署方案** → [部署指南](./deployment-guide.md)
2. **架构概览** → [总架构设计](./architecture-design.md)

---

## 📖 文档分类

### 架构设计

| 文档 | 描述 | 适用人群 |
|------|------|----------|
| [总架构设计](./architecture-design.md) | 项目整体架构、设计原则、技术选型 | 所有开发者 |
| [前端架构](./architecture-frontend.md) | 前端技术栈、工程结构、实现示例 | 前端开发者 |
| [后端架构](./architecture-backend.md) | 后端技术栈、模块设计、实现示例 | 后端开发者 |

### 设计规范

| 文档 | 描述 | 适用人群 |
|------|------|----------|
| [UI/UX 设计规范](./design-system.md) | 设计原则、色彩系统、动画规范、组件规范 | 前端开发者、UI/UX 设计师 |

### 开发指南

| 文档 | 描述 | 适用人群 |
|------|------|----------|
| [开发指南](./development-guide.md) | 环境搭建、代码规范、Git 工作流、测试策略 | 所有开发者 |

### 部署运维

| 文档 | 描述 | 适用人群 |
|------|------|----------|
| [部署指南](./deployment-guide.md) | 单机/内网/云部署方案、监控、备份 | 运维人员、DevOps |

### API 文档

| 文档 | 描述 | 适用人群 |
|------|------|----------|
| [API 总览](./api/README.md) | API 统一约定、认证、错误格式 | 前后端开发者 |
| [项目 API](./api/api-project.md) | 项目、任务、迭代相关 API | 前后端开发者 |
| [AI Hub API](./api/api-ai-hub.md) | AI 对话、工作流相关 API | 前后端开发者 |
| [其他 API](./api/) | Git、Terminal、Plugin 等模块 API | 前后端开发者 |

### 数据模型

| 文档 | 描述 | 适用人群 |
|------|------|----------|
| [数据模型总览](./data-model/README.md) | 数据模型设计原则 | 后端开发者 |
| [项目数据模型](./data-model/model-project.md) | Project、Task 等核心实体 | 后端开发者 |
| [其他数据模型](./data-model/) | AI、Git、Plugin 等模块数据模型 | 后端开发者 |

### 功能设计

| 文档 | 描述 | 适用人群 |
|------|------|----------|
| [项目模块](./feature-design/feature-project.md) | 项目管理功能设计 | 产品经理、开发者 |
| [AI Hub 模块](./feature-design/feature-ai-hub.md) | AI 集成功能设计 | 产品经理、开发者 |
| [其他功能模块](./feature-design/) | Git、Terminal、Plugin 等功能设计 | 产品经理、开发者 |

---

## 🎯 按角色查找文档

### 产品经理 / 项目经理

- [总架构设计](./architecture-design.md) - 了解系统整体能力
- [功能模块设计](./feature-design/) - 了解各功能模块需求
- [API 文档](./api/) - 了解系统接口能力

### 前端开发者

- [前端架构与实现](./architecture-frontend.md) - 技术栈与工程结构
- [UI/UX 设计规范](./design-system.md) - 设计规范与组件使用
- [开发指南](./development-guide.md) - 环境搭建与代码规范
- [API 文档](./api/) - 了解后端接口

### 后端开发者

- [后端架构与实现](./architecture-backend.md) - 技术栈与模块设计
- [开发指南](./development-guide.md) - 环境搭建与代码规范
- [API 文档](./api/) - API 设计与实现
- [数据模型设计](./data-model/) - 数据库结构与实体关系

### UI/UX 设计师

- [UI/UX 设计规范](./design-system.md) - 设计原则、色彩、动画规范
- [前端架构](./architecture-frontend.md) - 了解技术实现约束

### 运维 / DevOps

- [部署指南](./deployment-guide.md) - 部署方案与运维实践
- [总架构设计](./architecture-design.md) - 了解系统架构

### 测试工程师

- [开发指南 - 测试策略](./development-guide.md#6-测试策略) - 测试方法与工具
- [API 文档](./api/) - API 测试用例设计参考
- [功能模块设计](./feature-design/) - 功能测试用例设计参考

---

## 📝 文档更新日志

### 2024-01-XX
- ✅ 创建文档索引
- ✅ 完善开发指南
- ✅ 添加部署指南

### 2024-01-XX
- ✅ 创建总架构设计文档
- ✅ 创建前端架构文档
- ✅ 创建后端架构文档
- ✅ 创建设计规范文档

---

## 🔍 文档搜索技巧

### 按关键词查找

- **环境搭建** → [开发指南 - 环境搭建](./development-guide.md#3-环境搭建)
- **代码规范** → [开发指南 - 代码规范](./development-guide.md#4-代码规范)
- **Git 工作流** → [开发指南 - Git 工作流](./development-guide.md#5-git-工作流)
- **测试** → [开发指南 - 测试策略](./development-guide.md#6-测试策略)
- **部署** → [部署指南](./deployment-guide.md)
- **API** → [API 文档](./api/README.md)
- **数据模型** → [数据模型设计](./data-model/README.md)

### 按问题查找

- **如何开始开发？** → [开发指南 - 快速开始检查清单](./development-guide.md#13-快速开始检查清单)
- **如何部署到生产环境？** → [部署指南](./deployment-guide.md)
- **前端如何调用 API？** → [前端架构 - API Client](./architecture-frontend.md#72-api-client-实现)
- **后端如何实现模块？** → [后端架构 - 业务模块实现](./architecture-backend.md#4-业务模块实现示例)
- **如何使用动画？** → [设计规范 - 动画系统](./design-system.md#5-动画系统animation-system)

---

## 💡 贡献文档

### 如何更新文档

1. **找到对应文档**：根据文档类型选择合适的位置
2. **编辑文档**：使用 Markdown 格式编写
3. **提交 PR**：遵循 [Git 工作流](./development-guide.md#5-git-工作流)
4. **代码审查**：等待审查通过后合并

### 文档编写规范

- 使用 Markdown 格式
- 保持结构清晰，使用标题层级
- 提供代码示例（如适用）
- 添加必要的链接与引用
- 保持与现有文档风格一致

---

## 📞 获取帮助

### 文档问题

- 发现文档错误或需要补充？请提交 Issue 或 PR
- 文档不够清晰？欢迎提出改进建议

### 开发问题

- 查看 [开发指南 - 常见问题](./development-guide.md#8-常见问题与故障排查)
- 提交 GitHub Issue
- 参与 GitHub Discussions

---

## 🔗 外部资源

- [项目 GitHub 仓库](https://github.com/your-org/agent-project-manager)
- [问题反馈](https://github.com/your-org/agent-project-manager/issues)
- [讨论区](https://github.com/your-org/agent-project-manager/discussions)

---

## 📌 重要提示

1. **首次阅读**：建议先阅读 [总架构设计](./architecture-design.md) 了解项目全貌
2. **开始开发**：务必完成 [开发指南 - 快速开始检查清单](./development-guide.md#13-快速开始检查清单)
3. **保持更新**：文档会持续更新，建议定期查看最新版本
4. **反馈意见**：如有文档改进建议，欢迎提交 Issue 或 PR

---

**最后更新**: 2024-01-XX  
**维护者**: 开发团队
