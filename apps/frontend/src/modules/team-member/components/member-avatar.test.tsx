import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemberAvatar } from './member-avatar';
import type { Member } from '../types';

const baseMember: Pick<Member, 'type' | 'displayName' | 'handle' | 'avatarUrl' | 'isOnline'> = {
  type: 'human',
  displayName: 'Alice Wang',
  handle: 'alice',
  avatarUrl: null,
  isOnline: true,
};

describe('MemberAvatar', () => {
  it('renders initials for human member', () => {
    render(<MemberAvatar member={baseMember} />);
    // Initials: first letter of first + last word → "AW"
    expect(screen.getByText('AW')).toBeInTheDocument();
  });

  it('shows AI bot icon for ai_agent type', () => {
    const { container } = render(
      <MemberAvatar
        member={{ ...baseMember, type: 'ai_agent', displayName: 'GPT Bot', handle: 'gpt' }}
      />,
    );
    // Lucide renders an <svg> for Bot; assert at least one svg exists
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
  });

  it('falls back to "?" when member is null', () => {
    render(<MemberAvatar member={null} />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders img when avatarUrl is provided', () => {
    render(
      <MemberAvatar
        member={{ ...baseMember, avatarUrl: 'https://example.com/a.png' }}
      />,
    );
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('https://example.com/a.png');
  });

  it('hides badge when showBadge is false', () => {
    const { container } = render(
      <MemberAvatar
        member={{ ...baseMember, isOnline: true }}
        showBadge={false}
      />,
    );
    // Online dot is the only absolute child; with showBadge=false none should be present
    const absoluteDots = container.querySelectorAll('.absolute.-bottom-0\\.5');
    expect(absoluteDots.length).toBe(0);
  });
});
