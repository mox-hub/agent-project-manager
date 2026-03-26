import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createTestQueryClient } from '@/test-utils/providers';
import { DocumentsPage } from './documents-page';

describe('DocumentsPage', () => {
  it('renders document list and actions', async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DocumentsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: '文档管理' })).toBeTruthy();
    expect(screen.getByText('Architecture Overview')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: '查看' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: '编辑' }).length).toBeGreaterThan(0);
  });
});
