export type BootStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

export interface BootCheckResult {
  status: 'success' | 'skipped';
  detail?: string;
}

export interface BootContext {
  isTauri: boolean;
  hasToken: boolean;
  apiBaseUrl: string;
  signal: AbortSignal;
}

export interface BootCheck {
  id: string;
  title: string;
  description: string;
  run: (ctx: BootContext) => Promise<BootCheckResult>;
  skipIf?: (ctx: BootContext) => boolean;
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
    isTauri: boolean;
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