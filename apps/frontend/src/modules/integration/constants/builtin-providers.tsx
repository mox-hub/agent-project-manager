import * as React from 'react';
import type { ReactNode } from 'react';
import { LinearIcon } from '@/components/icons/linear';

export interface BuiltinProviderMeta {
  id: string;
  provider: string;
  name: string;
  description: string;
  longDescription?: string;
  tagline: string; // 'built-in' | 'coming-soon'
  status: 'available' | 'coming_soon' | 'beta';
  comingSoon: boolean;
  /**
   * Tailwind gradient classes, applied to the hero card.
   */
  gradientClass: string;
  /**
   * Optional ring color (e.g. for hover state)
   */
  ringClass: string;
  /**
   * Optional custom icon (SVG component) - default uses provider name.
   */
  iconComponent?: ReactNode;
  /**
   * Optional accent color hex (for status pill background)
   */
  accent?: string;
}

export const BUILTIN_PROVIDERS: BuiltinProviderMeta[] = [
  {
    id: 'linear',
    provider: 'linear',
    name: 'Linear',
    description: 'Issue tracking & sprint planning',
    longDescription:
      'Sync Linear projects and issues to APM. Two-way task sync with hybrid conflict resolution, locked base fields, and dedicated sync status badges.',
    tagline: 'built-in',
    status: 'available',
    comingSoon: false,
    gradientClass: 'from-[#1B1A3D] via-[#2D2B5F] to-[#5E6AD2]',
    ringClass: 'hover:ring-[#5E6AD2]/30',
    accent: '#5E6AD2',
    iconComponent: <LinearIcon size={28} />,
  },
  {
    id: 'jira',
    provider: 'jira',
    name: 'Jira',
    description: 'Enterprise issue management',
    longDescription:
      'Sync Atlassian Jira projects and issues to APM. Roadmap: similar field-lock + hybrid conflict policy.',
    tagline: 'coming-soon',
    status: 'coming_soon',
    comingSoon: true,
    gradientClass: 'from-[#0B1A33] via-[#172B4D] to-[#0052CC]',
    ringClass: 'hover:ring-[#0052CC]/30',
    accent: '#0052CC',
  },
];
