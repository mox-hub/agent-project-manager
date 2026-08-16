import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { FilterPanel } from './filter-panel';
import type { FilterState } from '@/shared/filters/types';

function TestFilterPanel() {
  const [selected, setSelected] = useState<FilterState>({});

  return (
    <FilterPanel
      buttonText="Filter"
      groups={[
        {
          id: 'status',
          label: 'Status',
          multiSelect: true,
          options: [
            { id: 'active', label: 'Active' },
            { id: 'archived', label: 'Archived' },
          ],
        },
      ]}
      selectedFilters={selected}
      onFilterChange={(id, value) =>
        setSelected((prev) => ({
          ...prev,
          [id]: value,
        }))
      }
    />
  );
}

describe('FilterPanel', () => {
  it('should open and apply multi-select filters', () => {
    render(<TestFilterPanel />);

    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    fireEvent.click(screen.getByText('Status'));
    fireEvent.click(screen.getByText('Active'));

    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });
});
