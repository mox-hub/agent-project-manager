/**
 * 发版详情页（CAP-K-03 驱动型发版主链路）。
 * 状态机：draft（圈范围/AI 起草）→ gate → gated（审批卡/打回）→ approved
 * → publishing（轮询执行日志）→ released / failed（可重开）。
 * 门禁快照与发布执行日志来自服务端只读证据聚合，本页不做第二套判定。
 * 详情页改版：左栏 SectionScrubber 竖排栏目导航 + 状态条下 ReleaseMetaBar
 * 基础信息胶囊组（draft 可编辑）+ 发版说明换 PromptEditor 块级所见即所得。
 */
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  CheckCircle2,
  CircleDashed,
  CalendarClock,
  FileText,
  Rocket,
  Sparkles,
  XCircle,
} from "lucide-react";
import { PageShell } from "@/components/semantic/page-shell";
import { SubPageToolbar } from "@/components/semantic/sub-page-toolbar";
import {
  SectionScrubber,
  type ScrubberSection,
} from "@/components/semantic/section-scrubber";
import { PromptEditor } from "@/shared/components/prompt-editor";
import { MarkdownView } from "@/shared/components/markdown-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkeletonCard } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
} from "@/components/ui/stepper";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import {
  useApprovalRequest,
  useGateRelease,
  usePublishRelease,
  useRejectRelease,
  useRelease,
  useReopenRelease,
  useUpdateRelease,
} from "../hooks/use-releases";
import { ReleaseNotesDraftDialog } from "../components/release-notes-draft-dialog";
import { ReleaseTraceSection } from "../components/release-trace-section";
import { ReleaseDeliverablesCard } from "../components/release-deliverables-card";
import { ReleaseMetaBar } from "../components/release-meta-bar";
import { releaseApi } from "../api/release-api";
import { RELEASE_STATUS_TONE, statusLabelKey } from "../release-status-meta";
import type {
  ExecutionStep,
  GateCheck,
  ReleaseRecord,
  ReleaseStatus,
} from "../api/release-api";
import { cn } from "@/lib/utils";

const STATUS_FLOW: ReleaseStatus[] = [
  "draft",
  "gated",
  "approved",
  "publishing",
  "released",
];

/**
 * 「范围为空跳过」检查项的 detail 文案（服务端固定输出，快照只读）。
 * 服务端 GateCheck.passed 仅二值——ci/audit 空范围置 false、acceptance 空真置 true，
 * 前端据此归类为跳过态统一中性渲染，避免同为跳过语义却红绿不一。
 */
const GATE_EMPTY_SCOPE_CHECK_DETAILS = new Set([
  "范围为空，跳过",
  "范围内 0 条工单验收全部通过或豁免",
]);

/** 非范围原因的跳过（无工作区）：服务端 detail 已自述原因，保留原文仅中和视觉 */
const GATE_OTHER_SKIP_CHECK_DETAILS = new Set([
  "项目无工作区，发布时将诚实跳过导出",
]);

