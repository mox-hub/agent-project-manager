import { beforeEach, describe, expect, it } from 'vitest';
import { useTourStore, type TourDefinition } from './use-tour-store';

const mockTour: TourDefinition = {
  id: 'test-tour',
  title: '测试导览',
  steps: [
    { id: 'step-1', target: '#target-1', title: '步骤1', description: '内容1' },
    { id: 'step-2', target: '#target-2', title: '步骤2', description: '内容2' },
    { id: 'step-3', target: '#target-3', title: '步骤3', description: '内容3' },
  ],
};

describe('useTourStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useTourStore.setState({
      activeTourId: null,
      currentStepIndex: 0,
      isOverviewOpen: false,
      registeredTours: {},
      records: {},
    });
  });

  it('应该能够成功注册导览', () => {
    useTourStore.getState().registerTour(mockTour);
    expect(useTourStore.getState().registeredTours['test-tour']).toEqual(mockTour);
  });

  it('启动导览并按顺序前进与后退', () => {
    useTourStore.getState().registerTour(mockTour);
    useTourStore.getState().startTour('test-tour');

    expect(useTourStore.getState().activeTourId).toBe('test-tour');
    expect(useTourStore.getState().currentStepIndex).toBe(0);

    // 下一步
    useTourStore.getState().nextStep();
    expect(useTourStore.getState().currentStepIndex).toBe(1);

    // 下一步
    useTourStore.getState().nextStep();
    expect(useTourStore.getState().currentStepIndex).toBe(2);

    // 上一步
    useTourStore.getState().prevStep();
    expect(useTourStore.getState().currentStepIndex).toBe(1);

    // 直接跳转
    useTourStore.getState().goToStep(0);
    expect(useTourStore.getState().currentStepIndex).toBe(0);
  });

  it('在最后一步执行 nextStep 会完成导览并更新持久化记录', () => {
    useTourStore.getState().registerTour(mockTour);
    useTourStore.getState().startTour('test-tour');
    useTourStore.getState().goToStep(2);

    useTourStore.getState().nextStep();

    expect(useTourStore.getState().activeTourId).toBeNull();
    const progress = useTourStore.getState().getTourProgress('test-tour');
    expect(progress?.completed).toBe(true);
    expect(progress?.skipped).toBe(false);
  });

  it('支持主动跳过导览并记录状态', () => {
    useTourStore.getState().registerTour(mockTour);
    useTourStore.getState().startTour('test-tour');
    useTourStore.getState().nextStep(); // step 1

    useTourStore.getState().skipTour();

    expect(useTourStore.getState().activeTourId).toBeNull();
    const progress = useTourStore.getState().getTourProgress('test-tour');
    expect(progress?.skipped).toBe(true);
    expect(progress?.completed).toBe(false);
    expect(progress?.currentStepIndex).toBe(1);
  });

  it('再次启动时若未完成支持恢复断点，或者 forceRestart 从头开始', () => {
    useTourStore.getState().registerTour(mockTour);
    useTourStore.getState().startTour('test-tour');
    useTourStore.getState().goToStep(2);
    useTourStore.getState().closeTour();

    // 默认恢复断点
    useTourStore.getState().startTour('test-tour');
    expect(useTourStore.getState().currentStepIndex).toBe(2);

    useTourStore.getState().closeTour();

    // forceRestart 从头开始
    useTourStore.getState().startTour('test-tour', { forceRestart: true });
    expect(useTourStore.getState().currentStepIndex).toBe(0);
  });

  it('支持重置导览进度', () => {
    useTourStore.getState().registerTour(mockTour);
    useTourStore.getState().startTour('test-tour');
    useTourStore.getState().completeTour();

    expect(useTourStore.getState().getTourProgress('test-tour')?.completed).toBe(true);

    useTourStore.getState().resetTourProgress('test-tour');
    expect(useTourStore.getState().getTourProgress('test-tour')).toBeUndefined();
  });

  it('支持切换全部进度面板状态', () => {
    expect(useTourStore.getState().isOverviewOpen).toBe(false);
    useTourStore.getState().toggleOverview();
    expect(useTourStore.getState().isOverviewOpen).toBe(true);
    useTourStore.getState().toggleOverview(false);
    expect(useTourStore.getState().isOverviewOpen).toBe(false);
  });
});
