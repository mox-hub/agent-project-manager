import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { IntegrationListPage } from './integration-list-page';

vi.mock('@/components/ui/native-select', () => ({
  NativeSelect: ({
    value,
    onChange,
    children,
  }: {
    value: string;
    onChange: (event: { target: { value: string } }) => void;
    children: ReactNode;
  }) => (
    <select value={value} onChange={onChange}>
      {children}
    </select>
  ),
  NativeSelectOption: ({
    value,
    children,
  }: {
    value: string;
    children: ReactNode;
  }) => <option value={value}>{children}</option>,
}));

vi.mock('@/shared/confirm/use-confirm', () => ({
  useConfirm: () => vi.fn(async () => true),
}));

vi.mock('../hooks/use-integrations', () => ({
  useIntegrations: () => ({
    data: {
      data: [
        { id: '1', name: 'GitHub Main', provider: 'github', enabled: true },
        { id: '2', name: 'GitLab Mirror', provider: 'gitlab', enabled: false },
      ],
    },
    isLoading: false,
  }),
  useDeleteIntegration: () => ({
    mutateAsync: vi.fn(async () => undefined),
    isPending: false,
  }),
}));

vi.mock('../components/integration-config-form', () => ({
  IntegrationConfigForm: () => null,
}));

vi.mock('../components/integration-card', () => ({
  IntegrationCard: ({ integration }: { integration: { name: string } }) => <div>{integration.name}</div>,
}));

vi.mock('../components/integration-list', () => ({
  IntegrationList: ({
    provider,
    enabled,
    query,
  }: {
    provider?: string;
    enabled?: string;
    query?: string;
  }) => <div data-testid="integration-list-filters">{`${provider}|${enabled}|${query}`}</div>,
}));

describe('IntegrationListPage', () => {
  it('applies context-bar filters to list and cards', async () => {
    render(
      <MemoryRouter>
        <IntegrationListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Integrations' })).toBeTruthy();
    expect(screen.getByText('GitHub Main')).toBeTruthy();
    expect(screen.getByText('GitLab Mirror')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Search integrations...'), {
      target: { value: 'github' },
    });
    expect(screen.getByTestId('integration-list-filters').textContent).toBe('all|all|github');
    expect(screen.getByText('GitHub Main')).toBeTruthy();
    expect(screen.queryByText('GitLab Mirror')).toBeNull();

    fireEvent.change(screen.getByDisplayValue('All providers'), {
      target: { value: 'gitlab' },
    });
    fireEvent.change(screen.getByDisplayValue('All status'), {
      target: { value: 'disabled' },
    });
    fireEvent.change(screen.getByPlaceholderText('Search integrations...'), {
      target: { value: 'mirror' },
    });

    expect(screen.getByTestId('integration-list-filters').textContent).toBe('gitlab|disabled|mirror');
    expect(screen.getByText('GitLab Mirror')).toBeTruthy();
    expect(screen.queryByText('GitHub Main')).toBeNull();
  });
});
