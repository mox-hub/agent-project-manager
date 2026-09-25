import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from '@/modules/auth/dto/register.dto';
import { UpdateProfileDto } from '@/modules/auth/dto/update-profile.dto';
import { CreateAdminUserDto } from '@/modules/admin/dto/admin.dto';
import {
  DISPLAY_NAME_MAX_LENGTH,
  findDisplayNameIssue,
} from './display-name.util';

const GARBAGE_NAMES = [
  'AI Agent \uFFFD\uFFFD\uFFFD\uFFFDU',
  '\uFFFD\uFFFD',
  'bad\x00name',
  'esc\x1b[31mname',
  'del\x7fname',
  'c1\x85name',
  'c1\x9fname',
  'zero\u200Bwidth',
  'zero\u200Cwidth',
  'zero\u200Dwidth',
  'bom\uFEFFname',
  'join\u2060er',
  '\u180Emongolian',
  '   ',
  '',
];

const VALID_NAMES = [
  '张三',
  'AI Agent',
  'alice',
  '王小明 🚀',
  '❤️',
  'José García',
  '日本語のなまえ',
  'Ωμέγα',
  '  张三  ',
  'a'.repeat(DISPLAY_NAME_MAX_LENGTH),
  `tom\u2665`,
];

describe('findDisplayNameIssue', () => {
  it('rejects known garbage names (control chars / U+FFFD / zero-width / blank)', () => {
    for (const name of GARBAGE_NAMES) {
      const issue = findDisplayNameIssue(name);
      expect(issue).not.toBeNull();
      expect(typeof issue).toBe('string');
      expect(issue!.length).toBeGreaterThan(0);
    }
  });

  it('accepts normal Chinese/English/emoji names', () => {
    for (const name of VALID_NAMES) {
      expect(findDisplayNameIssue(name)).toBeNull();
    }
  });

  it('rejects over-length names after trim but accepts boundary length', () => {
    const padded = `  ${'长'.repeat(DISPLAY_NAME_MAX_LENGTH + 1)}  `;
    expect(findDisplayNameIssue(padded)).toContain('不能超过');
    expect(
      findDisplayNameIssue(`  ${'张'.repeat(DISPLAY_NAME_MAX_LENGTH)}  `),
    ).toBeNull();
  });

  it('rejects non-string values', () => {
    expect(findDisplayNameIssue(123)).not.toBeNull();
    expect(findDisplayNameIssue(null)).not.toBeNull();
    expect(findDisplayNameIssue(undefined)).not.toBeNull();
  });

  it('gives specific reasons per failure family', () => {
    expect(findDisplayNameIssue('a\x01b')).toContain('控制字符');
    expect(findDisplayNameIssue('a\uFFFD')).toContain('U+FFFD');
    expect(findDisplayNameIssue('a\u200Bb')).toContain('零宽字符');
    expect(findDisplayNameIssue('   ')).toContain('不能为空');
  });

  it('does not split emoji surrogate pairs when scanning', () => {
    // 👨‍👩‍👧 之类 ZWJ 组合 emoji 含 U+200D，按零宽字符规则拒绝；
    // 但普通 emoji（含变体选择符）必须完整通过码点扫描
    expect(findDisplayNameIssue('张三😀')).toBeNull();
    expect(findDisplayNameIssue('张三❤️')).toBeNull();
  });
});

async function validateDisplayName(dtoClass: new () => object, raw: unknown) {
  const dto = plainToInstance(dtoClass, {
    email: 'alice@example.com',
    password: 'password123',
    displayName: raw,
  });
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: false,
  });
  return errors.filter((e) => e.property === 'displayName');
}

type DtoCase = [string, new () => object];

const displayNameDtoCases: DtoCase[] = [
  ['RegisterDto', RegisterDto],
  ['UpdateProfileDto', UpdateProfileDto],
  ['CreateAdminUserDto', CreateAdminUserDto],
];

describe('displayName DTO validation (register / profile / admin create)', () => {
  it.each(displayNameDtoCases)(
    '%s rejects garbage displayName with semantic message',
    async (_name, DtoCls) => {
      const errors = await validateDisplayName(
        DtoCls,
        'AI Agent \uFFFD\uFFFD\uFFFDU',
      );
      expect(errors).toHaveLength(1);
      const messages = Object.values(errors[0].constraints ?? {});
      expect(messages.join(';')).toContain('乱码替换符');
    },
  );

  it.each(displayNameDtoCases)(
    '%s accepts normal Chinese/emoji displayName',
    async (_name, DtoCls) => {
      for (const name of ['张三', '王小明 🚀', 'AI Agent']) {
        const errors = await validateDisplayName(DtoCls, name);
        expect(errors).toHaveLength(0);
      }
    },
  );

  it('RegisterDto keeps displayName optional (absent value still valid)', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'alice@example.com',
      password: 'password123',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
