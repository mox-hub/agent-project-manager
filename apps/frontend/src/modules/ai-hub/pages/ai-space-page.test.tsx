import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test-utils/providers';
import { AISpacePage } from './ai-space-page';

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

vi.mock('../hooks/use-ai-conversations', () => ({
  useAIConversations: () => ({
    data: { data: [] },
    isLoading: false,
  }),
  useAIConversation: () => ({
    data: undefined,
    refetch: vi.fn(),
  }),
}));

describe('AISpacePage', () => {
  it('renders unified header and context bar', async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AISpacePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'AI Space' })).toBeTruthy();
    expect(screen.getByText('会话数 0')).toBeTruthy();
  });
});
