import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IntegrationListPage } from './integration-list-page';

const updateMutateMock = vi.fn();
const deleteMutateAsyncMock = vi.fn(async () => undefined);

vi.mock('../hooks/use-integrations', () => ({
  useIntegrations: () => ({
    data: {
      data: [
        { id: '1', name: 'GitHub Main', provider: 'github', enabled: true, lastSyncAt: null },
        { id: '2', name: 'GitLab Mirror', provider: 'gitlab', enabled: false, lastSyncAt: null },
      ],
    },
    isLoading: false,
  }),
  useUpdateIntegration: () => ({ mutate: updateMutateMock }),
  useDeleteIntegration: () => ({ mutateAsync: deleteMutateAsyncMock }),
}));

describe('IntegrationListPage', () => {
  beforeEach(() => {
    updateMutateMock.mockReset();
    deleteMutateAsyncMock.mockReset();
  });

  it('filters installed integrations by search', async () => {
    render(
      <MemoryRouter>
        <IntegrationListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Integrations' })).toBeTruthy();
    expect(screen.getByText('GitHub Main')).toBeTruthy();
    expect(screen.getByText('GitLab Mirror')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Search plugins...'), {
      target: { value: 'mirror' },
    });

    expect(screen.getByText('GitLab Mirror')).toBeTruthy();
    expect(screen.queryByText('GitHub Main')).toBeNull();
  });

  it('switches to marketplace tab', async () => {
    render(
      <MemoryRouter>
        <IntegrationListPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Marketplace' }));
    expect(screen.getByText('Sentry Monitor')).toBeTruthy();
  });
});
