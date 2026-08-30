import { http, HttpResponse, delay } from 'msw';
import { makeProjects, makeTasks, makeSearchResults, makeDeliveryTree, makeAnalyticsOverview, makeDashboardOverview } from './data';

// 信封格式与后端一致（参照 src/test-utils/mock-handlers.ts / shared/types/api.ts）
function ok<T>(data: T) {
  return HttpResponse.json({
    status: 200,
    success: true,
    description: '操作成功',
    data,
    timestamp: new Date().toISOString(),
    requestId: 'req-mock',
  });
}

function paginated<T>(items: T[], page = 1, pageSize = 20, total?: number) {
  return ok({ items, total: total ?? items.length, page, pageSize });
}

// 三态评审开关（宪法 §9.2）：
//   ?mock_delay=1500  → 人为延迟毫秒数（loading 态）
//   ?mock_scenario=error → 强制 500（error 态）
//   ?mock_scenario=empty → 强制空集合（empty 态）
async function scenario(request: Request): Promise<'error' | 'empty' | null> {
  const url = new URL(request.url);
  const d = Number(url.searchParams.get('mock_delay') ?? 0);
  if (d > 0) await delay(Math.min(d, 10_000));
  const forced = url.searchParams.get('mock_scenario');
  if (forced === 'error' || forced === 'empty') return forced;
  return null;
}

function errorResponse() {
  return HttpResponse.json(
    { status: 500, success: false, description: 'mock 强制错误', data: null },
    { status: 500 },
  );
}

const ALL_PROJECTS = makeProjects();
const ALL_TASKS = makeTasks();

export const handlers = [
  http.get('*/projects', async ({ request }) => {
    const forced = await scenario(request);
    if (forced === 'error') return errorResponse();
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 20);
    const source = forced === 'empty' ? [] : ALL_PROJECTS;
    const slice = source.slice((page - 1) * pageSize, page * pageSize);
    return paginated(slice, page, pageSize, source.length);
  }),

  http.get('*/tasks', async ({ request }) => {
    const forced = await scenario(request);
    if (forced === 'error') return errorResponse();
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 20);
    const source = forced === 'empty' ? [] : ALL_TASKS;
    const slice = source.slice((page - 1) * pageSize, page * pageSize);
    return paginated(slice, page, pageSize, source.length);
  }),

  http.get('*/search', async ({ request }) => {
    const forced = await scenario(request);
    if (forced === 'error') return errorResponse();
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const types = url.searchParams.getAll('types');
    const limit = Number(url.searchParams.get('limit') ?? 50);
    const source = forced === 'empty' ? [] : makeSearchResults();
    const items = source
      .filter((hit) => (types.length ? types.includes(hit.type) : true))
      .filter((hit) => !q || hit.title.toLowerCase().includes(q) || hit.subtitle.toLowerCase().includes(q))
      .slice(0, limit);
    return ok({ items, total: items.length });
  }),

  http.get('*/delivery/overview', async ({ request }) => {
    const forced = await scenario(request);
    if (forced === 'error') return errorResponse();
    if (forced === 'empty') return ok({ nodes: [], annotations: [] });
    return ok(makeDeliveryTree());
  }),

  http.get('*/analytics/overview', async ({ request }) => {
    const forced = await scenario(request);
    if (forced === 'error') return errorResponse();
    return ok(makeAnalyticsOverview());
  }),

  http.get('*/dashboard/overview', async ({ request }) => {
    const forced = await scenario(request);
    if (forced === 'error') return errorResponse();
    return ok(makeDashboardOverview());
  }),
];

