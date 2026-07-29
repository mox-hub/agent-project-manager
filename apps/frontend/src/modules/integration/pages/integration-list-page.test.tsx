import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IntegrationListPage } from './integration-list-page';

const updateMutateMock = vi.fn();
const deleteMutateAsyncMock = vi.fn(async () => undefined);
const createMutateAsyncMock = vi.fn(async () => ({}));

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
  useCreateIntegration: () => ({ mutateAsync: createMutateAsyncMock }),
}));

// Stub LinearConfigForm so the test doesn't depend on its own internal hooks
vi.mock('@/modules/linear/components/linear-config-form', () => ({
  LinearConfigForm: () => <div data-testid="linear-config-form" />,
}));

describe('IntegrationListPage', () => {
  beforeEach(() => {
    updateMutateMock.mockReset();
    deleteMutateAsyncMock.mockReset();
  });

  it('renders built-in tab by default and shows Linear hero', async () => {
    render(
      <MemoryRouter>
        <IntegrationListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Integrations' })).toBeTruthy();
    expect(screen.getByText('Linear')).toBeTruthy();
    expect(screen.getByText('Connect Linear')).toBeTruthy();
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

  it('switches to installed tab and lists configured integrations', async () => {
    render(
      <MemoryRouter>
        <IntegrationListPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Installed' }));
    expect(screen.getByText('GitHub Main')).toBeTruthy();
    expect(screen.getByText('GitLab Mirror')).toBeTruthy();
  });
});
