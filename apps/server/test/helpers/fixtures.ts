/**
 * E2E 数据构造器：项目与任务的最小可用夹具。
 * 任务创建依赖项目的模块代码与状态定义（moduleCode 必须挂在 ProjectModule 上、
 * status 必须能在 StatusDefinition 里解析），这里统一种进工作区库。
 */
import type { IsolatedWorkspace, WsRequest } from './ws-app';

/** 创建最小项目（team 类型），返回 projectId */
export async function createProjectFixture(
  wsHttp: WsRequest,
  token: string,
  name = 'E2E Fixture Project',
): Promise<string> {
  const res = await wsHttp
    .post('/_api/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name,
      description: 'Created by e2e fixture',
      type: 'team',
      visibility: 'private',
    });
  expect(res.status).toBe(201);
  expect(res.body.data).toBeTruthy();
  return res.body.data.id as string;
}

/** 创建项目 + 任务全套夹具，返回 ids */
export async function createTaskFixture(
  wsHttp: WsRequest,
  ws: IsolatedWorkspace,
  token: string,
): Promise<{ projectId: string; taskId: string }> {
  const projectId = await createProjectFixture(
    wsHttp,
    token,
    'E2E Task Project',
  );

  await ws.db.projectModule.create({
    data: { projectId, code: 'TP', name: '平台功能' },
  });
  await ws.db.statusDefinition.createMany({
    data: [
      { projectId, type: 'task', key: 'todo', name: '待办', order: 1 },
      { projectId, type: 'task', key: 'in_progress', name: '进行中', order: 2 },
    ],
  });

  const res = await wsHttp
    .post('/_api/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({
      projectId,
      moduleCode: 'TP',
      title: 'E2E Fixture Task',
    });
  expect(res.status).toBe(201);
  expect(res.body.data).toBeTruthy();

  return { projectId, taskId: res.body.data.id as string };
}
