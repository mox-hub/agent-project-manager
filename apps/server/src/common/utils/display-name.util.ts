import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * displayName 卫生校验：拒绝控制字符（C0/C1）、U+FFFD 替换符与零宽字符，
 * 防止终端 GBK 脏字节等乱码入库（P2-19）。长度约束与既有 DTO 口径一致
 * （MinLength(1) / MaxLength(40)），改为去除首尾空白后判定。
 * 正常中英文、emoji（含变体选择符 U+FE0F）均放行。
 */
export const DISPLAY_NAME_MIN_LENGTH = 1;
export const DISPLAY_NAME_MAX_LENGTH = 40;

// 零宽/不可见格式字符：ZWSP、ZWNJ、ZWJ、WORD JOINER、BOM、Mongolian vowel separator
const ZERO_WIDTH_CHARS = new Set([
  '\u200B',
  '\u200C',
  '\u200D',
  '\u2060',
  '\uFEFF',
  '\u180E',
]);

/** 合法返回 null；否则返回语义化的中文错误原因 */
export function findDisplayNameIssue(value: unknown): string | null {
  if (typeof value !== 'string') {
    return 'displayName 必须是字符串';
  }

  const trimmed = value.trim();
  if (trimmed.length < DISPLAY_NAME_MIN_LENGTH) {
    return 'displayName 不能为空（去除首尾空白后至少 1 个字符）';
  }
  if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
    return `displayName 去除首尾空白后不能超过 ${DISPLAY_NAME_MAX_LENGTH} 个字符`;
  }

  // for...of 按码点迭代，emoji 代理对不会被拆开误判
  for (const char of trimmed) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) {
      return 'displayName 不能包含控制字符';
    }
    if (code === 0xfffd) {
      return 'displayName 不能包含乱码替换符（U+FFFD），请检查输入编码';
    }
    if (ZERO_WIDTH_CHARS.has(char)) {
      return 'displayName 不能包含零宽字符';
    }
  }

  return null;
}

/**
 * class-validator 装饰器：配合全局 ValidationPipe 在 DTO 层返回 400。
 * 错误消息按实际取值即时重算，保证语义化原因准确。
 */
export function IsValidDisplayName(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: {
        validate(value: unknown) {
          return findDisplayNameIssue(value) === null;
        },
        defaultMessage(args: ValidationArguments) {
          return findDisplayNameIssue(args.value) ?? 'displayName 不合法';
        },
      },
    });
  };
}
