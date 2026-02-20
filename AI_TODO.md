# Agent Project Manager - AI可执行TODO清单

> **文档版本**: 1.0
> **生成日期**: 2026-02-20
> **基于分析**: `ANALYSIS_REPORT.md`
> **目标**: 为AI代理提供详细的、可执行的、包含验收标准的工作清单

---

## 📋 目录

- [使用说明](#使用说明)
- [优先级定义](#优先级定义)
- [P0 - 严重安全漏洞与阻塞错误](#p0---严重安全漏洞与阻塞错误)
- [P1 - 核心功能缺失](#p1---核心功能缺失)
- [P2 - 性能优化与代码质量](#p2---性能优化与代码质量)
- [P3 - 测试与工程化](#p3---测试与工程化)
- [任务统计](#任务统计)

---

## 📖 使用说明

### AI执行指南

本TODO清单专为AI代理设计，每个任务包含：

1. **任务ID**: 唯一标识符，用于跟踪
2. **优先级**: P0(严重) → P3(低)
3. **文件路径**: 需要修改的文件路径
4. **详细步骤**: 具体的修改指令，包含代码示例
5. **验收标准**: 如何判断任务完成
6. **依赖任务**: 必须先完成的前置任务
7. **预计工作量**: 预计时间（小时/天）
8. **参考文档**: 相关文档路径

### 执行顺序

**必须按优先级顺序执行**：
1. 先完成所有P0任务（安全风险 + 阻塞性错误）
2. 再完成所有P1任务（核心功能）
3. 然后完成P2任务（性能优化）
4. 最后完成P3任务（增强功能）

### 任务状态标记

完成一个任务后，请在任务ID前添加状态标记：

```markdown
- [x] P0-SEC-001  // ✅ 已完成
- [ ] P0-TS-001    // ⬜ 未开始
- [~] P1-FEAT-001   // 🔄 进行中
```

---

## 🚨 优先级定义

| 优先级 | 含义 | 执行策略 | 示例 |
|--------|------|----------|------|
| **P0** | 严重安全漏洞或阻塞开发的问题 | 必须立即开始 | 加密密钥硬编码、TypeScript构建错误 |
| **P1** | 核心功能缺失或高优先级改进 | 阻塞关键路径 | Plugin模块、AI工作流引擎 |
| **P2** | 性能优化、代码质量提升 | 提升用户体验 | Redis缓存、事务支持 |
| **P3** | 增强功能、工具改进 | 锦上添花 | 单元测试、Docker配置 |

---

## P0 - 严重安全漏洞与阻塞错误

### P0-SEC-001: 修复加密密钥硬编码问题

| 属性 | 值 |
|------|------|
| **优先级** | P0 🔴 |
| **模块** | Backend - Integration |
| **风险等级** | Critical - 生产安全风险 |
| **预计工作量** | 0.5小时 |

#### 文件路径

```
apps/server/src/modules/integration/integration.service.ts
```

#### 详细步骤

1. **定位问题代码**
   - 查找 `this.encryptionKey` 赋值位置
   - 通常在 `IntegrationService` 的构造函数中

2. **移除默认值fallback**
   ```typescript
   // ❌ 错误代码
   this.encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY || 'default-key-change-in-production';
   
   // ✅ 正确代码
   if (!process.env.INTEGRATION_ENCRYPTION_KEY) {
     throw new Error('INTEGRATION_ENCRYPTION_KEY environment variable is required');
   }
   this.encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY;
   ```

3. **更新环境变量验证**
   - 在 `apps/server/src/config/validation.ts` 中添加必填验证
   - 确保 `INTEGRATION_ENCRYPTION_KEY` 在生产环境必填

4. **更新部署文档**
   - 在 `apps/server/README.md` 中添加环境变量说明

#### 验收标准

- [ ] 代码中不再有硬编码的默认密钥
- [ ] 如果环境变量未设置，应用启动时报错
- [ ] 部署文档已更新
- [ ] 后端构建成功（`npm run build`）

#### 参考文档

- `ANALYSIS_REPORT.md` - 第4.3节，安全风险分析

---

### P0-SEC-002: 更新加密API为crypto.createCipheriv

| 属性 | 值 |
|------|------|
| **优先级** | P0 🔴 |
| **模块** | Backend - Integration |
| **风险等级** | Critical - 使用已弃用API |
| **预计工作量** | 0.5小时 |

#### 文件路径

```
apps/server/src/modules/integration/integration.service.ts
```

#### 详细步骤

1. **查找所有使用createCipher的地方**
   ```bash
   cd apps/server/src
   grep -r "createCipher" --include="*.ts"
   ```

2. **替换为createCipheriv**
   ```typescript
   // ❌ 错误代码（已弃用）
   const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
   
   // ✅ 正确代码
   const iv = crypto.randomBytes(16);
   const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
   ```

3. **同时更新解密方法**
   ```typescript
   // 确保encrypt和decrypt都使用IV
   const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
   ```

4. **更新相关数据模型**
   - 检查 `IntegrationConfig` 模型是否需要添加 `iv` 字段
   - 如果需要，运行 `prisma migrate dev`

#### 验收标准

- [ ] 代码中不再使用已弃用的`crypto.createCipher`
- [ ] 所有加密/解密使用`createCipheriv`/`createDecipheriv`
- [ ] 如果模型变更，数据库迁移已应用
- [ ] 后端构建成功

#### 参考文档

- `ANALYSIS_REPORT.md` - 第4.3节，加密API问题

---

### P0-SEC-003: 限制CORS origin白名单

| 属性 | 值 |
|------|------|
| **优先级** | P0 🔴 |
| **模块** | Backend - Main |
| **风险等级** | High - CORS过于宽松 |
| **预计工作量** | 0.5小时 |

#### 文件路径

```
apps/server/src/main.ts
apps/server/src/gateway/events.gateway.ts
```

#### 详细步骤

1. **更新main.ts中的CORS配置**
   ```typescript
   // ❌ 错误配置
   app.enableCors({
     origin: true,  // 太宽松
     credentials: true,
   });
   
   // ✅ 正确配置
   const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
   app.enableCors({
     origin: (origin, callback) => {
       if (!origin) return callback(null, true);
       if (allowedOrigins.includes(origin)) {
         callback(null, true);
       } else {
         callback(new Error('Not allowed by CORS'));
       }
     },
     credentials: true,
   });
   ```

2. **更新events.gateway.ts中的CORS配置**
   ```typescript
   // ❌ 错误配置
   cors: {
     origin: '*',  // 注释说"生产环境应限制"
   }
   
   // ✅ 正确配置
   cors: {
     origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
     credentials: true,
   }
   ```

3. **添加环境变量**
   - 在 `.env` 或 `.env.local` 中添加：
     ```
     ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com
     ```

#### 验收标准

- [ ] main.ts不再使用`origin: true`
- [ ] events.gateway.ts不再使用`origin: '*'`
- [ ] 环境变量已配置
- [ ] 后端构建成功

#### 参考文档

- `ANALYSIS_REPORT.md` - 第4.3节，CORS配置问题

---

### P0-TS-001: 修复API响应类型不匹配（use-ai-conversations.ts）

| 属性 | 值 |
|------|------|
| **优先级** | P0 🔴 |
| **模块** | Frontend - AI Hub |
| **影响范围** | 阻塞构建 |
| **预计工作量** | 1小时 |

#### 文件路径

```
apps/frontend/src/modules/ai-hub/hooks/use-ai-conversations.ts
```

#### 详细步骤

1. **理解问题**
   - 后端返回: `{ data: AIConversation[], meta: {...} }`
   - 前端期望: `AIConversation[]`
   - TanStack Query无法正确推断类型

2. **创建响应包装类型**
   ```typescript
   // apps/frontend/src/shared/types/api.ts
   export interface ApiResponse<T> {
     data: T;
     meta?: {
       page?: number;
       pageSize?: number;
       total?: number;
     };
   }
   
   export type ConversationListResponse = ApiResponse<AIConversation[]>;
   ```

3. **更新hook使用包装类型**
   ```typescript
   // ❌ 错误代码
   export function useAIConversations() {
     return useQuery({
       queryKey: ['ai-conversations'],
       queryFn: async () => {
         const response = await aiHubApi.getConversations();
         return response;  // 类型不匹配
       },
     });
   }
   
   // ✅ 正确代码
   export function useAIConversations() {
     return useQuery({
       queryKey: ['ai-conversations'],
       queryFn: async () => {
         const response = await aiHubApi.getConversations();
         return response.data;  // 提取data字段
       },
     });
   }
   ```

4. **更新API类型定义**
   ```typescript
   // apps/frontend/src/modules/ai-hub/api/ai-hub-api.ts
   async getConversations(): Promise<ApiResponse<AIConversation[]>> {
     // 明确返回类型
   }
   ```

#### 验收标准

- [ ] useAIConversations hook编译通过
- [ ] API响应类型明确为包装类型
- [ ] 前端构建成功（`npm run build`）
- [ ] 无TypeScript错误

#### 参考文档

- `ANALYSIS_REPORT.md` - 第2.3节，API响应类型不匹配

---

### P0-TS-002: 修复API响应类型不匹配（use-project-list.ts）

| 属性 | 值 |
|------|------|
| **优先级** | P0 🔴 |
| **模块** | Frontend - Project |
| **影响范围** | 阻塞构建 |
| **预计工作量** | 1小时 |

#### 文件路径

```
apps/frontend/src/modules/project/hooks/use-project-list.ts
```

#### 详细步骤

1. **使用相同的响应包装类型**
   - 复用 `P0-TS-001` 中创建的 `ApiResponse<T>` 类型

2. **更新hook实现**
   ```typescript
   export function useProjectList(params?: ProjectListParams) {
     return useQuery({
       queryKey: ['projects', params],
       queryFn: async () => {
         const response = await projectApi.getProjects(params);
         return response.data;  // 提取data字段
       },
     });
   }
   ```

3. **更新相关API方法**
   ```typescript
   async getProjects(params?: ProjectListParams): Promise<ApiResponse<Project[]>> {
     // 明确返回类型
   }
   ```

#### 验收标准

- [ ] useProjectList hook编译通过
- [ ] 项目列表能正常加载
- [ ] 前端构建成功
- [ ] 无TypeScript错误

#### 参考文档

- `ANALYSIS_REPORT.md` - 第2.3节，API响应类型不匹配

---

### P0-TS-003: 添加integration-api.ts的put方法

| 属性 | 值 |
|------|------|
| **优先级** | P0 🔴 |
| **模块** | Frontend - Integration |
| **影响范围** | 阻塞构建 |
| **预计工作量** | 0.5小时 |

#### 文件路径

```
apps/frontend/src/modules/integration/api/integration-api.ts
```

#### 详细步骤

1. **查看API客户端现有方法**
   ```typescript
   // apps/frontend/src/infrastructure/api-client/index.ts
   // 检查是否有put方法实现
   ```

2. **添加put方法到API客户端**
   ```typescript
   // 如果API客户端没有put方法，需要添加
   put<T = unknown, R = ApiResponse<T>>(
     url: string,
     data?: T,
     config?: AxiosRequestConfig,
   ): Promise<R> => {
     return this.client.put<R>(url, data, config);
   };
   ```

3. **在integration-api.ts中使用put方法**
   ```typescript
   // 更新集成配置的方法
   async updateIntegration(
     integrationId: string,
     config: IntegrationConfig
   ): Promise<ApiResponse<Integration>> {
     return api.put(`/integrations/${integrationId}`, config);
   }
   ```

4. **更新相关hooks**
   ```typescript
   // apps/frontend/src/modules/integration/hooks/use-integration-mutations.ts
   export function useUpdateIntegration() {
     return useMutation({
       mutationFn: ({ id, config }) =>
         integrationApi.updateIntegration(id, config),
     });
   }
   ```

#### 验收标准

- [ ] integration-api.ts编译通过
- [ ] API客户端有put方法
- [ ] 前端构建成功
- [ ] 无TypeScript错误

#### 参考文档

- `ANALYSIS_REPORT.md` - 第2.3节，API层实现问题

---

### P0-TS-004: 添加notification-api.ts的put方法

| 属性 | 值 |
|------|------|
| **优先级** | P0 🔴 |
| **模块** | Frontend - Notification |
| **影响范围** | 阻塞构建 |
| **预计工作量** | 0.5小时 |

#### 文件路径

```
apps/frontend/src/modules/notification/api/notification-api.ts
```

#### 详细步骤

1. **使用相同的put方法（与P0-TS-003相同）**

2. **添加标记已读功能**
   ```typescript
   // 标记通知为已读
   async markAsRead(notificationId: string): Promise<ApiResponse<void>> {
     return api.put(`/notifications/${notificationId}/read`);
   }
   
   // 标记所有通知为已读
   async markAllAsRead(): Promise<ApiResponse<void>> {
     return api.put('/notifications/read-all');
   }
   ```

3. **更新相关hooks**
   ```typescript
   // apps/frontend/src/modules/notification/hooks/use-notification-mutations.ts
   export function useMarkAsRead() {
     return useMutation({
       mutationFn: (id) => notificationApi.markAsRead(id),
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['notifications'] });
       },
     });
   }
   ```

#### 验收标准

- [ ] notification-api.ts编译通过
- [ ] API客户端有put方法
- [ ] 前端构建成功
- [ ] 无TypeScript错误

#### 参考文档

- `ANALYSIS_REPORT.md` - 第2.3节，API层实现问题

---

### P0-TS-005: 修复事件处理器类型安全（use-event-subscription.ts）

| 属性 | 值 |
|------|------|
| **优先级** | P0 🔴 |
| **模块** | Frontend - Infrastructure |
| **风险等级** | High - 运行时类型错误风险 |
| **预计工作量** | 2小时 |

#### 文件路径

```
apps/frontend/src/infrastructure/hooks/use-event-subscription.ts
```

#### 详细步骤

1. **创建Socket事件类型系统**
   ```typescript
   // apps/frontend/src/shared/types/socket-events.ts
   export type SocketEventMap = {
     'ai:chunk': { conversationId: string; chunk: string; };
     'ai:stream': {
       conversationId: string;
       messageId: string;
       chunk: string;
       isFinal: boolean;
     };
     'git:status': { status: GitStatus };
     'terminal:output': { output: string };
   };
   
   export type EventHandler<T extends keyof SocketEventMap> = (
     event: T,
     handler: (payload: SocketEventMap[T]) => void
   ) => void;
   ```

2. **更新use-event-subscription.ts**
   ```typescript
   // ❌ 错误代码
   const on = <T>(event: string, handler: (payload: T) => void) => {
     this.socket.on(event, handler);  // payload为unknown
   }
   
   // ✅ 正确代码
   const on = <K extends keyof SocketEventMap>(
     event: K,
     handler: (payload: SocketEventMap[K]) => void
   ): void => {
     this.socket.on(event, handler as any);  // 类型安全
   }
   ```

3. **更新事件客户端类型**
   ```typescript
   // apps/frontend/src/infrastructure/event-client/index.ts
   export class EventClient {
     on<K extends keyof SocketEventMap>(
       event: K,
       handler: (payload: SocketEventMap[K]) => void
     ): void {
       // 实现类型安全的事件订阅
     }
   }
   ```

#### 验收标准

- [ ] use-event-subscription.ts编译通过
- [ ] SocketEventMap类型定义完整
- [ ] 所有事件订阅使用类型安全的方法
- [ ] 前端构建成功
- [ ] 无TypeScript错误

#### 参考文档

- `ANALYSIS_REPORT.md` - 第1.2.6节，Socket.IO事件类型安全缺失

---

### P0-TS-006: 修复事件处理器类型安全（use-ai-chat.ts）

| 属性 | 值 |
|------|------|
| **优先级** | P0 🔴 |
| **模块** | Frontend - AI Hub |
| **风险等级** | High - 运行时类型错误风险 |
| **预计工作量** | 1小时 |

#### 文件路径

```
apps/frontend/src/modules/ai-hub/hooks/use-ai-chat.ts
```

#### 详细步骤

1. **使用SocketEventMap类型系统**
   - 复用 `P0-TS-005` 中创建的类型系统

2. **更新事件处理器**
   ```typescript
   // ❌ 错误代码
   eventClient.on('ai:stream', (data) => {
     // data类型为unknown
   });
   
   // ✅ 正确代码
   eventClient.on('ai:stream', (data: { conversationId: string; messageId: string; chunk: string; isFinal: boolean; }) => {
     setChunks(prev => [...prev, data.chunk]);
     if (data.isFinal) {
       setStreaming(false);
     }
   });
   ```

#### 验收标准

- [ ] use-ai-chat.ts编译通过
- [ ] 事件处理器类型安全
- [ ] AI聊天功能正常工作
- [ ] 前端构建成功
- [ ] 无TypeScript错误

#### 参考文档

- `ANALYSIS_REPORT.md` - 第1.2.6节，Socket.IO事件类型安全缺失

---

### P0-TS-007: 修复事件处理器类型安全（use-ai-workflows.ts）

| 属性 | 值 |
|------|------|
| **优先级** | P0 🔴 |
| **模块** | Frontend - AI Hub |
| **风险等级** | High - 运行时类型错误风险 |
| **预计工作量** | 1小时 |

#### 文件路径

```
apps/frontend/src/modules/ai-hub/hooks/use-ai-workflows.ts
```

#### 详细步骤

1. **使用相同的SocketEventMap类型系统**

2. **更新事件处理器**
   ```typescript
   // 更新工作流执行进度的事件处理器
   eventClient.on('workflow:progress', (data: {
     workflowRunId: string;
     stepId?: string;
     status: string;
     output?: any;
     error?: any;
   }) => {
     // 类型安全的事件处理
   });
   ```

#### 验收标准

- [ ] use-ai-workflows.ts编译通过
- [ ] 事件处理器类型安全
- [ ] 工作流进度更新正常
- [ ] 前端构建成功
- [ ] 无TypeScript错误

#### 参考文档

- `ANALYSIS_REPORT.md` - 第1.2.6节，Socket.IO事件类型安全缺失

---

### P0-TS-008: 修复null vs undefined类型不一致

| 属性 | 值 |
|------|------|
| **优先级** | P0 🔴 |
| **模块** | Frontend - AI Hub, Shared UI |
| **影响范围** | 阻塞构建 |
| **预计工作量** | 1小时 |

#### 文件路径

```
apps/frontend/src/modules/ai-hub/components/ai-chat-panel.tsx
apps/frontend/src/modules/ai-hub/pages/ai-space-page.tsx
apps/frontend/src/shared/ui/filter-panel.tsx
```

#### 详细步骤

1. **检查所有null vs undefined错误**

2. **统一使用undefined**
   ```typescript
   // ❌ 错误代码 - 可能为null
   const conversationId: string | null = null;
   
   // ✅ 正确代码
   const conversationId: string | undefined = undefined;
   ```

3. **或使用可选链**
   ```typescript
   // ✅ 更好的方式 - 使用可选链
   const conversationId?: string = undefined;
   ```

4. **添加null检查**
   ```typescript
   // 如果必须处理null情况
   const displayValue = value ?? 'default';
   ```

#### 验收标准

- [ ] 所有null vs undefined错误已修复
- [ ] 代码类型一致性统一
- [ ] 前端构建成功
- [ ] 无TypeScript错误

#### 参考文档

- `ANALYSIS_REPORT.md` - 第2.2节，TypeScript错误分析

---

### P0-INF-001: 创建src/common/目录和共享基础设施

| 属性 | 值 |
|------|------|
| **优先级** | P0 🔴 |
| **模块** | Backend |
| **影响范围** | 架构完整性 |
| **预计工作量** | 1-2天 |

#### 文件路径

```
apps/server/src/common/
```

#### 详细步骤

**1. 创建common目录结构**
   ```bash
   cd apps/server/src
   mkdir -p common/{guards,interceptors,filters,decorators,pipes,dto}
   ```

**2. 实现JwtAuthGuard**
   ```typescript
   // apps/server/src/common/guards/jwt-auth.guard.ts
   @Injectable()
   export class JwtAuthGuard extends AuthGuard('jwt') {
     canActivate(context: ExecutionContext): boolean | Promise<boolean> {
       return super.canActivate(context);
     }
   }
   ```

**3. 实现HttpExceptionFilter**
   ```typescript
   // apps/server/src/common/filters/http-exception.filter.ts
   @Catch()
   export class HttpExceptionFilter implements ExceptionFilter {
     catch(exception: unknown, host: ArgumentsHost) {
       const ctx = host.switchToHttp();
       const response = ctx.getResponse();
       const request = ctx.getRequest();
       
       const status = exception instanceof HttpException
         ? exception.getStatus()
         : HttpStatus.INTERNAL_SERVER_ERROR;
         
       response.status(status).json({
         success: false,
         statusCode: status,
         timestamp: new Date().toISOString(),
         path: request.url,
         error: exception instanceof HttpException
           ? exception.getResponse()
           : { message: 'Internal server error' },
       });
     }
   }
   ```

**4. 实现LoggingInterceptor**
   ```typescript
   // apps/server/src/common/interceptors/logging.interceptor.ts
   @Injectable()
   export class LoggingInterceptor implements NestInterceptor {
     intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
       const request = context.switchToHttp().getRequest();
       const { method, url } = request;
       const now = Date.now();
       
       return next.handle().pipe(
         tap(() => {
           const delay = Date.now() - now;
           console.log(`${method} ${url} ${delay}ms`);
         }),
       );
     }
   }
   ```

**5. 实现TransformInterceptor**
   ```typescript
   // apps/server/src/common/interceptors/transform.interceptor.ts
   @Injectable()
   export class TransformInterceptor implements NestInterceptor {
     intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
       return next.handle().pipe(
         map(data => ({
           success: true,
           data,
           timestamp: new Date().toISOString(),
         })),
       );
     }
   }
   ```

**6. 实现Audit Logging**
   ```typescript
   // apps/server/src/common/logging/audit-logger.service.ts
   @Injectable()
   export class AuditLogger {
     async audit(
       action: string,
       actorId: string | null,
       resourceType: string,
       resourceId: string | null,
       metadata?: Record<string, any>,
     ): Promise<void> {
       // 实现审计日志记录
     }
   }
   ```

**7. 更新app.module.ts注册全局组件**
   ```typescript
   // apps/server/src/app.module.ts
   import { APP_FILTER, APP_INTERCEPTOR } from './common/constants';
   
   @Module({
     providers: [
       {
         provide: APP_FILTER,
         useClass: HttpExceptionFilter,
       },
       {
         provide: APP_INTERCEPTOR,
         useClass: LoggingInterceptor,
       },
       // 添加TransformInterceptor
     ],
   })
   export class AppModule {}
   ```

#### 验收标准

- [ ] common目录创建完成
- [ ] 所有guards/interceptors/filters实现并测试
- [ ] 全局注册完成
- [ ] 后端构建成功
- [ ] 后端启动无错误

#### 参考文档

- `ANALYSIS_REPORT.md` - 第1.2.1节，缺少src/common/目录

---

## P1 - 核心功能缺失

### P1-BE-001: 实现Plugin模块

| 属性 | 值 |
|------|------|
| **优先级** | P1 🟡 |
| **模块** | Backend - Plugin |
| **影响范围** | 核心功能完全缺失 |
| **预计工作量** | 3-5天 |
| **依赖任务** | P0-INF-001 (需要common/基础设施) |

#### 文件路径

```
apps/server/src/modules/plugin/
```

#### 详细步骤

**1. 创建Plugin目录结构**
   ```bash
   cd apps/server/src/modules
   mkdir -p plugin/{runtime,sandbox}
   ```

**2. 实现Plugin数据模型**
   ```prisma
   // apps/server/prisma/schema.prisma
   model Plugin {
     id          String   @id @default(uuid())
     name        String
     version     String
     description String?
     manifest    Json
     enabled     Boolean  @default(true)
     config      Json?
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt
   }
   
   model PluginPermission {
     id        String   @id @default(uuid())
     pluginId  String
     permission String
     granted   Boolean  @default(false)
     plugin    Plugin @relation(fields: [pluginId], references: [id])
     
     @@index([pluginId])
   }
   
   // 运行迁移
   // npx prisma migrate dev --name add_plugin_models
   ```

**3. 实现plugin.module.ts**
   ```typescript
   import { Module } from '@nestjs/common';
   import { PluginService } from './plugin.service';
   import { PluginController } from './plugin.controller';
   
   @Module({
     imports: [],
     controllers: [PluginController],
     providers: [PluginService],
     exports: [PluginService],
   })
   export class PluginModule {}
   ```

**4. 实现plugin.service.ts**
   ```typescript
   import { Injectable } from '@nestjs/common';
   import { PrismaService } from '../common/prisma/prisma.service';
   
   @Injectable()
   export class PluginService {
     constructor(private prisma: PrismaService) {}
     
     async findAll(): Promise<Plugin[]> {
       return this.prisma.plugin.findMany({ where: { enabled: true } });
     }
     
     async findById(id: string): Promise<Plugin | null> {
       return this.prisma.plugin.findUnique({ where: { id } });
     }
     
     async install(manifest: any): Promise<Plugin> {
       // 实现插件安装逻辑
     }
     
     async uninstall(id: string): Promise<void> {
       // 实现插件卸载逻辑
     }
   }
   ```

**5. 实现plugin-loader.service.ts**
   ```typescript
   @Injectable()
   export class PluginLoaderService {
     async loadPlugins(): Promise<void> {
       // 扫描plugins目录
       // 加载manifest.json
       // 验证插件
     }
   }
   ```

**6. 实现plugin-runtime.service.ts**
   ```typescript
   @Injectable()
   export class PluginRuntimeService {
     async executePlugin(
       pluginId: string,
       method: string,
       params: any
     ): Promise<any> {
       // 在沙箱中执行插件代码
     }
   }
   ```

**7. 实现sandbox.service.ts**
   ```typescript
   @Injectable()
   export class SandboxService {
     createSandbox(pluginId: string): any {
       // 创建隔离的执行环境
       // 使用Node.js vm模块或worker_threads
     }
   }
   ```

**8. 实现plugin.controller.ts**
   ```typescript
   @Controller('plugins')
   export class PluginController {
     constructor(private pluginService: PluginService) {}
     
     @Get()
     findAll() {
       return this.pluginService.findAll();
     }
     
     @Post(':id/install')
     async install(@Param('id') id: string) {
       return this.pluginService.install(id);
     }
     
     @Delete(':id')
     async uninstall(@Param('id') id: string) {
       return this.pluginService.uninstall(id);
     }
   }
   ```

#### 验收标准

- [ ] Plugin模块所有文件创建完成
- [ ] 数据库模型已创建并迁移
- [ ] 插件能安装、卸载、执行
- [ ] 后端构建成功
- [ ] 插件功能可测试

#### 参考文档

- `ANALYSIS_REPORT.md` - 第3.2.1节，Plugin模块完全缺失
- `docs/architecture-backend.md` - Plugin模块设计规范

---

### P1-BE-002: 实现AI Hub工作流引擎

| 属性 | 值 |
|------|------|
| **优先级** | P1 🟡 |
| **模块** | Backend - AI Hub |
| **影响范围** | 当前仅为setTimeout模拟 |
| **预计工作量** | 4-5天 |
| **依赖任务** | P0-INF-001 (需要common/基础设施) |

#### 文件路径

```
apps/server/src/modules/ai-hub/workflows/
apps/server/src/modules/ai-hub/prompts/
```

#### 详细步骤

**1. 创建workflows目录结构**
   ```bash
   cd apps/server/src/modules/ai-hub
   mkdir -p workflows prompts
   ```

**2. 实现工作流数据模型**
   ```prisma
   model AIWorkflow {
     id          String   @id @default(uuid())
     name        String
     description String?
     definition  Json     // 工作流定义（节点、边）
     version     Int      @default(1)
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt
   }
   
   model AIWorkflowStep {
     id          String    @id @default(uuid())
     workflowId  String
     stepType    String    // 'llm', 'code', 'condition', etc.
     config      Json
     order       Int
     workflow    AIWorkflow @relation(fields: [workflowId], references: [id])
     
     @@index([workflowId])
   }
   
   // 运行迁移
   ```

**3. 实现workflow-engine.service.ts**
   ```typescript
   @Injectable()
   export class WorkflowEngineService {
     constructor(
       private prisma: PrismaService,
       private aiHubService: AiHubService,
     ) {}
     
     async executeWorkflow(workflowId: string, input: any): Promise<any> {
       // 1. 加载工作流定义
       const workflow = await this.prisma.aIWorkflow.findUnique({
         where: { id: workflowId },
         include: { steps: { orderBy: { order: 'asc' } } }
       });
       
       if (!workflow) throw new NotFoundException('Workflow not found');
       
       // 2. 执行工作流步骤
       const context: Record<string, any> = { input };
       
       for (const step of workflow.steps) {
         context.stepOutput = await this.executeStep(step, context);
         
         // 条件步骤处理
         if (step.stepType === 'condition') {
           const shouldContinue = this.evaluateCondition(step.config, context);
           if (!shouldContinue) break;
         }
       }
       
       return context.stepOutput;
     }
     
     private async executeStep(
       step: AIWorkflowStep,
       context: Record<string, any>
     ): Promise<any> {
       switch (step.stepType) {
         case 'llm':
           return await this.aiHubService.callAI({
             model: step.config.model,
             prompt: this.renderPrompt(step.config.template, context),
           });
         
         case 'code':
           return await this.executeCode(step.config.code, context);
         
         default:
           throw new Error(`Unknown step type: ${step.stepType}`);
       }
     }
     
     private renderPrompt(template: string, context: Record<string, any>): string {
       // 使用模板引擎渲染提示词
       return template; // 简化版本
     }
   }
   ```

**4. 实现workflow-executor.service.ts**
   ```typescript
   @Injectable()
   export class WorkflowExecutorService {
     constructor(
       private workflowEngine: WorkflowEngineService,
       private messageBus: MessageBusService,
     ) {}
     
     async executeWorkflowRun(workflowRunId: string): Promise<void> {
       // 更新状态为running
       await this.prisma.aIWorkflowRun.update({
         where: { id: workflowRunId },
         data: { status: 'running', startedAt: new Date() }
       });
       
       try {
         const run = await this.prisma.aIWorkflowRun.findUnique({
           where: { id: workflowRunId }
         });
         
         // 执行工作流
         const result = await this.workflowEngine.executeWorkflow(
           run.workflowId,
           run.input
         );
         
         // 更新状态为succeeded
         await this.prisma.aIWorkflowRun.update({
           where: { id: workflowRunId },
           data: {
             status: 'succeeded',
             finishedAt: new Date(),
             output: result
           }
         });
       } catch (error) {
         // 更新状态为failed
         await this.prisma.aIWorkflowRun.update({
           where: { id: workflowRunId },
           data: {
             status: 'failed',
             finishedAt: new Date(),
             error: error.message
           }
         });
         throw error;
       }
     }
   }
   ```

**5. 实现prompt-template.service.ts**
   ```typescript
   @Injectable()
   export class PromptTemplateService {
     constructor(private prisma: PrismaService) {}
     
     async create(data: CreatePromptTemplateDto): Promise<PromptTemplate> {
       return this.prisma.promptTemplate.create({ data });
     }
     
     async render(
       templateId: string,
       context: Record<string, any>
     ): Promise<string> {
       const template = await this.prisma.promptTemplate.findUnique({
         where: { id: templateId }
       });
       
       // 使用模板引擎渲染
       return this.renderTemplate(template.content, context);
     }
     
     private renderTemplate(template: string, context: any): string {
       // 实现模板渲染逻辑
       // 可以使用handlebars, ejs等库
       return template;
     }
   }
   ```

**6. 更新ai-hub.controller.ts**
   ```typescript
   @Get('workflow-runs/:id')
   async getWorkflowRun(@Param('id') id: string) {
     const run = await this.prisma.aIWorkflowRun.findUnique({
       where: { id },
       include: { workflow: true, steps: true }
     });
     return run; // 移除TODO，返回真实数据
   }
   ```

#### 验收标准

- [ ] workflows/和prompts/目录创建完成
- [ ] 数据库模型已创建并迁移
- [ ] 工作流引擎能执行简单的工作流
- [ ] 工作流执行能通过WebSocket发送进度
- [ ] 提示词模板能渲染
- [ ] 后端构建成功
- [ ] 工作流功能可测试

#### 参考文档

- `ANALYSIS_REPORT.md` - 第3.2.3节，AI Hub子功能缺失
- `docs/architecture-backend.md` - Workflow模块设计规范

---

### P1-BE-003: 实现Git模块UI

| 属性 | 值 |
|------|------|
| **优先级** | P1 🟡 |
| **模块** | Frontend - Git |
| **影响范围** | API完整但无UI |
| **预计工作量** | 3-4天 |
| **依赖任务** | P0-TS-008 (事件类型安全) |

#### 文件路径

```
apps/frontend/src/modules/git/
```

#### 详细步骤

**1. 创建Git UI组件目录结构**
   ```bash
   cd apps/frontend/src/modules/git
   mkdir -p components pages hooks
   ```

**2. 实现仓库列表组件**
   ```typescript
   // apps/frontend/src/modules/git/components/repository-list.tsx
   export function RepositoryList() {
     const { data: repositories, isLoading } = useRepositories();
     
     return (
       <div>
         {isLoading && <LoadingSkeleton />}
         {repositories?.map(repo => (
           <RepositoryCard key={repo.id} repository={repo} />
         ))}
       </div>
     );
   }
   ```

**3. 实现仓库卡片组件**
   ```typescript
   // apps/frontend/src/modules/git/components/repository-card.tsx
   interface RepositoryCardProps {
     repository: GitRepository;
   }
   
   export function RepositoryCard({ repository }: RepositoryCardProps) {
     return (
       <Card>
         <Heading>{repository.name}</Heading>
         <Text>{repository.path}</Text>
         <Badge>{repository.branch}</Badge>
       </Card>
     );
   }
   ```

**4. 实现提交历史组件**
   ```typescript
   // apps/frontend/src/modules/git/components/commit-history.tsx
   export function CommitHistory({ repositoryId }: { repositoryId: string }) {
     const { data: commits } = useCommitHistory(repositoryId);
     
     return (
       <div>
         {commits?.map(commit => (
           <CommitItem key={commit.id} commit={commit} />
         ))}
       </div>
     );
   }
   ```

**5. 实现差异查看器**
   ```typescript
   // apps/frontend/src/modules/git/components/diff-viewer.tsx
   export function DiffViewer({ oldCommit, newCommit }: DiffViewerProps) {
     const { data: diff } = useDiff(oldCommit, newCommit);
     
     return (
       <div className="diff-viewer">
         {diff?.map(line => (
           <DiffLine key={line.id} line={line} />
         ))}
       </div>
     );
   }
   ```

**6. 实现相关hooks**
   ```typescript
   // apps/frontend/src/modules/git/hooks/use-commit-history.ts
   export function useCommitHistory(repositoryId: string) {
     return useQuery({
       queryKey: ['git-commits', repositoryId],
       queryFn: () => gitApi.getCommitHistory(repositoryId),
     });
   }
   ```

**7. 实现仓库列表页面**
   ```typescript
   // apps/frontend/src/modules/git/pages/repository-list-page.tsx
   export function RepositoryListPage() {
     return (
       <PageLayout title="Git Repositories">
         <RepositoryList />
       </PageLayout>
     );
   }
   ```

#### 验收标准

- [ ] Git UI组件创建完成
- [ ] 仓库列表能正常显示
- [ ] 提交历史能查看
- [ ] 差异能查看
- [ ] 前端构建成功
- [ ] Git功能可测试

#### 参考文档

- `ANALYSIS_REPORT.md` - 第2.2节，Git模块UI缺失
- `docs/architecture-frontend.md` - Git模块设计规范

---

### P1-BE-004: 实现Integration模块UI

| 属性 | 值 |
|------|------|
| **优先级** | P1 🟡 |
| **模块** | Frontend - Integration |
| **影响范围** | API完整但无UI |
| **预计工作量** | 2-3天 |
| **依赖任务** | P0-TS-003 (API put方法) |

#### 文件路径

```
apps/frontend/src/modules/integration/
```

#### 详细步骤

**1. 创建Integration UI组件**
   ```typescript
   // apps/frontend/src/modules/integration/components/integration-card.tsx
   export function IntegrationCard({ integration }: IntegrationCardProps) {
     return (
       <Card>
         <Heading>{integration.name}</Heading>
         <Badge enabled={integration.enabled}>
           {integration.enabled ? '已连接' : '未连接'}
         </Badge>
         <Button onClick={() => configure(integration.id)}>
           配置
         </Button>
       </Card>
     );
   }
   ```

**2. 实现集成列表页面**
   ```typescript
   // apps/frontend/src/modules/integration/pages/integration-list-page.tsx
   export function IntegrationListPage() {
     return (
       <PageLayout title="Integrations">
         <IntegrationList />
       </PageLayout>
     );
   }
   ```

**3. 实现集成配置表单**
   ```typescript
   // apps/frontend/src/modules/integration/components/integration-config-form.tsx
   export function IntegrationConfigForm({ integrationId }: IntegrationConfigFormProps) {
     const { mutate: updateConfig } = useUpdateIntegration();
     
     return (
       <Form onSubmit={(data) => updateConfig({ id: integrationId, config: data })}>
         {/* 动态表单字段，基于集成类型 */}
       </Form>
     );
   }
   ```

#### 验收标准

- [ ] Integration UI组件创建完成
- [ ] 集成列表能显示所有集成
- [ ] 集成配置表单能正常工作
- [ ] 前端构建成功
- [ ] Integration功能可测试

#### 参考文档

- `ANALYSIS_REPORT.md` - 第2.2节，Integration模块UI缺失
- `docs/architecture-frontend.md` - Integration模块设计规范

---

### P1-BE-005: 实现Notification模块UI

| 属性 | 值 |
|------|------|
| **优先级** | P1 🟡 |
| **模块** | Frontend - Notification |
| **影响范围** | API完整但无UI |
| **预计工作量** | 1-2天 |
| **依赖任务** | P0-TS-004 (API put方法) |

#### 文件路径

```
apps/frontend/src/modules/notification/
```

#### 详细步骤

**1. 修复notification-center.tsx类型错误**
   ```typescript
   // 使用相同的响应包装类型
   export function NotificationCenter() {
     const { data: notifications } = useNotifications();  // 提取data
     return (
       <div>
         {notifications?.map(n => (
           <NotificationItem key={n.id} notification={n} />
         ))}
       </div>
     );
   }
   ```

**2. 实现通知中心页面**
   ```typescript
   // apps/frontend/src/modules/notification/pages/notification-center-page.tsx
   export function NotificationCenterPage() {
     return (
       <PageLayout title="Notifications">
         <NotificationCenter />
       </PageLayout>
     );
   }
   ```

#### 验收标准

- [ ] 通知中心组件类型错误修复
- [ ] 通知能正常显示
- [ ] 标记已读功能正常
- [ ] 前端构建成功
- [ ] Notification功能可测试

#### 参考文档

- `ANALYSIS_REPORT.md` - 第2.2节，Notification模块UI缺失

---

### P1-SEC-001: 添加速率限制

| 属性 | 值 |
|------|------|
| **优先级** | P1 🟡 |
| **模块** | Backend - Main |
| **影响范围** | API安全 |
| **预计工作量** | 0.5天 |

#### 文件路径

```
apps/server/src/main.ts
```

#### 详细步骤

1. **安装依赖**
   ```bash
   npm install express-rate-limit @types/express-rate-limit
   ```

2. **配置速率限制**
   ```typescript
   import rateLimit from 'express-rate-limit';
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000,  // 15分钟窗口
     max: 100,  // 最多100个请求
     standardHeaders: true,
     legacyHeaders: false,
   });
   
   app.use(limiter);
   ```

3. **为不同端点配置不同限制**
   ```typescript
   const apiLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 1000,  // API端点更高限制
   });
   
   const authLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 5,  // 登录端点严格限制
     skipSuccessfulRequests: true,
   });
   ```

#### 验收标准

- [ ] 速率限制已配置
- [ ] 超过限制返回429状态码
- [ ] 后端构建成功
- [ ] 速率限制功能可测试

#### 参考文档

- `ANALYSIS_REPORT.md` - 第9节，优化建议

---

### P1-SEC-002: 启用全局ValidationPipe

| 属性 | 值 |
|------|------|
| **优先级** | P1 🟡 |
| **模块** | Backend - Main |
| **影响范围** | API安全 |
| **预计工作量** | 0.5天 |

#### 文件路径

```
apps/server/src/main.ts
```

#### 详细步骤

1. **配置全局验证管道**
   ```typescript
   import { ValidationPipe } from '@nestjs/common';
   
   app.useGlobalPipes(
     new ValidationPipe({
       whitelist: true,  // 只允许DTO中定义的属性
       forbidNonWhitelisted: true,  // 拒绝未定义的属性
       transform: true,  // 自动转换类型
       transformOptions: {
         enableImplicitConversion: true,
       },
     }),
   );
   ```

2. **验证DTO配置**
   ```typescript
   // 确保所有DTO都有class-validator装饰器
   export class CreateProjectDto {
     @IsString()
     @IsNotEmpty()
     @MaxLength(100)
     name: string;
     
     @IsOptional()
     @MaxLength(500)
     description?: string;
   }
   ```

#### 验收标准

- [ ] ValidationPipe已全局启用
- [ ] 无效请求返回400状态码
- [ ] 后端构建成功
- [ ] 请求验证功能可测试

#### 参考文档

- `ANALYSIS_REPORT.md` - 第4.3节，API安全措施

---

### P1-SEC-003: 添加Helmet安全头

| 属性 | 值 |
|------|------|
| **优先级** | P1 🟡 |
| **模块** | Backend - Main |
| **影响范围** | API安全 |
| **预计工作量** | 0.5天 |

#### 文件路径

```
apps/server/src/main.ts
```

#### 详细步骤

1. **安装依赖**
   ```bash
   npm install helmet @types/helmet
   ```

2. **配置Helmet**
   ```typescript
   import helmet from 'helmet';
   
   app.use(
     helmet({
       contentSecurityPolicy: {
         directives: {
           defaultSrc: ["'self'"],
           styleSrc: ["'self'", "'unsafe-inline'"],
           scriptSrc: ["'self'"],
           imgSrc: ["'self'", 'data:', 'https:'],
         },
       },
       hsts: {
         maxAge: 31536000,
         includeSubDomains: true,
         preload: true,
       },
     }),
   );
   ```

#### 验收标准

- [ ] Helmet已配置
- [ ] 安全头正确返回
- [ ] 后端构建成功
- [ ] CSP策略可测试

#### 参考文档

- `ANALYSIS_REPORT.md` - 第4.3节，API安全措施

---

### P1-SEC-004: 实现CSRF保护

| 属性 | 值 |
|------|------|
| **优先级** | P1 🟡 |
| **模块** | Backend - Main |
| **影响范围** | API安全 |
| **预计工作量** | 0.5天 |

#### 文件路径

```
apps/server/src/main.ts
```

#### 详细步骤

1. **安装依赖**
   ```bash
   npm install csurf @types/csurf
   ```

2. **配置CSRF**
   ```typescript
   import * as csurf from 'csurf';
   
   const csrfProtection = csurf({ cookie: true });
   app.use(csrfProtection);
   
   // 在所有state-changing请求中添加CSRF token
   app.use((req, res, next) => {
     res.locals.csrfToken = req.csrfToken();
     next();
   });
   ```

3. **前端集成CSRF token**
   ```typescript
   // apps/frontend/src/infrastructure/api-client/index.ts
   // 从cookie中读取CSRF token并在请求头中发送
   api.interceptors.request.use((config) => {
     const csrfToken = getCookie('csrf-token');
     if (csrfToken && config.method !== 'get') {
       config.headers['x-csrf-token'] = csrfToken;
     }
     return config;
   });
   ```

#### 验收标准

- [ ] CSRF保护已配置
- [ ] 无效CSRF token返回403状态码
- [ ] 前后端CSRF token正常传递
- [ ] 后端构建成功
- [ ] CSRF保护功能可测试

#### 参考文档

- `ANALYSIS_REPORT.md` - 第4.3节，API安全措施

---

### P1-BE-006: 实现OAuth2 Strategy

| 属性 | 值 |
|------|------|
| **优先级** | P1 🟡 |
| **模块** | Backend - Auth |
| **影响范围** | OAuth2控制器存在但策略缺失 |
| **预计工作量** | 1天 |

#### 文件路径

```
apps/server/src/modules/auth/strategies/
```

#### 详细步骤

1. **实现OAuth2策略**
   ```typescript
   // apps/server/src/modules/auth/strategies/oauth2.strategy.ts
   import { Injectable, UnauthorizedException } from '@nestjs/common';
   import { PassportStrategy } from '@nestjs/passport';
   import { ExtractJwt } from 'passport-jwt';
   import { Strategy } from 'passport-oauth2';
   
   @Injectable()
   export class OAuth2Strategy extends PassportStrategy {
     constructor(
       private configService: ConfigService,
       private userService: UserService,
     ) {
       super({
         authorizationURL: 'https://provider.com/oauth/authorize',
         tokenURL: 'https://provider.com/oauth/token',
         clientID: configService.get('OAUTH2_CLIENT_ID'),
         clientSecret: configService.get('OAUTH2_CLIENT_SECRET'),
         callbackURL: configService.get('OAUTH2_CALLBACK_URL'),
       });
     }
     
     async validate(accessToken: string, refreshToken: string, profile: any, done: any): Promise<any> {
       // 验证用户或创建用户
       const user = await this.userService.findOrCreateByOAuth(profile);
       return done(null, user);
     }
   }
   ```

2. **注册策略**
   ```typescript
   // apps/server/src/modules/auth/auth.module.ts
   import { OAuth2Strategy } from './strategies/oauth2.strategy';
   
   @Module({
     providers: [
       {
         provide: 'OAUTH2_STRATEGY',
         useExisting: OAuth2Strategy,
       },
     ],
   })
   export class AuthModule {}
   ```

#### 验收标准

- [ ] OAuth2策略实现完成
- [ ] OAuth2登录流程能正常工作
- [ ] 后端构建成功
- [ ] OAuth2功能可测试

#### 参考文档

- `ANALYSIS_REPORT.md` - 第3.2.4节，OAuth2策略缺失
- `docs/architecture-backend.md` - Auth模块设计规范

---

## P2 - 性能优化与代码质量

### P2-Q-001: 配置TanStack Query全局默认值

| 属性 | 值 |
|------|------|
| **优先级** | P2 🟢 |
| **模块** | Frontend - Infrastructure |
| **影响范围** | 用户体验和性能 |
| **预计工作量** | 0.5天 |

#### 文件路径

```
apps/frontend/src/infrastructure/api/query-client.ts
```

#### 详细步骤

1. **更新QueryClient配置**
   ```typescript
   import { QueryClient } from '@tanstack/react-query';
   
   export const queryClient = new QueryClient({
     defaultOptions: {
       queries: {
         // 5分钟内的数据被认为是新鲜的
         staleTime: 5 * 60 * 1000,
         // 10分钟缓存数据
         cacheTime: 10 * 60 * 1000,
         // 失败重试1次
         retry: 1,
         // 重试延迟
         retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
         // 窗口重新聚焦时重新获取
         refetchOnWindowFocus: true,
       },
       mutations: {
         // 失败重试1次
         retry: 1,
       },
     },
   });
   ```

2. **添加用户反馈到所有mutations**
   ```typescript
   // 示例：在所有useUpdate* hooks中添加
   export function useUpdateProject() {
     return useMutation({
       mutationFn: (data) => projectApi.updateProject(data.id, data),
       onSuccess: () => {
         toast.success('Project updated successfully');
         queryClient.invalidateQueries({ queryKey: ['projects'] });
       },
       onError: (error) => {
         toast.error('Failed to update project');
         console.error(error);
       },
     });
   }
   ```

#### 验收标准

- [ ] QueryClient配置已更新
- [ ] 查询有合理的缓存和重试策略
- [ ] 所有mutation有用户反馈
- [ ] 前端构建成功
- [ ] 缓存功能可测试

#### 参考文档

- `ANALYSIS_REPORT.md` - 第5.3节，前端性能优化

---

### P2-Q-002: 添加Redis缓存层

| 属性 | 值 |
|------|------|
| **优先级** | P2 🟢 |
| **模块** | Backend |
| **影响范围** | 数据库性能 |
| **预计工作量** | 2-3天 |

#### 文件路径

```
apps/server/src/common/cache/
```

#### 详细步骤

**1. 安装依赖**
   ```bash
   npm install @nestjs/cache-manager cache-manager-redis-store ioredis
   npm install -D @types/cache-manager
   ```

**2. 创建CacheService**
   ```typescript
   // apps/server/src/common/cache/cache.service.ts
   import { Injectable } from '@nestjs/common';
   import { Cache } from 'cache-manager';
   import { CacheModule } from '@nestjs/cache-manager';
   
   @Injectable()
   export class CacheService {
     constructor(@InjectCacheManager() private cacheManager: Cache) {}
     
     async get<T>(key: string): Promise<T | undefined> {
       return this.cacheManager.get<T>(key);
     }
     
     async set<T>(key: string, value: T, ttl?: number): Promise<void> {
       await this.cacheManager.set(key, value, { ttl } as any);
     }
     
     async del(key: string): Promise<void> {
       await this.cacheManager.del(key);
     }
     
     async invalidatePattern(pattern: string): Promise<void> {
       const keys = await this.cacheManager.store.keys();
       const keysToDelete = keys.filter(key => key.includes(pattern));
       await Promise.all(keysToDelete.map(key => this.cacheManager.del(key)));
     }
   }
   ```

**3. 创建CacheModule**
   ```typescript
   // apps/server/src/common/cache/cache.module.ts
   import { Module } from '@nestjs/common';
   import * as redisStore from 'cache-manager-redis-store';
   import { CacheModule, CacheService } from '@nestjs/cache-manager';
   
   @Module({
     imports: [
       CacheModule.register({
         isGlobal: true,
         store: 'memory',
       }),
     ],
     exports: [CacheService],
   })
   export class CacheConfigModule {}
   ```

**4. 在Service中使用缓存**
   ```typescript
   // 示例：ProjectService
   @Injectable()
   export class ProjectService {
     constructor(
       private prisma: PrismaService,
       private cacheService: CacheService,
     ) {}
     
     async findAll(): Promise<Project[]> {
       const cacheKey = 'projects:all';
       
       // 先尝试从缓存获取
       const cached = await this.cacheService.get<Project[]>(cacheKey);
       if (cached) return cached;
       
       // 缓存未命中，从数据库获取
       const projects = await this.prisma.project.findMany();
       
       // 存入缓存，TTL为5分钟
       await this.cacheService.set(cacheKey, projects, 300);
       
       return projects;
     }
     
     async create(data: CreateProjectDto): Promise<Project> {
       const project = await this.prisma.project.create({ data });
       
       // 创建后使缓存失效
       await this.cacheService.invalidatePattern('projects:');
       
       return project;
     }
   }
   ```

#### 验收标准

- [ ] Redis缓存服务实现完成
- [ ] 缓存能在Service中使用
- [ ] 缓存失效机制正常工作
- [ ] 后端构建成功
- [ ] 缓存功能可测试

#### 参考文档

- `ANALYSIS_REPORT.md` - 第5.1节，数据库层优化

---

### P2-Q-003: 实现异步任务队列（Bull）

| 属性 | 值 |
|------|------|
| **优先级** | P2 🟢 |
| **模块** | Backend |
| **影响范围** | 长时间操作阻塞请求 |
| **预计工作量** | 3-4天 |

#### 文件路径

```
apps/server/src/common/queue/
```

#### 详细步骤

**1. 安装依赖**
   ```bash
   npm install @nestjs/bull @nestjs/bull-ui bull @types/bull
   ```

**2. 创建QueueService**
   ```typescript
   // apps/server/src/common/queue/queue.service.ts
   import { Injectable, OnModuleInit } from '@nestjs/common';
   import { InjectQueue } from '@nestjs/bull';
   import { Queue, Job } from 'bull';
   
   @Injectable()
   export class QueueService implements OnModuleInit {
     constructor(
       @InjectQueue('ai-chat') private aiChatQueue: Queue,
       @InjectQueue('git-operations') private gitQueue: Queue,
       @InjectQueue('workflow-execution') private workflowQueue: Queue,
     ) {}
     
     onModuleInit() {
       // 队列处理器会在这里自动注册
     }
     
     async addAiChatJob(data: any): Promise<Job> {
       return this.aiChatQueue.add('ai-chat', data, {
         attempts: 3,
         backoff: {
           type: 'exponential',
           delay: 2000,
         },
         removeOnComplete: 10,
         removeOnFail: 50,
       });
     }
     
     async addGitJob(operation: string, data: any): Promise<Job> {
       return this.gitQueue.add(operation, data, {
         attempts: 2,
       removeOnComplete: 20,
       removeOnFail: 100,
       timeout: 30000,  // 30秒超时
       });
     }
     
     async addWorkflowJob(workflowId: string, input: any): Promise<Job> {
       return this.workflowQueue.add('execute-workflow', { workflowId, input }, {
         attempts: 3,
         removeOnComplete: 100,
         removeOnFail: 200,
       });
     }
   }
   ```

**3. 创建队列处理器**
   ```typescript
   // apps/server/src/modules/ai-hub/processors/ai-chat.processor.ts
   import { Processor, Process } from '@nestjs/bull';
   import { Logger } from '@nestjs/common';
   
   @Processor('ai-chat')
   export class AiChatProcessor {
     private readonly logger = new Logger(AiChatProcessor.name);
     
     @Process('ai-chat')
     async handle(job: Job) {
       this.logger.log(`Processing AI chat job ${job.id}`);
       
       try {
         const { conversationId, message } = job.data;
         
         // 执行AI聊天逻辑
         const response = await this.aiHubService.sendMessage(conversationId, message);
         
         this.logger.log(`AI chat job ${job.id} completed`);
       } catch (error) {
         this.logger.error(`AI chat job ${job.id} failed`, error.stack);
         throw error;  // Bull会自动重试
       }
     }
   }
   ```

**4. 创建QueueModule**
   ```typescript
   // apps/server/src/common/queue/queue.module.ts
   import { Module } from '@nestjs/common';
   import { BullModule } from '@nestjs/bull';
   import { AiChatProcessor } from '../../modules/ai-hub/processors/ai-chat.processor';
   
   @Module({
     imports: [
       BullModule.forRoot({
         redis: {
           host: process.env.REDIS_HOST || 'localhost',
           port: parseInt(process.env.REDIS_PORT || '6379'),
         },
       }),
       BullModule.registerQueue({
         name: 'ai-chat',
         defaultJobOptions: {
           removeOnComplete: 10,
           removeOnFail: 50,
         },
       }),
       BullModule.registerQueue({
         name: 'git-operations',
       }),
       BullModule.registerQueue({
         name: 'workflow-execution',
       }),
     ],
     providers: [AiChatProcessor],
   })
   export class QueueModule {}
   ```

#### 验收标准

- [ ] Bull队列配置完成
- [ ] AI聊天能通过队列异步处理
- [ ] Git操作能通过队列异步处理
- [ ] 工作流执行能通过队列异步处理
- [ ] 后端构建成功
- [ ] 队列功能可测试

#### 参考文档

- `ANALYSIS_REPORT.md` - 第5.2节，服务层优化

---

### P2-Q-004: 添加Prisma事务支持

| 属性 | 值 |
|------|------|
| **优先级** | P2 🟢 |
| **模块** | Backend - All Services |
| **影响范围** | 数据一致性 |
| **预计工作量** | 1天 |

#### 文件路径

```
apps/server/src/modules/
```

#### 详细步骤

1. **识别需要事务的操作**
   - 创建项目并创建成员
   - 创建任务并创建子任务
   - 任何多表写入操作

2. **实现事务示例**
   ```typescript
   // apps/server/src/modules/project/project.service.ts
   async createProjectWithOwner(
     data: CreateProjectDto,
     ownerId: string
   ): Promise<Project> {
     return this.prisma.$transaction(async (tx) => {
       // 在事务中创建项目
       const project = await tx.project.create({
         data: {
           ...data,
           ownerId,
         },
       });
       
       // 在同一事务中创建项目成员
       await tx.projectMember.create({
         data: {
           projectId: project.id,
           userId: ownerId,
           role: 'OWNER',
         },
       });
       
       return project;
     });
   }
   ```

3. **更新所有多表写入操作**
   ```typescript
   // 示例：TaskService
   async createTaskWithSubtasks(
     taskData: CreateTaskDto,
     subtasks: CreateSubtaskDto[]
   ): Promise<Task> {
     return this.prisma.$transaction(async (tx) => {
       const task = await tx.task.create({ data: taskData });
       
       for (const subtask of subtasks) {
         await tx.subtask.create({
           data: {
             ...subtask,
             taskId: task.id,
           },
         });
       }
       
       return task;
     });
   }
   ```

#### 验收标准

- [ ] 所有多表写入操作使用事务
- [ ] 事务失败时数据正确回滚
- [ ] 后端构建成功
- [ ] 事务功能可测试

#### 参考文档

- `ANALYSIS_REPORT.md` - 第3.3节，代码质量问题

---

### P2-Q-005: 完善Winston日志配置

| 属性 | 值 |
|------|------|
| **优先级** | P2 🟢 |
| **模块** | Backend - Logging |
| **影响范围** | 日志系统完整性 |
| **预计工作量** | 1天 |

#### 文件路径

```
apps/server/src/common/logging/
```

#### 详细步骤

1. **创建结构化日志配置**
   ```typescript
   // apps/server/src/common/logging/winston.config.ts
   import winston from 'winston';
   import * as winstonDailyRotateFile from 'winston-daily-rotate-file';
   
   const logFormat = winston.format.combine(
     winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
     winston.format.errors({ stack: true }),
     winston.format.json(),
   );
   
   const sensitiveDataFilter = winston.format((info) => {
     // 过滤敏感信息
     const { password, token, apiKey, ...safeInfo } = info;
     if (password) safeInfo.password = '***';
     if (token) safeInfo.token = '***';
     if (apiKey) safeInfo.apiKey = '***';
     return safeInfo;
   });
   
   export const winstonConfig = {
     level: process.env.LOG_LEVEL || 'info',
     format: winston.format.combine(
       sensitiveDataFilter(),
       logFormat,
     ),
     transports: [
       // 控制台输出
       new winston.transports.Console({
         format: winston.format.combine(
           winston.format.colorize(),
           logFormat,
         ),
       }),
       
       // 错误日志文件
       new winstonDailyRotateFile({
         filename: 'logs/error-%DATE%.log',
         datePattern: 'YYYY-MM-DD',
         maxSize: '20m',
         maxFiles: '14d',
         level: 'error',
       }),
       
       // 所有日志文件
       new winstonDailyRotateFile({
         filename: 'logs/combined-%DATE%.log',
         datePattern: 'YYYY-MM-DD',
         maxSize: '20m',
         maxFiles: '30d',
       }),
     ],
   };
   ```

2. **更新LoggerService使用配置**
   ```typescript
   // apps/server/src/common/logging/logger.service.ts
   import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
   import { winstonConfig } from './winston.config';
   import winston from 'winston';
   
   @Injectable()
   export class LoggerService implements NestLoggerService {
     private readonly logger = winston.createLogger(winstonConfig);
     
     setContext(context: string): this {
       this.logger.defaultMeta = { context };
     }
     
     log(message: string, context?: string) {
       this.logger.info(message, { context });
     }
     
     error(message: string, trace?: string, context?: string) {
       this.logger.error(message, { trace, context });
     }
     
     warn(message: string, context?: string) {
       this.logger.warn(message, { context });
     }
     
     debug(message: string, context?: string) {
       this.logger.debug(message, { context });
     }
     
     verbose(message: string, context?: string) {
       this.logger.verbose(message, { context });
     }
   }
   ```

#### 验收标准

- [ ] Winston配置已更新
- [ ] 日志文件按日期轮转
- [ ] 敏感信息被过滤
- [ ] 后端构建成功
- [ ] 日志功能可测试

#### 参考文档

- `ANALYSIS_REPORT.md` - 第1.2.7节，日志配置不完整

---

### P2-FE-001: 实现共享组件

| 属性 | 值 |
|------|------|
| **优先级** | P2 🟢 |
| **模块** | Frontend - Shared |
| **影响范围** | UI一致性 |
| **预计工作量** | 2-3天 |

#### 文件路径

```
apps/frontend/src/shared/components/
```

#### 详细步骤

**1. 实现LoadingSkeleton**
   ```typescript
   // apps/frontend/src/shared/components/loading-skeleton.tsx
   export function LoadingSkeleton({ count = 1 }: LoadingSkeletonProps) {
     return (
       <div>
         {Array.from({ length: count }).map((_, i) => (
           <SkeletonItem key={i} />
         ))}
       </div>
     );
   }
   ```

**2. 实现Modal**
   ```typescript
   // apps/frontend/src/shared/components/modal.tsx
   interface ModalProps {
     isOpen: boolean;
     onClose: () => void;
     title?: string;
     size?: 'sm' | 'md' | 'lg' | 'xl';
     children: React.ReactNode;
   }
   
   export function Modal({ isOpen, onClose, title, size = 'md', children }: ModalProps) {
     if (!isOpen) return null;
     
     return (
       <div className="modal-overlay" onClick={onClose}>
         <div className={`modal modal-${size}`} onClick={e => e.stopPropagation()}>
           {title && (
             <div className="modal-header">
               <Heading>{title}</Heading>
               <Button variant="ghost" onClick={onClose}>✕</Button>
             </div>
           )}
           <div className="modal-body">
             {children}
           </div>
         </div>
       </div>
     );
   }
   ```

**3. 实现Drawer**
   ```typescript
   // apps/frontend/src/shared/components/drawer.tsx
   interface DrawerProps {
     isOpen: boolean;
     onClose: () => void;
     position?: 'left' | 'right';
     size?: number; // px
     children: React.ReactNode;
   }
   
   export function Drawer({ isOpen, onClose, position = 'right', size = 400, children }: DrawerProps) {
     return (
       <>
         {isOpen && <div className="drawer-backdrop" onClick={onClose} />}
         <div className={`drawer drawer-${position}`} style={{ width: `${size}px` }}>
           <div className="drawer-content">
             {children}
           </div>
         </div>
       </>
     );
   }
   ```

**4. 实现Table**
   ```typescript
   // apps/frontend/src/shared/components/table.tsx
   interface TableProps<T> {
     data: T[];
     columns: Column<T>[];
     isLoading?: boolean;
     onRowClick?: (row: T) => void;
   }
   
   export function Table<T>({ data, columns, isLoading, onRowClick }: TableProps<T>) {
     return (
       <div className="table-container">
         <table className="data-table">
           <thead>
             <tr>
               {columns.map(col => (
                 <th key={col.key}>{col.header}</th>
               ))}
             </tr>
           </thead>
           <tbody>
             {isLoading ? (
               <tr>
                 <td colSpan={columns.length}>
                   <LoadingSkeleton count={5} />
                 </td>
               </tr>
             ) : (
               data.map((row, rowIndex) => (
                 <tr
                   key={rowIndex}
                   onClick={() => onRowClick?.(row)}
                   className={onRowClick ? 'clickable' : ''}
                 >
                   {columns.map(col => (
                     <td key={col.key}>
                       {col.render ? col.render(row) : String(row[col.key])}
                     </td>
                   ))}
                 </tr>
               ))
             )}
           </tbody>
         </table>
       </div>
     );
   }
   ```

**5. 实现Form**
   ```typescript
   // apps/frontend/src/shared/components/form.tsx
   interface FormProps {
     onSubmit: (data: any) => void;
     children: React.ReactNode;
     validationSchema?: any;
     defaultValues?: any;
   }
   
   export function Form({ onSubmit, children, validationSchema, defaultValues }: FormProps) {
     const methods = useForm({
       resolver: validationSchema ? yupResolver(validationSchema) : undefined,
       defaultValues,
     });
     
     return (
       <form onSubmit={methods.handleSubmit(onSubmit)}>
         {typeof children === 'function' ? children(methods) : children}
       </form>
     );
   }
   ```

#### 验收标准

- [ ] 所有共享组件创建完成
- [ ] 组件能正常使用
- [ ] 组件使用主题Token而非内联样式
- [ ] 前端构建成功
- [ ] 组件功能可测试

#### 参考文档

- `ANALYSIS_REPORT.md` - 第2.2节，共享UI组件缺失

---

### P2-FE-002: 移除内联样式

| 属性 | 值 |
|------|------|
| **优先级** | P2 🟢 |
| **模块** | Frontend - All |
| **影响范围** | 可维护性和主题一致性 |
| **预计工作量** | 1天 |

#### 文件路径

```
apps/frontend/src/
```

#### 详细步骤

1. **查找所有内联样式**
   ```bash
   cd apps/frontend/src
   grep -r "style={{ " --include="*.tsx"
   ```

2. **查看主题Token定义**
   ```typescript
   // apps/frontend/src/shared/theme/tokens.ts
   export const colors = {
     // 所有可用的颜色
   };
   
   export const spacing = {
     xs: '4px',
     sm: '8px',
     md: '16px',
     lg: '24px',
     xl: '32px',
   };
   
   export const radii = {
     sm: '4px',
     md: '8px',
     lg: '12px',
   };
   ```

3. **替换内联样式为主题Token和CSS类**
   ```typescript
   // ❌ 错误代码
   <div style={{
     padding: '16px 12px',
     background: '#020617',
   }}>
   
   // ✅ 正确代码 - 使用CSS类
   <div className="card-container">
   
   // 或使用主题Token
   <div style={{
     padding: spacing.md,
     background: colors.background.primary,
   }}>
   ```

4. **创建CSS模块**
   ```css
   /* apps/frontend/src/styles/components.css */
   .card-container {
     padding: var(--spacing-md);
     background: var(--color-background-primary);
     border-radius: var(--radius-md);
   }
   
   .modal-overlay {
     position: fixed;
     inset: 0;
     background: rgba(0, 0, 0, 0.5);
   }
   ```

#### 验收标准

- [ ] 大部分内联样式已移除
- [ ] 代码使用主题Token或CSS类
- [ ] 前端构建成功
- [ ] 样式一致性验证

#### 参考文档

- `ANALYSIS_REPORT.md` - 第2.3节，代码质量问题
- `docs/design-system.md` - 主题Token定义

---

## P3 - 测试与工程化

### P3-T-001: 添加后端单元测试

| 属性 | 值 |
|------|------|
| **优先级** | P3 ⚪ |
| **模块** | Backend |
| **影响范围** | 代码质量 |
| **预计工作量** | 5-7天 |
| **目标覆盖率** | 60% |

#### 文件路径

```
apps/server/src/modules/ai-hub/*.spec.ts
apps/server/src/modules/git/*.spec.ts
apps/server/src/modules/integration/*.spec.ts
apps/server/src/modules/notification/*.spec.ts
apps/server/src/modules/terminal/*.spec.ts
```

#### 详细步骤

**1. 为AiHubService编写测试**
   ```typescript
   // apps/server/src/modules/ai-hub/ai-hub.service.spec.ts
   describe('AiHubService', () => {
     let service: AiHubService;
     let prisma: PrismaService;
     
     beforeEach(async () => {
       const module = await Test.createTestingModule({
         providers: [AiHubService, PrismaService],
       }).compile();
       
       service = module.get<AiHubService>(AiHubService);
       prisma = module.get<PrismaService>(PrismaService);
     });
     
     describe('createConversation', () => {
       it('should create a conversation', async () => {
         const dto = { title: 'Test Conversation' };
         const result = await service.createConversation(dto);
         
         expect(result).toHaveProperty('id');
         expect(result.title).toBe(dto.title);
       });
       
       it('should throw validation error for invalid data', async () => {
         await expect(
           service.createConversation({ title: '' })
         ).rejects.toThrow();
       });
     });
     
     describe('callAI', () => {
       it('should call AI with provided parameters', async () => {
         const result = await service.callAI({
           model: 'gpt-4',
           prompt: 'Hello',
         });
         
         expect(result).toHaveProperty('response');
       });
     });
   });
   ```

**2. 为GitService编写测试**
   ```typescript
   // apps/server/src/modules/git/git.service.spec.ts
   describe('GitService', () => {
     it('should clone a repository', async () => {
       // 测试仓库克隆逻辑
     });
     
     it('should get repository status', async () => {
       // 测试仓库状态获取
     });
     
     it('should handle git errors gracefully', async () => {
       // 测试错误处理
     });
   });
   ```

**3. 为其他模块添加测试**
   - IntegrationService
   - NotificationService
   - TerminalService

**4. 配置测试覆盖率**
   ```json
   // apps/server/package.json
   {
     "jest": {
       "collectCoverageFrom": [
         "src/**/*.(t|j)s"
       ],
       "coverageThreshold": {
         "global": {
           "branches": 60,
           "functions": 60,
           "lines": 60,
           "statements": 60
         }
       }
     }
   }
   ```

#### 验收标准

- [ ] 所有缺失测试的模块都有测试文件
- [ ] 测试覆盖率至少达到60%
- [ ] 所有测试通过（`npm run test`）
- [ ] 测试能运行在CI中

#### 参考文档

- `ANALYSIS_REPORT.md` - 第3.4节，测试覆盖
- `apps/server/jest.config.js` - Jest配置

---

### P3-T-002: 添加前端单元测试

| 属性 | 值 |
|------|------|
| **优先级** | P3 ⚪ |
| **模块** | Frontend |
| **影响范围** | 代码质量 |
| **预计工作量** | 5-7天 |
| **目标覆盖率** | 60% |

#### 文件路径

```
apps/frontend/src/
```

#### 详细步骤

**1. 为hooks编写测试**
   ```typescript
   // apps/frontend/src/modules/project/hooks/use-project-list.test.tsx
   import { renderHook, act, waitFor } from '@testing-library/react';
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
   import { useProjectList } from './use-project-list';
   
   describe('useProjectList', () => {
     it('should fetch projects successfully', async () => {
       const queryClient = new QueryClient();
       const wrapper = ({ children }) => (
         <QueryClientProvider client={queryClient}>
           {children}
         </QueryClientProvider>
       );
       
       const { result } = renderHook(() => useProjectList(), { wrapper });
       
       await waitFor(() => result.current.isSuccess);
       
       expect(result.current.data).toBeDefined();
     });
   });
   ```

**2. 为组件编写测试**
   ```typescript
   // apps/frontend/src/shared/components/modal.test.tsx
   import { render, screen, fireEvent } from '@testing-library/react';
   import { Modal } from './modal';
   
   describe('Modal', () => {
     it('should render when isOpen is true', () => {
       const { container } = render(
         <Modal isOpen={true} title="Test Modal">
           <div>Modal Content</div>
         </Modal>
       );
       
       expect(screen.getByText('Test Modal')).toBeInTheDocument();
       expect(screen.getByText('Modal Content')).toBeInTheDocument();
     });
     
     it('should not render when isOpen is false', () => {
       const { container } = render(
         <Modal isOpen={false}>
           <div>Should not render</div>
         </Modal>
       );
       
       expect(container.firstChild).toBeNull();
     });
     
     it('should call onClose when backdrop is clicked', () => {
       const onClose = jest.fn();
       
       render(
         <Modal isOpen={true} onClose={onClose}>
           <div>Content</div>
         </Modal>
       );
       
       fireEvent.click(screen.getByTestId('modal-backdrop'));
       
       expect(onClose).toHaveBeenCalled();
     });
   });
   ```

**3. 配置Vitest**
   ```typescript
   // apps/frontend/vitest.config.ts
   import { defineConfig } from 'vitest/config/react';
   
   export default defineConfig({
     test: {
       globals: true,
       environment: 'jsdom',
       setupFiles: ['./src/test/setup.ts'],
     },
     coverage: {
       provider: 'v8',
       reporter: ['text', 'json', 'html'],
       exclude: [
         'node_modules/',
         'src/test/',
         '**/*.d.ts',
         '**/*.config.*',
         '**/mockData',
       ],
     },
   });
   ```

#### 验收标准

- [ ] 关键hooks和组件都有测试
- [ ] 测试覆盖率至少达到60%
- [ ] 所有测试通过（`npm run test`）
- [ ] 测试能运行在CI中

#### 参考文档

- `ANALYSIS_REPORT.md` - 第7.2节，测试策略缺失
- `apps/frontend/vitest.config.ts` - Vitest配置

---

### P3-T-003: 创建Docker和docker-compose

| 属性 | 值 |
|------|------|
| **优先级** | P3 ⚪ |
| **模块** | Backend, Frontend |
| **影响范围** | 部署自动化 |
| **预计工作量** | 2-3天 |

#### 文件路径

```
Dockerfile
docker-compose.yml
```

#### 详细步骤

**1. 创建Backend Dockerfile**
   ```dockerfile
   # apps/server/Dockerfile
   FROM node:20-alpine AS builder
   
   WORKDIR /app
   
   COPY package*.json ./
   COPY prisma ./prisma/
   
   RUN npm ci --only=production
   RUN npx prisma generate
   
   COPY . .
   
   RUN npm run build
   
   FROM node:20-alpine AS runner
   
   WORKDIR /app
   
   ENV NODE_ENV production
   
   COPY --from=builder /app/node_modules ./node_modules
   COPY --from=builder /app/dist ./dist
   COPY --from=builder /app/prisma ./prisma
   
   EXPOSE 4300
   
   CMD ["node", "dist/src/main.js"]
   ```

**2. 创建Frontend Dockerfile**
   ```dockerfile
   # apps/frontend/Dockerfile
   FROM node:20-alpine AS builder
   
   WORKDIR /app
   
   COPY package*.json ./
   
   RUN npm ci
   
   COPY . .
   
   RUN npm run build
   
   FROM nginx:alpine
   
   COPY --from=builder /app/dist /usr/share/nginx/html
   
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   
   EXPOSE 80
   
   CMD ["nginx", "-g", "daemon off;"]
   ```

**3. 创建docker-compose.yml**
   ```yaml
   version: '3.8'
   
   services:
     backend:
       build:
         context: ./apps/server
         dockerfile: Dockerfile
       ports:
         - "4300:4300"
       environment:
         - NODE_ENV=production
         - DATABASE_URL=postgresql://user:password@postgres:5432/agentdb
         - REDIS_URL=redis://redis:6379
       depends_on:
         - postgres
         - redis
   
     frontend:
       build:
         context: ./apps/frontend
         dockerfile: Dockerfile
       ports:
         - "80:80"
       depends_on:
         - backend
   
     postgres:
       image: postgres:16-alpine
       environment:
         - POSTGRES_DB=agentdb
         - POSTGRES_USER=agent
         - POSTGRES_PASSWORD=changeme
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
     redis:
       image: redis:7-alpine
       ports:
         - "6379:6379"
   
   volumes:
     postgres_data:
   ```

**4. 创建Nginx配置**
   ```nginx
   # apps/frontend/nginx.conf
   server {
       listen 80;
       server_name localhost;
       
       root /usr/share/nginx/html;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       location /api {
           proxy_pass http://backend:4300;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   }
   ```

#### 验收标准

- [ ] Dockerfiles创建完成
- [ ] docker-compose.yml能启动所有服务
- [ ] 后端Docker镜像构建成功
- [ ] 前端Docker镜像构建成功
- [ ] 能使用`docker-compose up`启动应用
- [ ] 应用在Docker中正常运行

#### 参考文档

- `ANALYSIS_REPORT.md` - 第8.2节，生产就绪度

---

### P3-T-004: 配置GitHub Actions CI/CD

| 属性 | 值 |
|------|------|
| **优先级** | P3 ⚪ |
| **模块** | CI/CD |
| **影响范围** | 自动化构建和部署 |
| **预计工作量** | 2-3天 |
| **依赖任务** | P3-T-003 (Docker配置) |

#### 文件路径

```
.github/workflows/
```

#### 详细步骤

**1. 创建CI工作流**
   ```yaml
   # .github/workflows/ci.yml
   name: CI
   
   on:
     push:
       branches: [main, develop]
     pull_request:
       branches: [main, develop]
   
   jobs:
     test:
       runs-on: ubuntu-latest
       
       services:
         postgres:
           image: postgres:16
           env:
             POSTGRES_PASSWORD: postgres
             POSTGRES_DB: test_db
           options: >-
             --health-cmd pg_isready
             --health-interval 10s
             --health-timeout 5s
             --health-retries 5
       
       steps:
         - name: Checkout code
           uses: actions/checkout@v4
         
         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '20'
             cache: 'npm'
             cache-dependency-path: apps/frontend/node_modules
             cache-dependency-path: apps/server/node_modules
         
         - name: Install dependencies
           run: |
             cd apps/server && npm ci
             cd apps/frontend && npm ci
         
         - name: Run backend tests
           run: |
             cd apps/server
             npm run test:cov
         
         - name: Run frontend tests
           run: |
             cd apps/frontend
             npm run test:coverage
         
         - name: Upload coverage
           uses: codecov/codecov-action@v4
           with:
             files: ./apps/server/coverage/lcov.info,./apps/frontend/coverage/lcov.info
     
     build:
       needs: test
       runs-on: ubuntu-latest
       
       steps:
         - name: Checkout code
           uses: actions/checkout@v4
         
         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '20'
         
         - name: Build backend
           run: |
             cd apps/server
             npm run build
         
         - name: Build frontend
           run: |
             cd apps/frontend
             npm run build
         
         - name: Upload artifacts
           uses: actions/upload-artifact@v4
           with:
             name: build-artifacts
             path: |
               apps/server/dist
               apps/frontend/dist
   ```

**2. 创建部署工作流**
   ```yaml
   # .github/workflows/deploy.yml
   name: Deploy
   
   on:
     push:
       branches: [main]
   
   jobs:
     deploy:
       runs-on: ubuntu-latest
       
       steps:
         - name: Checkout code
           uses: actions/checkout@v4
         
         - name: Deploy to server
           uses: appleboy/ssh-action@master
           with:
             host: ${{ secrets.DEPLOY_HOST }}
             username: ${{ secrets.DEPLOY_USER }}
             key: ${{ secrets.DEPLOY_KEY }}
             script: |
               cd /var/www/agent-project-manager
               git pull origin main
               docker-compose pull
               docker-compose up -d
   ```

#### 验收标准

- [ ] CI工作流创建完成
- [ ] CI能运行测试
- [ ] CI能构建应用
- [ ] 部署工作流能部署到服务器
- [ ] 工作流在GitHub上正常运行

#### 参考文档

- `ANALYSIS_REPORT.md` - 第8.2节，生产就绪度

---

### P3-T-005: 实现健康检查端点

| 属性 | 值 |
|------|------|
| **优先级** | P3 ⚪ |
| **模块** | Backend - Main |
| **影响范围** | 可观测性 |
| **预计工作量** | 0.5天 |

#### 文件路径

```
apps/server/src/main.ts
apps/server/src/common/health/
```

#### 详细步骤

**1. 创建健康检查服务**
   ```typescript
   // apps/server/src/common/health/health.service.ts
   import { Injectable } from '@nestjs/common';
   import {
     HealthCheck,
     HealthCheckResult,
     HealthCheckService,
     MicroserviceHealthIndicator,
   } from '@nestjs/terminus';
   
   @Injectable()
   export class HealthService implements HealthCheckService {
     constructor(
       private prisma: PrismaService,
       private cacheService: CacheService,
     ) {}
     
     @HealthCheck()
     async database(): Promise<HealthCheckResult> {
       try {
         await this.prisma.$queryRaw`SELECT 1`;
         return {
           status: 'up',
         message: 'Database connection is healthy',
         database: {
           status: 'up',
         },
         timeout: 1000,
       };
       } catch (error) {
         return {
           status: 'down',
           message: 'Database connection is down',
           database: {
             status: 'down',
           },
           timeout: 1000,
         };
       }
     }
     
     @HealthCheck()
     async cache(): Promise<HealthCheckResult> {
       try {
         await this.cacheService.get('health-check');
         return {
           status: 'up',
           message: 'Cache connection is healthy',
           memory: {
             status: 'up',
           },
           timeout: 1000,
         };
       } catch (error) {
         return {
           status: 'down',
           message: 'Cache connection is down',
           memory: {
             status: 'down',
           },
           timeout: 1000,
         };
       }
     }
   }
   ```

**2. **注册健康检查端点**
   ```typescript
   // apps/server/src/main.ts
   import { TerminusModule } from '@nestjs/terminus';
   import { HealthService } from './common/health/health.service';
   
   @Module({
     imports: [
       TerminusModule.forRoot({
         endpoints: {
           health: new TerminusEndpoint({
             healthChecks: [
               HealthService.database.bind(HealthService),
               HealthService.cache.bind(HealthService),
             ],
           }),
         },
       }),
     ],
   })
   export class AppModule {}
   ```

#### 验收标准

- [ ] 健康检查服务实现完成
- [ ] `/health`端点返回服务状态
- [ ] 数据库连接失败时health返回down
- [ ] 后端构建成功
- [ ] 健康检查可测试

#### 参考文档

- `ANALYSIS_REPORT.md` - 第8.2节，生产就绪度
- `docs/architecture-backend.md` - 健康检查设计

---

## 📊 任务统计

### 按优先级统计

| 优先级 | 任务数量 | 总预计工作量 |
|--------|----------|--------------|
| **P0 - 安全与阻塞** | 10 | ~6小时 |
| **P1 - 核心功能** | 10 | ~10天 |
| **P2 - 性能优化** | 7 | ~9天 |
| **P3 - 测试与工程化** | 5 | ~16天 |
| **总计** | 32 | ~36天 |

### 按模块统计

| 模块 | 任务数量 | 主要工作内容 |
|------|----------|-------------|
| **Backend** | 18 | 共享基础设施、Plugin、工作流、安全、缓存、队列、测试 |
| **Frontend** | 14 | TypeScript修复、UI组件、事件类型、缓存配置、测试 |
| **Integration** | 0 | Electron集成（待规划） |

### 按类型统计

| 类型 | 任务数量 | 说明 |
|------|----------|------|
| **安全** | 7 | 加密、CORS、Helmet、CSRF、Validation、Rate Limiting |
| **功能** | 5 | Plugin、工作流、Git UI、Integration UI、Notification UI |
| **性能** | 5 | Redis、Bull、Prisma事务、Winston、共享组件 |
| **代码质量** | 5 | TypeScript错误、事件类型、内联样式 |
| **测试** | 5 | 后端测试、前端测试、覆盖率 |
| **工程化** | 5 | Docker、CI/CD、健康检查 |

---

## ✅ 验收标准模板

每个任务完成后，AI应该验证：

### 通用验收标准

- [ ] **代码修改完成**: 所有相关文件已修改
- [ ] **类型检查通过**: 无TypeScript错误（`npm run build`成功）
- [ ] **Linting通过**: 代码符合Linting规则
- [ ] **功能测试通过**: 修改的功能能正常工作
- [ ] **无回归**: 修改不影响现有功能

### 后端特定验收

- [ ] **服务启动成功**: `npm run start:dev`无错误
- [ ] **API文档更新**: Swagger文档正确反映修改
- [ ] **数据库迁移完成**: Prisma迁移已应用
- [ ] **日志正常**: 相关日志正确输出

### 前端特定验收

- [ ] **UI正常显示**: 修改的组件正确渲染
- [ ] **交互正常**: 用户交互响应正确
- [ ] **状态正确**: 状态更新正确
- [ ] **性能可接受**: 无明显性能下降

### 测试特定验收

- [ ] **测试通过**: 所有相关测试通过
- [ ] **覆盖率达标**: 新增代码有测试覆盖
- [ ] **测试可重复**: 测试结果稳定

---

## 📚 参考文档

本TODO清单基于以下文档生成：

- `ANALYSIS_REPORT.md` - 项目分析报告
- `docs/architecture-design.md` - 整体架构设计
- `docs/architecture-backend.md` - 后端架构设计
- `docs/architecture-frontend.md` - 前端架构设计
- `docs/design-system.md` - UI/UX设计系统
- `docs/implementation-plan.md` - 实施计划
- `docs/development-guide.md` - 开发指南

在执行任务时，如有疑问，请参考相关文档章节。

---

## 🔄 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|---------|
| 1.0 | 2026-02-20 | 初始版本，基于ANALYSIS_REPORT.md生成 |

---

## 📝 执行笔记

### 给AI的执行提示

1. **按优先级顺序执行**: 先完成P0所有任务，再执行P1，依此类推
2. **依赖关系**: 注意任务的依赖项，确保前置任务先完成
3. **批量执行**: 同类型任务可以批量执行以提高效率
4. **验证反馈**: 每完成一个任务后验证，避免返工
5. **问题处理**: 遇到问题，先查看参考文档，再考虑其他方案
6. **安全第一**: 任何代码修改都要考虑安全性

### 已知风险

1. **时间估算**: 实际工作量可能因熟悉程度而有所不同
2. **复杂度未知**: 部分任务可能发现更多问题
3. **依赖更新**: npm包可能需要更新版本
4. **技术债务**: 修复旧问题可能引入新问题

---

*本TODO文档已为AI优化，每个任务都包含详细的执行步骤和验收标准。*
