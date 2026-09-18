/**
 * 交付成果清单卡片（CAP-K-03 批二切片）。
 * 回答发布后的四个问题：交付了什么 / 在哪拿 / 怎么验证可用 / 有什么限制、由谁接收。
 * 展示 + 行级编辑（任意状态可编辑：released 后仍可补录交付信息），
 * 保存走 PUT /releases/:id/deliverables 全量替换；必填口径（name/location/howToVerify）
 * 与服务端 assertDeliverableItems 同口径，前端先行提示、服务端兜底。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PackageCheck, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { useUpdateDeliverables } from '../hooks/use-releases';
import type { ReleaseDeliverableItem, ReleaseRecord } from '../api/release-api';

const EMPTY_ITEM: ReleaseDeliverableItem = {
  name: '',
  location: '',
  howToVerify: '',
};

/** 客户端必填口径：与服务端 assertDeliverableItems 一致（trim 后非空） */
function firstMissingIndex(items: ReleaseDeliverableItem[]): number {
  return items.findIndex(
    (item) =>
      !item.name.trim() || !item.location.trim() || !item.howToVerify.trim(),
  );
}

export function ReleaseDeliverablesCard({ release }: { release: ReleaseRecord }) {
  const { t } = useTranslation();
  const update = useUpdateDeliverables(release.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ReleaseDeliverableItem[]>([]);
  const items = release.deliverables?.items ?? [];

  const startEdit = () => {
    setDraft(items.length ? items.map((item) => ({ ...item })) : [{ ...EMPTY_ITEM }]);
    setEditing(true);
  };

  const patchItem = (index: number, patch: Partial<ReleaseDeliverableItem>) => {
    setDraft((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const save = () => {
    const missing = firstMissingIndex(draft);
    if (missing >= 0) {
      toast.error(
        t('release.deliverables.requiredMissing', { index: missing + 1 }),
      );
      return;
    }
    update.mutate(
      draft.map((item) => ({
        name: item.name.trim(),
        location: item.location.trim(),
        howToVerify: item.howToVerify.trim(),
        limitations: item.limitations?.trim() || undefined,
        receiver: item.receiver?.trim() || undefined,
      })),
      {
        onSuccess: () => {
          setEditing(false);
          toast.success(t('release.deliverables.saved'));
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <PackageCheck className="size-4 text-accent-green" />
          {t('release.deliverables.title')}
        </CardTitle>
        {editing ? null : (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={startEdit}
          >
            {t('release.deliverables.edit')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <>
            <div className="space-y-2">
              {draft.map((item, index) => (
                <div
                  key={`deliverable-draft-${index}`}
                  className="relative space-y-1.5 rounded-md border border-border p-3 pr-8"
                >
                  <button
                    type="button"
                    className="absolute right-2 top-2 text-content-text-muted hover:text-accent-red"
                    title={t('release.deliverables.remove')}
                    onClick={() =>
                      setDraft((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    <X className="size-3.5" />
                  </button>
                  <div className="grid gap-1.5 sm:grid-cols-3">
                    <Input
                      value={item.name}
                      placeholder={t('release.deliverables.field.name')}
                      className="h-7 text-xs"
                      onChange={(e) => patchItem(index, { name: e.target.value })}
                    />
                    <Input
                      value={item.location}
                      placeholder={t('release.deliverables.field.location')}
                      className="h-7 text-xs"
                      onChange={(e) =>
                        patchItem(index, { location: e.target.value })
                      }
                    />
                    <Input
                      value={item.howToVerify}
                      placeholder={t('release.deliverables.field.howToVerify')}
                      className="h-7 text-xs"
                      onChange={(e) =>
                        patchItem(index, { howToVerify: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    <Input
                      value={item.limitations ?? ''}
                      placeholder={t('release.deliverables.field.limitations')}
                      className="h-7 text-xs"
                      onChange={(e) =>
                        patchItem(index, { limitations: e.target.value })
                      }
                    />
                    <Input
                      value={item.receiver ?? ''}
                      placeholder={t('release.deliverables.field.receiver')}
                      className="h-7 text-xs"
                      onChange={(e) =>
                        patchItem(index, { receiver: e.target.value })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setDraft((prev) => [...prev, { ...EMPTY_ITEM }])}
              >
                <Plus className="mr-1 size-3" />
                {t('release.deliverables.addItem')}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setEditing(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={update.isPending}
                  onClick={save}
                >
                  {t('common.save')}
                </Button>
              </div>
            </div>
          </>
        ) : items.length ? (
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li
                key={`deliverable-${item.name}-${index}`}
                className="space-y-1 rounded-md border border-border p-3"
              >
                <p className="text-xs font-medium">{item.name}</p>
                <p className="text-11 text-content-text-muted">
                  {t('release.deliverables.field.location')}:{' '}
                  <span className="font-mono">{item.location}</span>
                </p>
                <p className="text-11 text-content-text-muted">
                  {t('release.deliverables.field.howToVerify')}: {item.howToVerify}
                </p>
                {item.limitations ? (
                  <p className="text-11 text-content-text-muted">
                    {t('release.deliverables.field.limitations')}: {item.limitations}
                  </p>
                ) : null}
                {item.receiver ? (
                  <p className="text-11 text-content-text-muted">
                    {t('release.deliverables.field.receiver')}: {item.receiver}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-content-text-muted">
            {t('release.deliverables.empty')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
