import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  CheckSquare,
  Scale,
  ShieldCheck,
  Users,
  UsersRound,
} from 'lucide-react';
import { TONE_TEXT_CLASS, type StatusTone } from '@/shared/status/status-visuals';
import {
  ENTITY_ICONS,
  EntityIcon,
  getEntityIcon,
  getEntityIconTextClass,
  type EntityKind,
} from '../entity-icons';

const ALL_ENTITIES = Object.keys(ENTITY_ICONS) as EntityKind[];

const VALID_TONES: StatusTone[] = ['default', 'info', 'warning', 'success', 'danger'];

describe('entity-icons 注册表', () => {
  it('每个实体都登记了 { icon, tone }，tone 取合法 5 档', () => {
    expect(ALL_ENTITIES.length).toBeGreaterThan(0);
    for (const entity of ALL_ENTITIES) {
      const entry = getEntityIcon(entity);
      expect(entry.icon, `${entity} 缺 icon`).toBeTruthy();
      expect(VALID_TONES, `${entity} tone 非法`).toContain(entry.tone);
    }
  });

  it('实体图标互不撞车（uniqueness 强制约束）', () => {
    const icons = ALL_ENTITIES.map((entity) => ENTITY_ICONS[entity].icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('关键裁决口径：issue=CheckSquare、acceptance=ShieldCheck、decision=Scale、member=Users、team=UsersRound', () => {
    expect(getEntityIcon('issue').icon).toBe(CheckSquare);
    // 验收实体保留 ShieldCheck（三方重叠裁决：admin 域→UserCog、人工确认节点→UserCheck）
    expect(getEntityIcon('acceptance').icon).toBe(ShieldCheck);
    // 第二批铺开：决策收件箱原 Inbox 已统一为裁决天平 Scale
    expect(getEntityIcon('decision').icon).toBe(Scale);
    expect(getEntityIcon('member').icon).toBe(Users);
    expect(getEntityIcon('team').icon).toBe(UsersRound);
  });

  it('tone 文字色档复用 status-visuals 的 TONE_TEXT_CLASS', () => {
    for (const entity of ALL_ENTITIES) {
      expect(getEntityIconTextClass(entity)).toBe(TONE_TEXT_CLASS[getEntityIcon(entity).tone]);
    }
  });
});

describe('EntityIcon 组件', () => {
  it('默认 md 档（16px）并着实体 tone 语义色', () => {
    render(<EntityIcon entity="bug" data-testid="bug-icon" />);
    const svg = screen.getByTestId('bug-icon');
    expect(svg).toBeInTheDocument();
    // SVG 元素无 className 字符串，断言走 class attribute
    const cls = svg.getAttribute('class') ?? '';
    expect(cls).toContain('size-4');
    expect(cls).toContain(TONE_TEXT_CLASS[getEntityIcon('bug').tone]);
  });

  it('size 走宪法 §6.2 四档（12/14/16/20px）', () => {
    render(
      <div>
        <EntityIcon entity="issue" size="xs" data-testid="issue-xs" />
        <EntityIcon entity="issue" size="sm" data-testid="issue-sm" />
        <EntityIcon entity="issue" size="lg" data-testid="issue-lg" />
      </div>,
    );
    expect(screen.getByTestId('issue-xs').getAttribute('class')).toContain('size-3'); // 12px
    expect(screen.getByTestId('issue-sm').getAttribute('class')).toContain('size-3.5'); // 14px
    expect(screen.getByTestId('issue-lg').getAttribute('class')).toContain('size-5'); // 20px
  });

  it('className 可覆盖默认 tone 色（twmerge 后不残留 tone 色档）', () => {
    const toneClass = TONE_TEXT_CLASS[getEntityIcon('issue').tone];
    render(<EntityIcon entity="issue" size="sm" className="text-primary" data-testid="issue-override" />);
    const cls = screen.getByTestId('issue-override').getAttribute('class') ?? '';
    expect(cls).toContain('text-primary');
    expect(cls).not.toContain(toneClass);
    expect(cls).toContain('size-3.5');
  });
});
