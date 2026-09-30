import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LupiChartDialog, buildLupiSrcDoc } from './lupi-chart-dialog';

describe('buildLupiSrcDoc', () => {
  it('injects payload JSON into the template placeholder and drops the demo fallback', () => {
    const doc = buildLupiSrcDoc('health', {
      title: '注入标题',
      sub: '一点 = 一周',
      src: 'HEALTH HAIRLINE · LIVE',
      max: 100,
      points: [{ label: 'W1', value: 73 }],
    });
    expect(doc).not.toContain('/*__CHART_DATA__*/null');
    expect(doc).toContain('"title":"注入标题"');
    expect(doc).toContain('prefers-reduced-motion');
  });

  it('keeps template geometry markers (hairline reveal + paired rungs)', () => {
    const health = buildLupiSrcDoc('health', {
      title: 't', sub: 's', src: 'x', points: [{ label: 'W1', value: 1 }],
    });
    expect(health).toContain('obsReveal');
    const delivery = buildLupiSrcDoc('delivery', {
      title: 't', sub: 's', src: 'x', items: [{ label: '9-30', done: 2, created: 5 }],
    });
    expect(delivery).toContain('ONE RUNG = ONE TASK');
  });
});

describe('LupiChartDialog', () => {
  it('renders fullscreen shell with iframe, replay hint and reserved export button', () => {
    render(
      <LupiChartDialog
        kind="health"
        open
        onClose={() => {}}
        payload={{ title: 't', sub: 's', src: 'x', max: 100, points: [{ label: 'W1', value: 73 }] }}
      />,
    );

    expect(screen.getByText('Chart deep read')).toBeTruthy();
    expect(screen.getByText('Lupi deep read')).toBeTruthy();
    expect(screen.getByText('Click the chart to replay')).toBeTruthy();
    const iframe = screen.getByTitle('Chart deep read');
    expect(iframe.getAttribute('srcdoc')).toContain('"title":"t"');
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
    const exportBtn = screen.getByRole('button', { name: 'Export report' });
    expect(exportBtn.hasAttribute('disabled')).toBe(true);
  });
});
