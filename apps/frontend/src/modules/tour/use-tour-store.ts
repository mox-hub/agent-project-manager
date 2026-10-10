import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TourPlacementSide =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'inline-start'
  | 'inline-end';

export type TourPlacementAlign = 'start' | 'center' | 'end';

export interface TourStep {
  /** 步骤唯一标识 */
  id: string;
  /** 目标元素 CSS 选择器，例如 `[data-tour="project-header"]` */
  target: string;
  /** 步骤标题 */
  title: string;
  /** 步骤说明描述 */
  description: string;
  /** 弹出气泡吸附方位，默认 'bottom' */
  side?: TourPlacementSide;
  /** 弹出气泡对齐方式，默认 'center' */
  align?: TourPlacementAlign;
  /** 步骤分类/提示徽章，例如 "核心功能" */
  badge?: string;
  /** 聚光灯镂空边距 (px)，默认 8 */
  spotlightPadding?: number;
  /** 聚光灯镂空圆角 (px)，默认 8 */
  spotlightRadius?: number;
}

export interface TourDefinition {
  /** 导览唯一标识，例如 "project-dashboard-overview" */
  id: string;
  /** 导览业务名称 */
  title: string;
  /** 导览简述 */
  description?: string;
  /** 步骤列表 */
  steps: TourStep[];
}

export interface TourProgressRecord {
  tourId: string;
  /** 上次保存/停留的步骤索引 (0-based) */
  currentStepIndex: number;
  /** 是否已完整走完全部步骤 */
  completed: boolean;
  /** 是否由用户主动跳过 */
  skipped: boolean;
  /** 最近一次更新时间戳 (ms) */
  updatedAt: number;
}

export interface TourState {
  /** 当前正在运行的导览 ID，null 表示未开启 */
  activeTourId: string | null;
  /** 当前激活的步骤索引 (0-based) */
  currentStepIndex: number;
  /** 是否展开“全部进度总览面板” */
  isOverviewOpen: boolean;

  /** 动态注册的导览定义（内存态，不持久化） */
  registeredTours: Record<string, TourDefinition>;
  /** 各导览本地缓存的进度记录（LocalStorage 持久化） */
  records: Record<string, TourProgressRecord>;

  /** 注册或更新导览定义 */
  registerTour: (tour: TourDefinition) => void;
  /** 启动导览（支持断点继续或强制从头开始） */
  startTour: (
    tourId: string,
    options?: { forceRestart?: boolean; stepIndex?: number },
  ) => void;
  /** 前进到下一步 */
  nextStep: () => void;
  /** 返回上一步 */
  prevStep: () => void;
  /** 跳转到指定步骤 */
  goToStep: (index: number) => void;
  /** 跳过并结束当前导览 */
  skipTour: () => void;
  /** 完成当前导览 */
  completeTour: () => void;
  /** 关闭导览界面（保留进度断点） */
  closeTour: () => void;
  /** 重置某个导览的本地缓存进度 */
  resetTourProgress: (tourId: string) => void;
  /** 切换或设置全部进度面板的展开状态 */
  toggleOverview: (open?: boolean) => void;
  /** 读取指定导览的本地完成状态 */
  getTourProgress: (tourId: string) => TourProgressRecord | undefined;
}

