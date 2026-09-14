/**
 * 内置工单类型定义（CAP-A-04）：task/bug 为系统内置类型，isSystem=true，
 * 服务端守卫禁止删除（只能修改）；用于兼容存量数据的旧 type 字符串口径
 * （Issue.type 'task'|'bug' → IssueType.key 桥接）。
 *
 * bug 六字段 fieldSchema 与 src/common/utils/issue-custom-fields.util.ts
 * 的 BUILTIN_CUSTOM_FIELD_KEYS 对齐；severity 用 select（存量数据已核验为规范值）。
 * prisma/seed.ts 与 prisma/build-template.ts 共用本定义（单一事实源）。
 */
export function buildBuiltinIssueTypes() {
  return [
    {
      key: 'task',
      name: '任务',
      description: '跟踪通用任务和后续任务',
      icon: 'Circle',
      color: '#5E6AD2',
      order: 10,
      isSystem: true,
      fieldSchema: undefined,
    },
    {
      key: 'bug',
      name: '缺陷',
      description: '识别并跟踪需要解决的软件缺陷',
      icon: 'Bug',
      color: '#EF4444',
      order: 20,
      isSystem: true,
      fieldSchema: [
        {
          key: 'severity',
          label: '严重度',
          type: 'select',
          options: ['critical', 'high', 'medium', 'low'],
          order: 1,
        },
        {
          key: 'bugReproducibility',
          label: '复现概率',
          type: 'text',
          order: 2,
        },
        {
          key: 'bugStepsToReproduce',
          label: '复现步骤',
          type: 'textarea',
          order: 3,
        },
        { key: 'bugEnvironment', label: '环境', type: 'textarea', order: 4 },
        {
          key: 'bugExpectedResult',
          label: '预期结果',
          type: 'textarea',
          order: 5,
        },
        {
          key: 'bugActualResult',
          label: '实际结果',
          type: 'textarea',
          order: 6,
        },
      ],
    },
  ];
}
