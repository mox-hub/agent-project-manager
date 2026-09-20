export type BootStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

export interface BootCheckResult {
  status: 'success' | 'skipped';
  detail?: string;
}

export interface BootContext {
  isDesktopShell: boolean;
  hasToken: boolean;
  apiBaseUrl: string;
  signal: AbortSignal;
}

export interface BootCheck {
  id: string;
  title: string;
  description: string;
  run: (ctx: BootContext) => Promise<BootCheckResult>;
  /** 返回 true = 跳过（通用文案）；返回原因串（如 'desktop-only' | 'no-token'）= 跳过并如实说明原因 */
  skipIf?: (ctx: BootContext) => boolean | string;
}

export interface BootRuntimeState {
  id: string;
  title: string;
  description: string;
  status: BootStatus;
  detail?: string;
  startedAt?: number;
  finishedAt?: number;
}

export interface BootErrorEntry {
  id: string;
  stepId: string;
  stepTitle: string;
  message: string;
  stack?: string;
  timestamp: string;
  context: {
    platform: string;
    mode: string;
    url: string;
    apiBaseUrl: string;
    isDesktopShell: boolean;
  };
}

export interface BootRunnerState {
  steps: BootRuntimeState[];
  progress: number;
  isRunning: boolean;
  allDone: boolean;
  authenticated: boolean;
  errors: BootErrorEntry[];
  startedAt: number;
  finishedAt?: number;
}

export interface BootEnvironment {
  showBoot: boolean;
  isFirstRun: boolean;
  skipStored: boolean;
}

export interface BootRunnerApi {
  state: BootRunnerState;
  environment: BootEnvironment;
  start: () => Promise<void>;
  retry: (stepId: string) => Promise<void>;
  toggleSkipNextTime: (value: boolean) => void;
  formatLogs: () => string;
}