export const useTourStore = create<TourState>()(
  persist(
    (set, get) => ({
      activeTourId: null,
      currentStepIndex: 0,
      isOverviewOpen: false,
      registeredTours: {},
      records: {},

      registerTour: (tour) => {
        set((state) => ({
          registeredTours: {
            ...state.registeredTours,
            [tour.id]: tour,
          },
        }));
      },

      startTour: (tourId, options) => {
        const { registeredTours, records } = get();
        const tour = registeredTours[tourId];
        if (!tour || tour.steps.length === 0) return;

        const record = records[tourId];
        let targetIndex = 0;

        if (typeof options?.stepIndex === 'number') {
          targetIndex = Math.max(0, Math.min(options.stepIndex, tour.steps.length - 1));
        } else if (!options?.forceRestart && record && !record.completed && record.currentStepIndex >= 0) {
          // 断点继续
          targetIndex = Math.min(record.currentStepIndex, tour.steps.length - 1);
        }

        set({
          activeTourId: tourId,
          currentStepIndex: targetIndex,
          isOverviewOpen: false,
        });

        // 记录更新时间
        set((state) => ({
          records: {
            ...state.records,
            [tourId]: {
              tourId,
              currentStepIndex: targetIndex,
              completed: false,
              skipped: false,
              updatedAt: Date.now(),
            },
          },
        }));
      },

      nextStep: () => {
        const { activeTourId, currentStepIndex, registeredTours, completeTour } = get();
        if (!activeTourId) return;
        const tour = registeredTours[activeTourId];
        if (!tour) return;

        if (currentStepIndex < tour.steps.length - 1) {
          const nextIndex = currentStepIndex + 1;
          set((state) => ({
            currentStepIndex: nextIndex,
            records: {
              ...state.records,
              [activeTourId]: {
                tourId: activeTourId,
                currentStepIndex: nextIndex,
                completed: false,
                skipped: false,
                updatedAt: Date.now(),
              },
            },
          }));
        } else {
          completeTour();
        }
      },

      prevStep: () => {
        const { activeTourId, currentStepIndex } = get();
        if (!activeTourId || currentStepIndex <= 0) return;
        const prevIndex = currentStepIndex - 1;
        set((state) => ({
          currentStepIndex: prevIndex,
          records: {
            ...state.records,
            [activeTourId]: {
              tourId: activeTourId,
              currentStepIndex: prevIndex,
              completed: false,
              skipped: false,
              updatedAt: Date.now(),
            },
          },
        }));
      },

      goToStep: (index) => {
        const { activeTourId, registeredTours } = get();
        if (!activeTourId) return;
        const tour = registeredTours[activeTourId];
        if (!tour) return;

        const safeIndex = Math.max(0, Math.min(index, tour.steps.length - 1));
        set((state) => ({
          currentStepIndex: safeIndex,
          records: {
            ...state.records,
            [activeTourId]: {
              tourId: activeTourId,
              currentStepIndex: safeIndex,
              completed: false,
              skipped: false,
              updatedAt: Date.now(),
            },
          },
        }));
      },

      skipTour: () => {
        const { activeTourId, currentStepIndex } = get();
        if (!activeTourId) return;
        set((state) => ({
          activeTourId: null,
          isOverviewOpen: false,
          records: {
            ...state.records,
            [activeTourId]: {
              tourId: activeTourId,
              currentStepIndex,
              completed: false,
              skipped: true,
              updatedAt: Date.now(),
            },
          },
        }));
      },

      completeTour: () => {
        const { activeTourId, registeredTours } = get();
        if (!activeTourId) return;
        const tour = registeredTours[activeTourId];
        const lastIndex = tour ? Math.max(0, tour.steps.length - 1) : 0;
        set((state) => ({
          activeTourId: null,
          isOverviewOpen: false,
          records: {
            ...state.records,
            [activeTourId]: {
              tourId: activeTourId,
              currentStepIndex: lastIndex,
              completed: true,
              skipped: false,
              updatedAt: Date.now(),
            },
          },
        }));
      },

      closeTour: () => {
        set({ activeTourId: null, isOverviewOpen: false });
      },

      resetTourProgress: (tourId) => {
        set((state) => {
          const newRecords = { ...state.records };
          delete newRecords[tourId];
          return { records: newRecords };
        });
      },

      toggleOverview: (open) => {
        set((state) => ({
          isOverviewOpen: typeof open === 'boolean' ? open : !state.isOverviewOpen,
        }));
      },

      getTourProgress: (tourId) => {
        return get().records[tourId];
      },
    }),
    {
      name: 'apm_tour_progress_storage',
      version: 1,
      partialize: (state) => ({
        records: state.records,
      }),
    },
  ),
);
