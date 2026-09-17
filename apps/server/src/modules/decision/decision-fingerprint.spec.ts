import {
  computeProposalFingerprint,
  isApprovalStale,
} from './decision-fingerprint';

describe('decision-fingerprint（CAP-C-04 批准绑定内容版本）', () => {
  const base = {
    kind: 'plan',
    title: '拆解任务？',
    detail: '  建议 3 个子任务  ',
    payload: { added: [{ title: 'A' }, { title: 'B' }], issueId: 't-1' },
    projectId: 'p1',
    issueId: 't-1',
  };

  describe('computeProposalFingerprint：规范化稳定性', () => {
    it('同内容不同键序 → 同指纹（对象键序是实现细节，不属于内容）', () => {
      const a = computeProposalFingerprint({
        ...base,
        payload: { issueId: 't-1', added: [{ title: 'A' }, { title: 'B' }] },
      });
      const b = computeProposalFingerprint({
        ...base,
        payload: { added: [{ title: 'A' }, { title: 'B' }], issueId: 't-1' },
      });
      expect(a).toBe(b);
    });

    it('深层嵌套对象键序无关 → 同指纹', () => {
      const a = computeProposalFingerprint({
        ...base,
        payload: { deep: { x: 1, y: { m: 2, n: 3 } } },
      });
      const b = computeProposalFingerprint({
        ...base,
        payload: { deep: { y: { n: 3, m: 2 }, x: 1 } },
      });
      expect(a).toBe(b);
    });

    it('空白归一：\\r\\n 与首尾空白不改变指纹', () => {
      const a = computeProposalFingerprint({
        ...base,
        title: '拆解任务？',
        detail: '建议 3 个子任务',
      });
      const b = computeProposalFingerprint({
        ...base,
        title: '拆解任务？\r\n',
        detail: '  \r\n建议 3 个子任务\r\n',
      });
      expect(a).toBe(b);
    });

    it('数组保序：顺序不同 = 内容不同 → 不同指纹', () => {
      const a = computeProposalFingerprint({
        ...base,
        payload: { added: [{ title: 'A' }, { title: 'B' }] },
      });
      const b = computeProposalFingerprint({
        ...base,
        payload: { added: [{ title: 'B' }, { title: 'A' }] },
      });
      expect(a).not.toBe(b);
    });

    it('实质字段任一变更 → 指纹变化（title/detail/payload/projectId/issueId/kind）', () => {
      const baseline = computeProposalFingerprint(base);
      expect(
        computeProposalFingerprint({ ...base, title: '拆解任务（改）？' }),
      ).not.toBe(baseline);
      expect(
        computeProposalFingerprint({ ...base, detail: '改了说明' }),
      ).not.toBe(baseline);
      expect(
        computeProposalFingerprint({
          ...base,
          payload: { ...base.payload, extra: 1 },
        }),
      ).not.toBe(baseline);
      expect(computeProposalFingerprint({ ...base, projectId: 'p2' })).not.toBe(
        baseline,
      );
      expect(computeProposalFingerprint({ ...base, issueId: 't-2' })).not.toBe(
        baseline,
      );
      expect(
        computeProposalFingerprint({ ...base, kind: 'assignment' }),
      ).not.toBe(baseline);
    });

    it('非实质字段（status/proposer/expiresAt 等）不影响指纹', () => {
      const withMeta = {
        ...base,
        status: 'accepted',
        proposerType: 'system',
        proposerId: 'm-1',
        expiresAt: new Date('2026-09-20T00:00:00Z'),
        resolution: { action: 'accept' },
      };
      expect(computeProposalFingerprint(withMeta)).toBe(
        computeProposalFingerprint(base),
      );
    });

    it('指纹为 64 位小写 hex（sha256）', () => {
      const fp = computeProposalFingerprint(base);
      expect(fp).toMatch(/^[0-9a-f]{64}$/);
    });

    it('undefined 属性与缺失属性同指纹；detail/payload null 与缺失同指纹', () => {
      const a = computeProposalFingerprint({
        kind: 'spend',
        title: 'T',
        payload: { a: undefined, b: 1 },
        detail: null,
        projectId: null,
        issueId: null,
      });
      const b = computeProposalFingerprint({
        kind: 'spend',
        title: 'T',
        payload: { b: 1 },
      });
      expect(a).toBe(b);
    });
  });

  describe('isApprovalStale：批准过期判定', () => {
    const fingerprint = computeProposalFingerprint(base);

    it('accepted 且当前指纹 ≠ 批准时指纹 → true（内容已实质变更）', () => {
      expect(
        isApprovalStale(
          { ...base, status: 'accepted', approvedFingerprint: fingerprint },
          computeProposalFingerprint({ ...base, title: '内容改了' }),
        ),
      ).toBe(true);
    });

    it('accepted 且指纹一致 → false', () => {
      expect(
        isApprovalStale(
          { ...base, status: 'accepted', approvedFingerprint: fingerprint },
          fingerprint,
        ),
      ).toBe(false);
    });

    it('pending（未批准）→ 恒 false，谈不上过期', () => {
      expect(
        isApprovalStale(
          { ...base, status: 'pending', approvedFingerprint: null },
          computeProposalFingerprint({ ...base, title: '随便改' }),
        ),
      ).toBe(false);
    });

    it('存量已决议行无 approvedFingerprint → false（无法判定版本，不制造存量误报）', () => {
      expect(
        isApprovalStale(
          { ...base, status: 'accepted', approvedFingerprint: null },
          computeProposalFingerprint({ ...base, title: '内容改了' }),
        ),
      ).toBe(false);
    });

    it('缺省第二参数时按当前内容实时计算', () => {
      expect(
        isApprovalStale({
          ...base,
          status: 'accepted',
          approvedFingerprint: fingerprint,
        }),
      ).toBe(false);
      expect(
        isApprovalStale({
          ...base,
          title: '内容改了',
          status: 'accepted',
          approvedFingerprint: fingerprint,
        }),
      ).toBe(true);
    });
  });
});
