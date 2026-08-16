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

  it('renders built-in tab by default and shows integrations', async () => {
    render(
      <MemoryRouter>
        <IntegrationListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Integrations' })).toBeTruthy();
    // Linear is shown in Task Providers category (connected status)
    expect(screen.getByText('Linear')).toBeTruthy();
  });

  it('switches to monitoring tab', async () => {
    render(
      <MemoryRouter>
        <IntegrationListPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Monitoring/i }));
    // Sentry Monitor is in the monitoring category - use getAllByText and verify at least one
    expect(screen.getAllByText(/Sentry/i).length).toBeGreaterThan(0);
  });

  it('shows integration status information', async () => {
    render(
      <MemoryRouter>
        <IntegrationListPage />
      </MemoryRouter>,
    );

    // Connected integrations show connected status - use getAllByText since there are multiple
    expect(screen.getAllByText(/Connected/i).length).toBeGreaterThan(0);
  });
});
