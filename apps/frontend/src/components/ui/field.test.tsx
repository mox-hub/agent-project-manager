import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from './field';

/**
 * E 类批 0 ②（2026-09-27）：`Field` 组合件的复核 + 缺口补齐。
 *
 * 复核结论：**「label + 描述 + 错误」三件套本文件已具备**（`FieldLabel` /
 * `FieldDescription` / `FieldError`），且 `FieldError` 自带去重与列表化——
 * 本批**未重写**任何既有组合件，只在 `field-label` 槽上补了 `size` / `variant`
 * 两根轴（依据：全库 178 个裸 `<label>` / 49 文件的形态聚类，见交付报告）。
 *
 * 测试口径遵宪法 §18.2：不断言 className（jsdom 不跑 Tailwind）；
 * 可测面 = 装配结果、可访问名、错误公告语义。
 */
describe('Field 组合件：label + 描述 + 错误（批 0 复核，未改动）', () => {
  it('三者可同时装配：label 关联控件、描述可被 aria-describedby 引用、错误以 alert 公告', () => {
    render(
      <Field data-invalid="true">
        <FieldLabel htmlFor="ws-name">工作区名称</FieldLabel>
        <FieldContent>
          <input
            id="ws-name"
            aria-describedby="ws-name-desc ws-name-err"
            aria-invalid="true"
          />
          <FieldDescription id="ws-name-desc">用于路由与数据目录名</FieldDescription>
          <FieldError id="ws-name-err" errors={[{ message: '不能为空' }]} />
        </FieldContent>
      </Field>,
    );

    const input = screen.getByLabelText('工作区名称');
    expect(input).toHaveAttribute('id', 'ws-name');
    expect(input).toHaveAttribute(
      'aria-describedby',
      'ws-name-desc ws-name-err',
    );
    expect(screen.getByText('用于路由与数据目录名')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('不能为空');
  });

  it('FieldError 无 errors 且无 children 时整体不渲染（不留空 alert 给读屏）', () => {
    const { container } = render(<FieldError errors={[]} />);

    expect(container.querySelector('[data-slot="field-error"]')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('FieldError 多条错误去重后渲染为列表，单条时直接输出文本', () => {
    const { unmount } = render(
      <FieldError
        errors={[{ message: '格式不正确' }, { message: '格式不正确' }]}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('格式不正确');
    unmount();

    render(
      <FieldError
        errors={[{ message: '格式不正确' }, { message: '长度超限' }]}
      />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('FieldSet / FieldLegend / FieldGroup / FieldSeparator 装配不吞内容', () => {
    render(
      <FieldSet>
        <FieldLegend>连接设置</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="host">主机</FieldLabel>
            <FieldContent>
              <input id="host" />
            </FieldContent>
          </Field>
          <FieldSeparator>或</FieldSeparator>
        </FieldGroup>
      </FieldSet>,
    );

    expect(screen.getByText('连接设置')).toBeInTheDocument();
    expect(screen.getByLabelText('主机')).toBeInTheDocument();
    expect(screen.getByText('或')).toBeInTheDocument();
  });
});

/**
 * 批 0 增补的 `field-label` 槽档位。两档的 `default` 取值必须与既有渲染等价，
 * 因此既有 3 个消费方（git-section / profile-section / new-workspace-page）
 * 不传新 prop 时行为不变；这里重点验两件事：
 * ① 档位不吞文案、不破坏 label↔控件的关联；
 * ② `size` / `variant` 是组件私有 prop，**不得泄到 DOM**（`<label size="xs">`
 *    会成为无意义属性，且会污染 §12 的 DOM 契约）。
 */
describe('field-label 槽的批 0 增补档（size / variant）', () => {
  const COMBOS = [
    { size: 'default', variant: 'default' },
    { size: 'xs', variant: 'default' },
    { size: 'default', variant: 'muted' },
    { size: 'xs', variant: 'muted' },
  ] as const;

  it.each(COMBOS)(
    'FieldLabel size=$size variant=$variant：保留关联且不泄露私有 prop',
    ({ size, variant }) => {
      render(
        <Field>
          <FieldLabel htmlFor="label-host" size={size} variant={variant}>
            主机地址
          </FieldLabel>
          <FieldContent>
            <input id="label-host" />
          </FieldContent>
        </Field>,
      );

      const label = screen.getByText('主机地址');
      expect(screen.getByLabelText('主机地址')).toHaveAttribute(
        'id',
        'label-host',
      );
      expect(label).not.toHaveAttribute('size');
      expect(label).not.toHaveAttribute('variant');
    },
  );

  it.each(COMBOS)(
    'FieldTitle size=$size variant=$variant：同槽同轴，文案不丢且不泄露私有 prop',
    ({ size, variant }) => {
      render(
        <Field>
          <FieldTitle size={size} variant={variant}>
            只读标题
          </FieldTitle>
        </Field>,
      );

      const title = screen.getByText('只读标题');
      expect(title).toHaveAttribute('data-slot', 'field-label');
      expect(title).not.toHaveAttribute('size');
      expect(title).not.toHaveAttribute('variant');
    },
  );

  it('既有调用方不传新 prop 时仍按 default 档渲染（默认值即基线）', () => {
    render(
      <Field>
        <FieldLabel htmlFor="plain">默认档</FieldLabel>
        <FieldContent>
          <input id="plain" />
        </FieldContent>
      </Field>,
    );

    expect(screen.getByLabelText('默认档')).toBeInTheDocument();
  });
});