export function ReleaseDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const releaseQuery = useRelease(id);
  const release = releaseQuery.data;
  // AI 起草说明对话框（CAP-A-18 样板推广二）：draft 态入口，
  // 生成/编辑/确认都在对话框内，页面 notes 只在确认写回后经 query 失效刷新
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  // CHANGELOG 再生文本预览（批四）：只读不写文件，任意状态可看
  const [changelogOpen, setChangelogOpen] = useState(false);

  const gate = useGateRelease(release?.id ?? "");
  const approval = useApprovalRequest(release?.id ?? "");
  const publish = usePublishRelease(release?.id ?? "");
  const reject = useRejectRelease(release?.id ?? "");
  const reopen = useReopenRelease(release?.id ?? "");

  // 左栏栏目导航（执行日志无内容时不注册该节，锚点与卡片一一对应）
  const hasExecutionLog = !!release?.executionLog?.length;
  const sections = useMemo<ScrubberSection[]>(
    () => [
      { id: "release-detail-status", label: t("release.detail.secStatus") },
      { id: "release-detail-meta", label: t("release.detail.secMeta") },
      { id: "release-detail-notes", label: t("release.detail.secNotes") },
      {
        id: "release-detail-deliverables",
        label: t("release.detail.secDeliverables"),
      },
      { id: "release-detail-trace", label: t("release.detail.secTrace") },
      { id: "release-detail-gate", label: t("release.gate.title") },
      { id: "release-detail-action", label: t("release.action.title") },
      ...(hasExecutionLog
        ? [{ id: "release-detail-log", label: t("release.detail.logTitle") }]
        : []),
    ],
    [t, hasExecutionLog],
  );

  return (
    <PageShell className="overflow-hidden" aiPage="releases.detail">
      <SubPageToolbar
        aiId="releases.detail"
        onBack={() =>
          navigate(
            release
              ? `/app/releases?project=${release.projectId}`
              : "/app/releases",
          )
        }
        breadcrumbs={[
          { label: t("nav.releases", "发版交付"), to: "/app/releases" },
          {
            label: release
              ? `v${release.version}`
              : t("release.detail.loading"),
          },
        ]}
        actions={
          release ? (
            <Badge
              variant="secondary"
              className={cn(
                "shrink-0 text-3xs",
                RELEASE_STATUS_TONE[release.status],
              )}
            >
              {t(statusLabelKey(release.status))}
            </Badge>
          ) : null
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* 左栏栏目导航（详情页改版）：竖排 section chips，md 以下收起 */}
        <aside className="hidden w-30 shrink-0 border-r border-border py-4 pl-5 pr-1 md:block">
          <SectionScrubber orientation="vertical" sections={sections} />
        </aside>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl space-y-4 px-6 py-5 sm:px-8">
            {releaseQuery.isLoading || !release ? (
              <SkeletonCard className="h-64" />
            ) : (
              <>
                {/* 状态机进度链（纯展示指示器式；publishing 步 loading，failed 不在链上另挂徽章） */}
                <div id="release-detail-status">
                  <Card>
                    <CardContent className="flex items-center gap-2 p-4">
                      <Stepper
                        value={Math.max(
                          STATUS_FLOW.indexOf(release.status) + 1,
                          1,
                        )}
                        className="flex-1"
                        indicators={{
                          completed: <Check className="size-3" />,
                          loading: (
                            <Spinner
                              size="sm"
                              className="size-3.5 text-primary-foreground"
                            />
                          ),
                        }}
                      >
                        <StepperNav>
                          {STATUS_FLOW.map((s, i) => (
                            <StepperItem
                              key={s}
                              step={i + 1}
                              loading={
                                release.status === "publishing" &&
                                s === "publishing"
                              }
                            >
                              <div className="flex items-center gap-2">
                                <StepperIndicator className="size-5 text-3xs font-medium">
                                  {i + 1}
                                </StepperIndicator>
                                <StepperTitle className="text-xs whitespace-nowrap">
                                  {t(statusLabelKey(s))}
                                </StepperTitle>
                              </div>
                              {i < STATUS_FLOW.length - 1 && (
                                <StepperSeparator />
                              )}
                            </StepperItem>
                          ))}
                        </StepperNav>
                      </Stepper>
                      {release.status === "failed" ? (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "shrink-0 text-3xs",
                            RELEASE_STATUS_TONE.failed,
                          )}
                        >
                          {t(statusLabelKey("failed"))}
                        </Badge>
                      ) : null}
                    </CardContent>
                  </Card>
                </div>

                {release.failureReason ? (
                  <Alert variant="destructive">
                    <XCircle className="size-4" />
                    <AlertTitle>{t("release.detail.failureTitle")}</AlertTitle>
                    <AlertDescription className="text-xs">
                      {release.failureReason}
                    </AlertDescription>
                  </Alert>
                ) : null}

                {/* 基础信息胶囊组（详情页改版）：draft 态可就地编辑版本/名称/计划/平台/里程碑/热修 */}
                <div id="release-detail-meta">
                  <ReleaseMetaBar release={release} />
                </div>

                {/* 发版说明（详情页改版）：PromptEditor 块级所见即所得——draft 可编辑，
                  其他状态只读渲染；AI 起草对话框保留（诚实缺口层+来源展开是范式资产） */}
                <div id="release-detail-notes">
                  <Card>
                    <CardHeader className="flex-row items-center justify-between space-y-0">
                      <CardTitle className="flex items-center gap-1.5 text-sm">
                        <Rocket className="size-4 text-accent-green" />
                        {t("release.detail.notesTitle")}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {release.status === "draft" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setNotesDialogOpen(true)}
                          >
                            <Sparkles className="mr-1 size-3 text-accent-purple" />
                            {t("release.detail.aiDraft")}
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setChangelogOpen(true)}
                        >
                          <FileText className="mr-1 size-3 text-content-text-muted" />
                          {t("release.detail.changelogPreview")}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <NotesEditor release={release} />
                      <UpgradeNotesBlock release={release} />
                    </CardContent>
                  </Card>
                </div>

                {/* AI 起草说明对话框（draft 态「AI 起草」按钮触发） */}
                {release ? (
                  <ReleaseNotesDraftDialog
                    release={release}
                    open={notesDialogOpen}
                    onOpenChange={setNotesDialogOpen}
                  />
                ) : null}

                {/* CHANGELOG 再生预览（批四：只读不写文件） */}
                <ChangelogPreviewDialog
                  releaseId={release.id}
                  open={changelogOpen}
                  onOpenChange={setChangelogOpen}
                />

                {/* 交付成果清单（CAP-K-03 批二）：交付了什么/在哪拿/怎么验证/限制/接收人 */}
                <div id="release-detail-deliverables">
                  <ReleaseDeliverablesCard release={release} />
                </div>

                {/* 前因后果：圈定任务 → 实时验收 + 执行运行记录（draft 态可编辑范围） */}
                <div id="release-detail-trace">
                  <ReleaseTraceSection release={release} />
                </div>

                {/* 门禁 */}
                <div id="release-detail-gate">
                  <GateCard
                    releaseId={release.id}
                    status={release.status}
                    checks={release.gateResult?.checks ?? []}
                    ranAt={release.gateResult?.ranAt}
                    gatePending={gate.isPending}
                    onGate={() =>
                      gate.mutate(undefined, {
                        onError: (err) => toast.error((err as Error).message),
                      })
                    }
                  />
                </div>

                {/* 审批与发布动作 */}
                <div id="release-detail-action">
                  <ActionCard
                    releaseId={release.id}
                    status={release.status}
                    approvalPending={approval.isPending}
                    publishPending={publish.isPending}
                    rejectPending={reject.isPending}
                    reopenPending={reopen.isPending}
                    onApproval={() =>
                      approval.mutate(undefined, {
                        onSuccess: () =>
                          toast.success(t("release.detail.approvalSent")),
                        onError: (err) => toast.error((err as Error).message),
                      })
                    }
                    onPublish={() =>
                      publish.mutate(undefined, {
                        onSuccess: () =>
                          toast.success(t("release.detail.publishDone")),
                        onError: (err) => toast.error((err as Error).message),
                      })
                    }
                    onReject={() =>
                      reject.mutate(undefined, {
                        onSuccess: () =>
                          toast.success(t("release.detail.rejected")),
                        onError: (err) => toast.error((err as Error).message),
                      })
                    }
                    onReopen={() =>
                      reopen.mutate(undefined, {
                        onSuccess: () =>
                          toast.success(t("release.detail.reopened")),
                        onError: (err) => toast.error((err as Error).message),
                      })
                    }
                  />
                </div>

                {/* 发布执行日志 */}
                {release.executionLog && release.executionLog.length > 0 ? (
                  <div id="release-detail-log">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                          {t("release.detail.logTitle")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {release.executionLog.map((step, i) => (
                          <ExecutionStepRow
                            key={`${step.step}-${i}`}
                            step={step}
                          />
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

/**
 * 发版说明编辑器（详情页改版）：draft 态 PromptEditor 块级所见即所得
 * （固定高度 240 + 拖拽手柄），保存走 updateDraft {notes}；其他状态只读
 * MarkdownView 渲染。外部写回（AI 起草对话框确认）经 query 刷新后同步进编辑器。
 */
function NotesEditor({ release }: { release: ReleaseRecord }) {
  const { t } = useTranslation();
  const update = useUpdateRelease(release.id);
  const isDraft = release.status === "draft";
  const [value, setValue] = useState(release.notes ?? "");

  // AI 起草对话框确认写回后 release.notes 更新，同步进编辑态草稿
  useEffect(() => {
    setValue(release.notes ?? "");
  }, [release.notes]);

  if (!isDraft) {
    return (
      <PromptEditor
        value={release.notes ?? ""}
        readOnly
        maxHeight={480}
        placeholder={t("release.detail.noNotes")}
      />
    );
  }

  const dirty = value.trim() !== (release.notes ?? "");
  return (
    <PromptEditor
      value={value}
      onChange={setValue}
      height={240}
      placeholder={t("release.detail.notesPlaceholder")}
      actions={
        <Button
          size="sm"
          className="h-6 text-xs"
          disabled={!dirty || update.isPending}
          onClick={() =>
            update.mutate(
              { notes: value.trim() },
              {
                onSuccess: () => toast.success(t("release.detail.notesSaved")),
                onError: (err) => toast.error((err as Error).message),
              },
            )
          }
          data-testid="release-notes-save"
        >
          {update.isPending ? <Spinner className="size-3" /> : null}
          {t("common.save")}
        </Button>
      }
    />
  );
}

function GateCard({
  releaseId,
  status,
  checks,
  ranAt,
  gatePending,
  onGate,
}: {
  releaseId: string;
  status: ReleaseStatus;
  checks: GateCheck[];
  ranAt?: string;
  gatePending: boolean;
  onGate: () => void;
}) {
  const { t } = useTranslation();
  void releaseId;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">{t("release.gate.title")}</CardTitle>
        {status === "draft" ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={gatePending}
            onClick={onGate}
          >
            <Check className="mr-1 size-3" />
            {t("release.gate.submit")}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {ranAt ? (
          <p className="text-2xs text-content-text-muted">
            {t("release.gate.ranAt")} {new Date(ranAt).toLocaleString()}
          </p>
        ) : (
          <p className="text-xs text-content-text-muted">
            {t("release.gate.notRun")}
          </p>
        )}
        {checks.length > 0 ? (
          <ul className="space-y-1.5">
            {checks.map((c) => (
              <GateCheckRow key={c.key} check={c} />
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

function GateCheckRow({ check }: { check: GateCheck }) {
  const { t } = useTranslation();
  const skippedEmptyScope = GATE_EMPTY_SCOPE_CHECK_DETAILS.has(check.detail);
  const skipped =
    skippedEmptyScope || GATE_OTHER_SKIP_CHECK_DETAILS.has(check.detail);
  return (
    <li
      className={cn(
        "flex items-start gap-2 text-xs",
        skipped && "text-content-text-muted",
      )}
    >
      {skipped ? (
        // 跳过态：中性灰 + 虚线圈（与执行日志 skipped 步骤同视觉语言）
        <CircleDashed className="mt-0.5 size-3.5 shrink-0 text-content-text-muted" />
      ) : check.passed ? (
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-accent-green" />
      ) : (
        <XCircle className="mt-0.5 size-3.5 shrink-0 text-accent-red" />
      )}
      <span>
        <span className="font-medium">{check.label}</span>
        <span className="ml-2 text-content-text-muted">
          {skippedEmptyScope
            ? t("release.gate.skippedEmptyScope")
            : check.detail}
        </span>
      </span>
    </li>
  );
}

function ActionCard({
  releaseId,
  status,
  approvalPending,
  publishPending,
  rejectPending,
  reopenPending,
  onApproval,
  onPublish,
  onReject,
  onReopen,
}: {
  releaseId: string;
  status: ReleaseStatus;
  approvalPending: boolean;
  publishPending: boolean;
  rejectPending: boolean;
  reopenPending: boolean;
  onApproval: () => void;
  onPublish: () => void;
  onReject: () => void;
  onReopen: () => void;
}) {
  const { t } = useTranslation();
  void releaseId;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t("release.action.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        {status === "draft" ? (
          <p className="text-xs text-content-text-muted">
            {t("release.action.draftHint")}
          </p>
        ) : null}
        {status === "gated" ? (
          <>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={approvalPending}
              onClick={onApproval}
            >
              {t("release.action.requestApproval")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={rejectPending}
              onClick={onReject}
            >
              {t("release.action.reject")}
            </Button>
          </>
        ) : null}
        {status === "approved" ? (
          <>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={publishPending}
              onClick={onPublish}
            >
              {t("release.action.publish")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={rejectPending}
              onClick={onReject}
            >
              {t("release.action.reject")}
            </Button>
          </>
        ) : null}
        {status === "failed" ? (
          <Button
            size="sm"
            className="h-7 text-xs"
            disabled={reopenPending}
            onClick={onReopen}
          >
            {t("release.action.reopen")}
          </Button>
        ) : null}
        {status === "publishing" ? (
          <p className="text-xs text-content-text-muted">
            {t("release.action.publishingHint")}
          </p>
        ) : null}
        {status === "released" ? (
          <p className="flex items-center gap-1 text-xs text-accent-green">
            <CheckCircle2 className="size-3.5" />
            {t("release.action.releasedHint")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ExecutionStepRow({ step }: { step: ExecutionStep }) {
  const tone =
    step.status === "ok"
      ? "text-accent-green"
      : step.status === "failed"
        ? "text-accent-red"
        : "text-content-text-muted";
  return (
    <div className="flex items-start gap-2 text-xs">
      {step.status === "ok" ? (
        <CheckCircle2 className={cn("mt-0.5 size-3.5 shrink-0", tone)} />
      ) : step.status === "failed" ? (
        <XCircle className={cn("mt-0.5 size-3.5 shrink-0", tone)} />
      ) : (
        <CircleDashed className={cn("mt-0.5 size-3.5 shrink-0", tone)} />
      )}
      <span>
        <span className="font-mono font-medium">{step.step}</span>
        <span className="ml-2 text-content-text-muted">{step.detail}</span>
      </span>
    </div>
  );
}

/**
 * 升级/迁移注意事项（CAP-K-03 批三）：有内容即渲染；草案态可补充编辑
 * （major 版本门禁 upgrade-notes 检查会注记缺失）——编辑走 updateDraft
 * 只改 upgradeNotes 字段，保存后 query 失效刷新。
 */
function UpgradeNotesBlock({ release }: { release: ReleaseRecord }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const update = useUpdateRelease(release.id);
  const isDraft = release.status === "draft";

  const startEdit = () => {
    setDraft(release.upgradeNotes ?? "");
    setEditing(true);
  };

  const save = () => {
    update.mutate(
      { upgradeNotes: draft.trim() || undefined },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success(t("release.detail.upgradeNotesSaved"));
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <div
      className="border-t border-border pt-3"
      data-testid="release-upgrade-notes"
    >
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-2xs font-medium text-content-text-muted">
          <CalendarClock className="size-3" />
          {t("release.detail.upgradeNotes")}
        </p>
        {isDraft ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-2xs"
            onClick={startEdit}
          >
            {release.upgradeNotes
              ? t("release.detail.upgradeNotesEdit")
              : t("release.detail.upgradeNotesAdd")}
          </Button>
        ) : null}
      </div>
      {editing ? (
        <div className="mt-1.5 space-y-2">
          <PromptEditor
            value={draft}
            onChange={setDraft}
            height={160}
            placeholder={t("release.detail.upgradeNotesPlaceholder")}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setEditing(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={update.isPending}
              onClick={save}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      ) : release.upgradeNotes ? (
        <div className="mt-1.5 text-xs leading-relaxed text-content-text">
          <MarkdownView content={release.upgradeNotes} />
        </div>
      ) : (
        <p className="mt-1 text-2xs text-content-text-muted">
          {t("release.detail.upgradeNotesEmpty")}
        </p>
      )}
    </div>
  );
}

/**
 * CHANGELOG 再生文本预览（CAP-K-03 批四）：GET /releases/:id/changelog-preview
 * 只读拉取项目级再生文本，不写工作区文件——「Release 实体 = CHANGELOG 唯一真相、
 * 单向再生」卖点的可见面。打开时才请求。
 */
function ChangelogPreviewDialog({
  releaseId,
  open,
  onOpenChange,
}: {
  releaseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const preview = useQuery({
    queryKey: ["release-changelog-preview", releaseId],
    enabled: open && !!releaseId,
    queryFn: () => releaseApi.changelogPreview(releaseId!),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-dialog-scroll overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {t("release.detail.changelogTitle")}
          </DialogTitle>
          <DialogDescription className="text-2xs">
            {t("release.detail.changelogHint")}
          </DialogDescription>
        </DialogHeader>
        {preview.isLoading ? (
          <p className="py-6 text-center text-xs text-content-text-muted">
            {t("release.detail.loading")}
          </p>
        ) : preview.isError ? (
          <p className="py-6 text-center text-xs text-accent-red">
            {t("release.detail.changelogLoadFailed")}
          </p>
        ) : (
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 font-mono text-2xs leading-relaxed text-content-text">
            {preview.data?.content}
          </pre>
        )}
      </DialogContent>
    </Dialog>
  );
}
