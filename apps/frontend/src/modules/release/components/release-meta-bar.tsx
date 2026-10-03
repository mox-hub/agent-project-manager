/**
 * 发版基础信息胶囊组（CAP-K-03 详情页改版）：置于状态进度条之下，
 * 把原先折叠在发版说明卡底部的小字 meta 提升为可扫读的胶囊行。
 * - 展示态：项目/版本+通道/名称/Git Tag/GitHub Release/计划/平台/里程碑/热修/发布时间；
 *   Git Tag 与 GitHub Release 是发布执行产物（publish 硬编码 v{version} 打 tag 并回写），
 *   恒只读——开放编辑是假能力；项目与通道（版本推导）同样不可变。
 * - 编辑态（仅 draft）：版本/名称/计划时间/平台/里程碑/热修基线走既有 updateDraft
 *   字段面，零新增 API；保存成功后经 query 失效刷新整页。
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Flag,
  FolderKanban,
  GitPullRequestArrow,
  Pencil,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { useProjectMilestones } from "@/modules/issue/hooks/use-project-tasks";
import {
  useRecommendVersion,
  useReleases,
  useUpdateRelease,
} from "../hooks/use-releases";
import {
  RELEASE_PLATFORMS,
  RELEASE_PLATFORM_LABELS,
  type ReleasePlatform,
  type ReleaseRecord,
} from "../api/release-api";
import {
  ReleaseChannelChip,
  ReleasePlatformBadges,
} from "./release-platform-badges";
import { deriveReleaseChannel } from "../api/release-api";
import { isPlannedOverdue } from "../release-status-meta";
import { cn } from "@/lib/utils";

/** 展示态胶囊：图标 + 可选标签 + 值；只读事实与可改值同构，扫读优先 */
function MetaPill({
  icon,
  label,
  children,
  tone,
  title,
}: {
  icon: React.ReactNode;
  label?: string;
  children: React.ReactNode;
  tone?: "overdue" | "ok" | "muted";
  title?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-full bg-muted/40 py-1 pl-2.5 pr-3 text-xs",
        tone === "overdue" && "bg-accent-red-light/50 text-accent-red",
        tone === "muted" && "text-content-text-muted",
      )}
      title={title}
    >
      {icon}
      {label ? <span className="text-content-text-muted">{label}</span> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function ReleaseMetaBar({ release }: { release: ReleaseRecord }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);

  return (
    <Card data-testid="release-meta-bar" data-ai-component="release.meta-bar">
      <CardContent className="space-y-2 p-4">
        {editing ? (
          <MetaEditForm release={release} onDone={() => setEditing(false)} />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {release.project ? (
                <MetaPill
                  icon={
                    <FolderKanban className="size-3 text-content-text-muted" />
                  }
                  label={t("release.detail.project")}
                >
                  {release.project.name}
                </MetaPill>
              ) : null}
              <MetaPill
                icon={<Tag className="size-3 text-content-text-muted" />}
              >
                <span className="font-mono font-medium">
                  v{release.version}
                </span>
                <ReleaseChannelChip
                  channel={deriveReleaseChannel(release.version)}
                />
              </MetaPill>
              {release.name ? (
                <MetaPill
                  icon={<Flag className="size-3 text-content-text-muted" />}
                >
                  {release.name}
                </MetaPill>
              ) : null}
              <MetaPill
                icon={<Tag className="size-3 text-content-text-muted" />}
                label={t("release.detail.tag")}
                tone={release.gitTag ? undefined : "muted"}
                title={
                  release.gitTag ??
                  t("release.meta.tagAuto", { version: release.version })
                }
              >
                {release.gitTag ? (
                  <span className="font-mono">{release.gitTag}</span>
                ) : (
                  t("release.meta.tagAuto", { version: release.version })
                )}
              </MetaPill>
              <MetaPill
                icon={
                  <CheckCircle2
                    className={cn(
                      "size-3",
                      release.githubReleased
                        ? "text-accent-green"
                        : "text-content-text-muted/50",
                    )}
                  />
                }
                label={t("release.detail.github")}
                tone={release.githubReleased ? "ok" : "muted"}
              >
                {release.githubReleased
                  ? t("release.detail.yes")
                  : t("release.detail.no")}
              </MetaPill>
              {release.plannedAt ? (
                <MetaPill
                  icon={<CalendarClock className="size-3" />}
                  label={t("release.detail.planned")}
                  tone={isPlannedOverdue(release) ? "overdue" : undefined}
                >
                  {new Date(release.plannedAt).toLocaleDateString()}
                </MetaPill>
              ) : null}
              <ReleasePlatformBadges
                platforms={release.platforms}
                className="shrink-0 rounded-full bg-muted/40 py-1.5 pl-2.5 pr-3"
              />
              {release.milestone ? (
                <MetaPill
                  icon={<Flag className="size-3 text-accent-purple" />}
                  label={t("release.detail.milestone")}
                >
                  {release.milestone.name}
                </MetaPill>
              ) : null}
              {release.hotfixOf ? (
                <MetaPill
                  icon={
                    <GitPullRequestArrow className="size-3 text-accent-orange" />
                  }
                  label={t("release.detail.hotfixOf")}
                >
                  <span className="font-mono">v{release.hotfixOf.version}</span>
                </MetaPill>
              ) : null}
              {release.releasedAt ? (
                <MetaPill
                  icon={<Clock className="size-3 text-content-text-muted" />}
                >
                  {new Date(release.releasedAt).toLocaleString()}
                </MetaPill>
              ) : null}
            </div>
            {release.status === "draft" ? (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-2xs text-content-text-muted"
                  onClick={() => setEditing(true)}
                  data-testid="release-meta-edit"
                >
                  <Pencil className="size-3" />
                  {t("release.meta.edit")}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** 编辑态：版本/名称/计划/平台/里程碑/热修紧凑表单，一次 updateDraft 提交 */
function MetaEditForm({
  release,
  onDone,
}: {
  release: ReleaseRecord;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [version, setVersion] = useState(release.version);
  const [name, setName] = useState(release.name ?? "");
  const [plannedAt, setPlannedAt] = useState<Date | undefined>(
    release.plannedAt ? new Date(release.plannedAt) : undefined,
  );
  const [platforms, setPlatforms] = useState<ReleasePlatform[]>(
    (release.platforms ?? []) as ReleasePlatform[],
  );
  const [milestoneId, setMilestoneId] = useState(release.milestone?.id ?? "");
  const [hotfixOfId, setHotfixOfId] = useState(release.hotfixOf?.id ?? "");

  const update = useUpdateRelease(release.id);
  const recommend = useRecommendVersion(release.projectId, release.id);
  const { data: milestones } = useProjectMilestones(release.projectId);
  const { data: projectReleases } = useReleases(release.projectId);
  const hotfixCandidates = useMemo(
    () =>
      (projectReleases ?? [])
        .filter((r) => r.status === "released" && r.id !== release.id)
        .sort((a, b) => b.version.localeCompare(a.version)),
    [projectReleases, release.id],
  );

  const togglePlatform = (p: ReleasePlatform) =>
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );

  const save = () => {
    update.mutate(
      {
        version: version.trim(),
        name: name.trim() || undefined,
        plannedAt: plannedAt ? plannedAt.toISOString() : null,
        platforms,
        milestoneId: milestoneId || null,
        hotfixOfId: hotfixOfId || null,
      },
      {
        onSuccess: () => {
          toast.success(t("release.meta.saved"));
          onDone();
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <div className="space-y-3" data-testid="release-meta-form">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-content-text">
            {t("release.create.version")}
          </label>
          <div className="flex gap-2">
            <Input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="h-8 font-mono text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0 text-xs"
              disabled={recommend.isPending}
              onClick={() =>
                recommend.mutate(undefined, {
                  onSuccess: (r) => setVersion(r.recommended),
                  onError: (err) => toast.error((err as Error).message),
                })
              }
            >
              {t("release.create.recommend")}
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-content-text">
            {t("release.create.nameLabel")}
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-content-text">
            {t("release.create.plannedAt")}
          </label>
          <DatePicker
            value={plannedAt}
            onValueChange={setPlannedAt}
            buttonClassName="h-8 w-full text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-content-text">
            {t("release.create.hotfixOf")}
          </label>
          <SelectField
            value={hotfixOfId}
            onChange={(e) => setHotfixOfId(e.target.value)}
            disabled={hotfixCandidates.length === 0}
            className="h-8 w-full text-xs"
          >
            <option value="">{t("release.create.hotfixNone")}</option>
            {hotfixCandidates.map((r) => (
              <option key={r.id} value={r.id}>
                v{r.version}
                {r.name ? ` ${r.name}` : ""}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-content-text">
            {t("release.create.milestoneLabel")}
          </label>
          <SelectField
            value={milestoneId}
            onChange={(e) => setMilestoneId(e.target.value)}
            className="h-8 w-full text-xs"
          >
            <option value="">{t("release.create.milestoneNone")}</option>
            {(milestones ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="space-y-1.5" data-testid="release-meta-platforms">
          <label className="text-xs font-medium text-content-text">
            {t("release.create.platforms")}
          </label>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-1">
            {RELEASE_PLATFORMS.map((p) => (
              <label
                key={p}
                className="flex cursor-pointer items-center gap-1.5 text-xs text-content-text"
              >
                <Checkbox
                  checked={platforms.includes(p)}
                  onCheckedChange={() => togglePlatform(p)}
                />
                {RELEASE_PLATFORM_LABELS[p]}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={update.isPending}
          onClick={onDone}
        >
          {t("common.cancel")}
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs"
          disabled={update.isPending || !version.trim()}
          onClick={save}
          data-testid="release-meta-save"
        >
          {update.isPending ? <Spinner className="size-3" /> : null}
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
