import { describe, expect, it, afterEach } from 'vitest';
import {
  DOCK_ROOT_ATTR,
  hasOpenInnerLayer,
  isWithinAiCollabSurface,
} from './floating-layers';

/** 挂一段 HTML 到 body，返回其中待测节点 */
function mount(html: string): { host: HTMLElement; target: Element } {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  return { host, target: host.firstElementChild as Element };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('isWithinAiCollabSurface', () => {
  it('Dock 根节点及其子元素判定为「交互面内」', () => {
    const { host, target } = mount(
      `<div ${DOCK_ROOT_ATTR}=""><button id="dock-btn">新建</button></div>`,
    );
    expect(isWithinAiCollabSurface(target)).toBe(true);
    expect(isWithinAiCollabSurface(host.querySelector('#dock-btn'))).toBe(true);
  });

  it('AI 对话浮窗及其内部按钮（含决策侧栏收起按钮）判定为「交互面内」', () => {
    const { host, target } = mount(
      `<div data-ai-component="assistant.fab-window">
         <div data-ai-component="assistant.decision-wing">
           <button data-ai-action="assistant.decision.collapse.click">收起</button>
         </div>
       </div>`,
    );
    expect(isWithinAiCollabSurface(target)).toBe(true);
    expect(
      isWithinAiCollabSurface(
        host.querySelector('[data-ai-action="assistant.decision.collapse.click"]'),
      ),
    ).toBe(true);
  });

  it('就地问答浮层（AISlot，Portal 到 body）判定为「交互面内」', () => {
    const { target } = mount(
      '<div data-ai-component="assistant.inline-slot"><p>解释卡</p></div>',
    );
    expect(isWithinAiCollabSurface(target)).toBe(true);
  });

  it('Portal 弹出的内层浮层（弹窗/下拉/选择器）判定为「交互面内」', () => {
    const cases = [
      '<div data-slot="popover-content"><button>x</button></div>',
      '<div data-slot="dialog-content"><button>x</button></div>',
      '<div data-slot="dropdown-menu-content"><button>x</button></div>',
      '<div data-slot="select-content"><button>x</button></div>',
      '<div role="menu"><button>x</button></div>',
    ];
    for (const html of cases) {
      const { host, target } = mount(html);
      expect(isWithinAiCollabSurface(target), html).toBe(true);
      expect(isWithinAiCollabSurface(host.querySelector('button')), html).toBe(true);
    }
  });

  it('面外的普通页面元素判定为「面外」（应触发关闭）', () => {
    const { host, target } = mount('<div><button id="page-btn">普通按钮</button></div>');
    expect(isWithinAiCollabSurface(target)).toBe(false);
    expect(isWithinAiCollabSurface(host.querySelector('#page-btn'))).toBe(false);
    expect(isWithinAiCollabSurface(document.body)).toBe(false);
  });

  it('非节点目标（null / 纯对象）安全返回 false', () => {
    expect(isWithinAiCollabSurface(null)).toBe(false);
    expect(isWithinAiCollabSurface({} as unknown as EventTarget)).toBe(false);
  });
});

describe('hasOpenInnerLayer', () => {
  it('无浮层时为 false', () => {
    mount('<div><button>x</button></div>');
    expect(hasOpenInnerLayer()).toBe(false);
  });

  it('存在 Portal 浮层时为 true', () => {
    mount('<div data-slot="popover-content">模型选择器</div>');
    expect(hasOpenInnerLayer()).toBe(true);
  });

  it('AI 对话浮窗自身（role=dialog 但无浮层 slot）不算内层浮层', () => {
    mount('<div role="dialog" data-ai-component="assistant.fab-window"></div>');
    expect(hasOpenInnerLayer()).toBe(false);
  });
});
