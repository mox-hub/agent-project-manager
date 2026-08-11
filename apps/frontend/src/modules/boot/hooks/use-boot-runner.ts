import { useCallback, useMemo, useRef, useState } from 'react';
import { bootChecks, buildBootContext } from '../api/boot-checks';
import { formatBootLog } from '../lib/log-formatter';
import type {
  BootEnvironment,
  BootErrorEntry,
  BootRunnerApi,
  BootRunnerState,
  BootRuntimeState,
} from '../types';

const SKIP_STORAGE_KEY = 'apm:boot:skip-next-time';

function readEnvironment(): BootEnvironment {
  const env = import.meta.env;
  return {
    showBoot: env.VITE_SHOW_STARTUP_SCREEN === 'true',
    isFirstRun: env.VITE_FIRST_RUN === 'true',
    skipStored: typeof window !== 'undefined' && localStorage.getItem(SKIP_STORAGE_KEY) === 'true',
  };
}

function buildInitialSteps(): BootRuntimeState[] {
  return bootChecks.map((check) => ({
    id: check.id,
    title: check.title,
    description: check.description,
    status: 'pending' as const,
  }));
}

function captureErrorContext(stepId: string, stepTitle: string, error: unknown): BootErrorEntry {
  const isError = error instanceof Error;
  const stack = isError ? error.stack : undefined;
  const message = isError ? error.message : String(error);
  const env = import.meta.env;

  return {
    id: `${stepId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    stepId,
    stepTitle,
    message,
    stack,
    timestamp: new Date().toISOString(),
    context: {
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
      mode: env.MODE,
      url: typeof window !== 'undefined' ? window.location.pathname : '/',
      apiBaseUrl: env.VITE_API_BASE_URL || '/_api',
      isTauri: !!window.__TAURI__,
    },
  };
}

export function useBootRunner(): BootRunnerApi {
  const environment = useMemo<BootEnvironment>(() => readEnvironment(), []);

  const [state, setState] = useState<BootRunnerState>(() => ({
    steps: buildInitialSteps(),
    progress: 0,
    isRunning: false,
    allDone: false,
    authenticated: false,
    errors: [],
    startedAt: 0,
  }));

  const [skipStored, setSkipStored] = useState<boolean>(environment.skipStored);

  // Note: no useEffect abort cleanup here.
  // React.StrictMode (dev) simulates unmount/remount which would otherwise
  // abort the AbortController mid-loop. The component lifecycle handles
  // disposal: when BootPage unmounts, any further setState calls are no-ops.
  const runIdRef = useRef(0);

  const runCheck = useCallback(
    async (
      stepId: string,
      runId: number,
    ): Promise<void> => {
      const check = bootChecks.find((c) => c.id === stepId);
      if (!check) return;
      if (runId !== runIdRef.current) return;

      setState((prev) => {
        if (!prev.isRunning) return prev;
        return {
          ...prev,
          steps: prev.steps.map((step) =>
            step.id === stepId
              ? { ...step, status: 'running', startedAt: Date.now(), finishedAt: undefined }
              : step,
          ),
        };
      });

      const ctx = buildBootContext(new AbortController().signal);
      try {
        if (check.skipIf?.(ctx)) {
          setState((prev) => ({
            ...prev,
            steps: prev.steps.map((step) =>
              step.id === stepId
                ? {
                    ...step,
                    status: 'skipped',
                    detail: '当前环境无需执行',
                    finishedAt: Date.now(),
                  }
                : step,
            ),
          }));
          return;
        }

        const result = await check.run(ctx);
        if (runId !== runIdRef.current) return;
        setState((prev) => ({
          ...prev,
          steps: prev.steps.map((step) =>
            step.id === stepId
              ? {
                  ...step,
                  status: result.status,
                  detail: result.detail,
                  finishedAt: Date.now(),
                }
              : step,
          ),
          authenticated:
            stepId === 'probe-auth' && result.status === 'success' ? true : prev.authenticated,
        }));
      } catch (error) {
        const entry = captureErrorContext(stepId, check.title, error);
        setState((prev) => ({
          ...prev,
          steps: prev.steps.map((step) =>
            step.id === stepId
              ? {
                  ...step,
                  status: 'error',
                  detail: entry.message,
                  finishedAt: Date.now(),
                }
              : step,
          ),
          errors: [...prev.errors, entry],
        }));
      }
    },
    [],
  );

  const advanceProgress = useCallback((current: number, total: number) => {
    setState((prev) => ({ ...prev, progress: pct(current, total) }));
  }, []);

  const start = useCallback(async () => {
    // Each start() bumps runId; stale loops will early-return.
    runIdRef.current += 1;
    const runId = runIdRef.current;

    setState((prev) => ({
      ...prev,
      steps: buildInitialSteps(),
      progress: 0,
      isRunning: true,
      allDone: false,
      authenticated: false,
      errors: [],
      startedAt: Date.now(),
      finishedAt: undefined,
    }));

    const total = bootChecks.length;
    for (let i = 0; i < bootChecks.length; i += 1) {
      if (runId !== runIdRef.current) return;
      const check = bootChecks[i];
      await runCheck(check.id, runId);
      if (runId !== runIdRef.current) return;
      advanceProgress(i + 1, total);
    }

    setState((prev) => {
      if (runId !== runIdRef.current) return prev;
      return {
        ...prev,
        isRunning: false,
        allDone: true,
        finishedAt: Date.now(),
      };
    });
  }, [advanceProgress, runCheck]);

  const retry = useCallback(
    async (stepId: string) => {
      runIdRef.current += 1;
      const runId = runIdRef.current;
      const hadErrors = state.errors.length > 0;
      if (hadErrors) {
        setState((prev) => ({
          ...prev,
          errors: prev.errors.filter((err) => err.stepId !== stepId),
        }));
      }
      await runCheck(stepId, runId);
    },
    [runCheck, state.errors.length],
  );

  const toggleSkipNextTime = useCallback((value: boolean) => {
    setSkipStored(value);
    if (typeof window !== 'undefined') {
      if (value) {
        localStorage.setItem(SKIP_STORAGE_KEY, 'true');
      } else {
        localStorage.removeItem(SKIP_STORAGE_KEY);
      }
    }
  }, []);

  const formatLogs = useCallback(() => formatBootLog(state.errors), [state.errors]);

  return {
    state,
    environment: { ...environment, skipStored },
    start,
    retry,
    toggleSkipNextTime,
    formatLogs,
  };
}

function pct(current: number, total: number): number {
  return total <= 0 ? 0 : Math.round((current / total) * 100);
}