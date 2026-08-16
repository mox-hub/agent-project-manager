import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createTestQueryClient } from '@/test-utils/providers';
import { AnalyticsPage } from './analytics-page';

describe('AnalyticsPage', () => {
  it('renders analytics overview content', async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AnalyticsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Analytics' })).toBeTruthy();
    expect(screen.getByText('模块健康度')).toBeTruthy();
    expect(screen.getByText('风险聚焦')).toBeTruthy();
  });
});
