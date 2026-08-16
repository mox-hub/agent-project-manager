import { TaskIdService } from './task-id.service';

describe('TaskIdService.formatShortId', () => {
  const svc = new TaskIdService(null as any);

  it('pads 3 digits and joins with -', () => {
    expect(svc.formatShortId('APM', 'PF', 1)).toBe('APM-PF-001');
    expect(svc.formatShortId('APM', 'PF', 42)).toBe('APM-PF-042');
  });

  it('handles >999 seq naturally', () => {
    expect(svc.formatShortId('APM', 'PF', 1234)).toBe('APM-PF-1234');
  });

  it('falls back to APM when projectCode is empty', () => {
    expect(svc.formatShortId('', 'PF', 1)).toBe('APM-PF-001');
  });
});
