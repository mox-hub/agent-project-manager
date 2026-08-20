/**
 * 成员唯一短 ID：8 位小写字母数字（剔除 0/o/1/i/l/u 等易混淆字符）。
 * 创建成员（human / ai_agent）时生成，路由与 @ 引用均可使用。
 */
const SHORT_ID_ALPHABET = 'abcdefghjkmnpqrstvwxyz23456789';
const SHORT_ID_LENGTH = 8;

export function generateMemberShortId(): string {
  let out = '';
  for (let i = 0; i < SHORT_ID_LENGTH; i += 1) {
    out += SHORT_ID_ALPHABET[Math.floor(Math.random() * SHORT_ID_ALPHABET.length)];
  }
  return out;
}
