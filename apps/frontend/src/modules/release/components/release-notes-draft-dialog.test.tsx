/**
 * 发布说明 AI 起草对话框测试（CAP-A-18 样板推广第二实例）。
 * 守范式三层与失败纪律：
 * - 生成成功：AI 草稿进可编辑框、诚实缺口（gaps）在场、来源展开层可开；
 * - 确认才写回（走 useUpdateRelease），取消/关闭零写库；
 * - 生成失败显示错误 + 可重试，页面旧 notes 不受影响（对话框自治）；
 * - 生成中/空草稿时确认不可点。
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ReleaseNotesDraftDialog } from './release-notes-draft-dialog';
import type { ReleaseRecord } from '../api/release-api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const silentMock = vi.hoisted(() => vi.fn());
const updateMutateMock = vi.hoisted(() => vi.fn());
const toastMocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('@/modules/assistant/api/assistant-api', () => ({
  assistantApi: { silent: silentMock },
}));

vi.mock('../hooks/use-releases', () => ({
  useUpdateRelease: () => ({
    mutate: updateMutateMock,
    isPending: false,
  }),
}));

vi.mock('@/components/ui/toast', () => ({
  toast: toastMocks,
}));

const RELEASE: ReleaseRecord = {
  id: 'r-1',
  projectId: 'p-1',
  version: '0.7.13',
  name: '上手引导收口',
  notes: null,
  status: 'draft',
  scope: { issueIds: ['i-1', 'i-2'] },
  deliverables: {
    items: [
      {
        name: '桌面安装包',
        location: 'GitHub Release',
        howToVerify: '安装后可启动',
      },
    ],
  },
  createdBy: 'u-1',
  createdAt: '',
  updatedAt: '',
  tagPushed: false,
  githubReleased: false,
};

function renderDialog(release: ReleaseRecord = RELEASE, open = true) {
  return render(
    <ReleaseNotesDraftDialog
      release={release}
      open={open}
      onOpenChange={vi.fn()}
    />,
  );
}

beforeEach(() => {
  silentMock.mockReset();
  updateMutateMock.mockReset();
  toastMocks.success.mockClear();
  toastMocks.error.mockClear();
});

describe('ReleaseNotesDraftDialog（AI 建议 → 人确认 → 可展开来源）', () => {
  it('生成成功：草稿进可编辑框、gaps 缺口在场、来源展开层可打开并显示交付物明细', async () => {
    silentMock.mockResolvedValue({
      scenario: 'release-notes-draft',
      data: {
        notes: '# v0.7.13\n这个版本带来了向导双语化',
        gaps: ['范围工单未全部完成'],
      },
    });
    const user = userEvent.setup();
    const { baseElement } = renderDialog();

    // 生成调用：场景名 + releaseId 指针（零新端点，走通用静默面）
    expect(silentMock).toHaveBeenCalledWith(
      'release-notes-draft',
      expect.objectContaining({
        projectId: 'p-1',
        context: { releaseId: 'r-1' },
      }),
    );

    // 草稿进 Textarea（层1+层2 一体：AI 建议即草稿，可编辑确认）
    await waitFor(() => {
      const editor = baseElement.querySelector(
        'textarea[data-ai="notes-draft-editor"]',
      ) as HTMLTextAreaElement | null;
      expect(editor?.value).toContain('向导双语化');
    });
    // 诚实缺口不藏
    expect(screen.getByText('release.detail.notesDraft.gapsTitle')).toBeTruthy();
    expect(screen.getByText('范围工单未全部完成')).toBeTruthy();

    // 层3 默认收起：toggle 键名带计数；展开后显示范围与交付物明细
    expect(
      screen.getByText(/release.detail.notesDraft.sourcesToggle/),
    ).toBeTruthy();
    await user.click(screen.getByText(/release.detail.notesDraft.sourcesToggle/));
    expect(
      screen.getByText('release.detail.notesDraft.sourceScope'),
    ).toBeTruthy();
    expect(screen.getByText('桌面安装包')).toBeTruthy();
    expect(
      screen.getByText('release.detail.notesDraft.sourceDeliverables'),
    ).toBeTruthy();
  });

  it('确认写回：mutate 收到草稿，成功 toast 并触发回调；写回走既有 update 通道', async () => {
    silentMock.mockResolvedValue({
      scenario: 'release-notes-draft',
      data: { notes: '草稿正文', gaps: [] },
    });
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(
      <ReleaseNotesDraftDialog release={RELEASE} open onOpenChange={vi.fn()} onSuccess={onSuccess} />,
    );

    // 等草稿进编辑框（层1→层2：AI 建议即草稿，可编辑——编辑交互由受控
    // Textarea 语义保证，此处聚焦确认链路）
    await screen.findByText('release.detail.notesDraft.editableHint');

    await user.click(screen.getByText('release.detail.notesDraft.confirm'));
    expect(updateMutateMock).toHaveBeenCalledWith(
      { notes: '草稿正文' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    // 模拟写回成功回调 → toast + onSuccess + 关闭（onOpenChange false）
    const onSuccessCb = updateMutateMock.mock.calls[0][1].onSuccess as () => void;
    onSuccessCb();
    expect(toastMocks.success).toHaveBeenCalledWith(
      'release.detail.notesSaved',
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it('取消不落库：点取消仅关闭，mutate 零调用', async () => {
    silentMock.mockResolvedValue({
      scenario: 'release-notes-draft',
      data: { notes: '草稿正文', gaps: [] },
    });
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ReleaseNotesDraftDialog release={RELEASE} open onOpenChange={onOpenChange} />,
    );
    await waitFor(() => expect(silentMock).toHaveBeenCalled());

    await user.click(screen.getByText('common.cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(updateMutateMock).not.toHaveBeenCalled();
  });

  it('生成失败：错误在场 + 可重试，旧内容不受对话框影响（页面 notes 原样）', async () => {
    silentMock
      .mockRejectedValueOnce(new Error('LLM provider 不可用'))
      .mockResolvedValueOnce({
        scenario: 'release-notes-draft',
        data: { notes: '重试后的草稿', gaps: [] },
      });
    const user = userEvent.setup();
    const { baseElement } = renderDialog();

    expect(
      await screen.findByText(/LLM provider 不可用/),
    ).toBeTruthy();
    // 重试入口（common.retry）在场——页面旧 notes 是否保留由页面渲染保证，对话框不写库
    await user.click(screen.getByText('common.retry'));
    expect(
      await screen.findByText('release.detail.notesDraft.editableHint'),
    ).toBeTruthy();
    const editor = baseElement.querySelector(
      'textarea[data-ai="notes-draft-editor"]',
    ) as HTMLTextAreaElement;
    expect(editor.value).toContain('重试后的草稿');
    expect(silentMock).toHaveBeenCalledTimes(2);
    expect(updateMutateMock).not.toHaveBeenCalled();
  });

  it('AI 返回空草稿：按失败处理（emptyDraft 文案），确认不可点', async () => {
    silentMock.mockResolvedValue({
      scenario: 'release-notes-draft',
      data: { notes: '', gaps: [] },
    });
    renderDialog();

    expect(
      await screen.findByText('release.detail.notesDraft.emptyDraft'),
    ).toBeTruthy();
    const confirmBtn = screen.getByText(
      'release.detail.notesDraft.confirm',
    ).closest('button') as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
  });
});
