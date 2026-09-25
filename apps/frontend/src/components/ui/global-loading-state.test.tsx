import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { GlobalLoadingState } from './global-loading-state';
import { LoadingProvider } from './loading-overlay';

/**
 * 全局顶部加载条（CAP-A-22 截图实测发现的存量 bug 回归）：
 * disabled 查询的 status 也是 pending（fetchStatus 为 idle）——
 * 旧实现按 status 计数会让加载条在无 token 页面（如 /login）永远挂着。
 * 修复后以 fetchStatus === 'fetching' 全量对账：只在真有在途请求时显示。
 */

function Probe({ enabled }: { enabled: boolean }) {
  useQuery({
    queryKey: ['probe'],
    queryFn: () => new Promise<string>((resolve) => setTimeout(() => resolve('ok'), 80)),
    enabled,
  });
  return null;
}

/** enabled 可切换的 Harness（同一 QueryClient 贯穿切换前后） */
function Harness({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [qc] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return (
    <QueryClientProvider client={qc}>
      <LoadingProvider defaultMode="bar">
        <GlobalLoadingState />
        <Probe enabled={enabled} />
        <button onClick={() => setEnabled(true)}>on</button>
        <button onClick={() => setEnabled(false)}>off</button>
      </LoadingProvider>
    </QueryClientProvider>
  );
}

describe('GlobalLoadingState（按 fetchStatus 全量对账）', () => {
  it('disabled 查询（status=pending 但从未请求）不显示加载条', async () => {
    render(<Harness initialEnabled={false} />);

    // 越过微任务对账窗口，确认加载条没有出现
    await new Promise((r) => setTimeout(r, 60));
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('disabled → 启用：请求在途时出现，完成后消失', async () => {
    render(<Harness initialEnabled={false} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

    screen.getByText('on').click();

    await waitFor(() => expect(screen.queryByRole('progressbar')).toBeInTheDocument());
    await waitFor(
      () => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument(),
      { timeout: 3000 },
    );
  });

  it('挂载即有在途请求：加载条出现并在完成后消失', async () => {
    render(<Harness initialEnabled={true} />);

    await waitFor(() => expect(screen.queryByRole('progressbar')).toBeInTheDocument());
    await waitFor(
      () => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument(),
      { timeout: 3000 },
    );
  });
});
