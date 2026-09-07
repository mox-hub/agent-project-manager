#!/usr/bin/env node
/**
 * 契约口径巡检（check:contract-convention）。
 *
 * 裸数据口径的两条规矩，靠构造强制而非约定：
 *   1.【信封污染检测，违规即失败】200/201 响应 schema 里不得出现信封结构
 *      （allOf 引用 ApiResponseDto，或 properties 同时含 success+data+timestamp）
 *      ——端点级声明信封会与全局口径混用，是契约最坏状态。
 *   2.【无类型响应清点，仅报告】content 缺失的 200/201 按模块统计，
 *      作为「响应声明铺开」的积压度量（void 语义端点天然无 content，属正常）。
 *
 * 用法：pnpm check:contract-convention
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const spec = JSON.parse(
  readFileSync(resolve(root, 'openapi.json'), 'utf8'),
);

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);
const pollution = [];
const degraded = []; // 裸 object 退化：{type:'object'} 无 properties 无 additionalProperties
const untyped = {}; // tag → count
let typedCount = 0;

function isEnvelopePollution(schema) {
  if (!schema || typeof schema !== 'object') return false;
  const refs = JSON.stringify(schema.allOf?.$ref ?? schema.allOf ?? []);
  if (String(refs).includes('ApiResponseDto')) return true;
  if (schema.properties) {
    const keys = new Set(Object.keys(schema.properties));
    if (keys.has('success') && keys.has('data') && keys.has('timestamp')) {
      return true;
    }
  }
  return false;
}

/** 裸 object 退化：联合类型元数据擦除（design:type → Object）或漏写 additionalProperties */
function isBareObject(schema) {
  return (
    schema?.type === 'object' &&
    !schema.properties &&
    schema.additionalProperties === undefined
  );
}

function collectBareObject(schema, where) {
  if (!schema || typeof schema !== 'object') return;
  if (isBareObject(schema)) {
    degraded.push(where);
    return;
  }
  for (const [prop, sub] of Object.entries(schema.properties ?? {})) {
    collectBareObject(sub, `${where} → ${prop}`);
  }
}

for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
  for (const [method, op] of Object.entries(pathItem)) {
    if (!HTTP_METHODS.has(method) || !op?.responses) continue;
    const tag = op.tags?.[0] ?? 'untagged';
    for (const status of ['200', '201']) {
      const res = op.responses[status];
      if (!res) continue;
      const content = res.content ?? {};
      const jsonSchema = content['application/json']?.schema;
      if (!jsonSchema) {
        untyped[tag] = (untyped[tag] ?? 0) + 1;
        continue;
      }
      if (isEnvelopePollution(jsonSchema)) {
        pollution.push(`${method.toUpperCase()} ${path} (${status})`);
        continue;
      }
      collectBareObject(jsonSchema, `${method.toUpperCase()} ${path} (${status})`);
      typedCount += 1;
    }
  }
}

console.log(`契约口径巡检：有类型响应 ${typedCount} 个；无类型 200/201 按模块清点（含 void 语义端点，属正常）：`);
for (const [tag, count] of Object.entries(untyped).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${tag}: ${count}`);
}

if (pollution.length > 0) {
  console.error(`\n✗ 检出 ${pollution.length} 个信封污染响应（端点级声明信封违反裸数据口径）：`);
  for (const p of pollution) console.error(`  - ${p}`);
  console.error('修复：改用 @ApiOkResponse({ type }) 描述解包后数据；信封已在 info.description 全局文档化。');
}

if (degraded.length > 0) {
  console.error(`\n✗ 检出 ${degraded.length} 处裸 object 退化（生成 Record<string, never>，前端不可消费）：`);
  for (const d of degraded.slice(0, 40)) console.error(`  - ${d}`);
  if (degraded.length > 40) console.error(`  ...另有 ${degraded.length - 40} 处`);
  console.error('修复：给 @ApiProperty 显式 type（可空联合字段必须写 type: String/Number/Boolean；unknown 字段写 type: Object + additionalProperties: true）。');
}

if (pollution.length > 0 || degraded.length > 0) process.exit(1);
console.log('\n✓ 无信封污染、无裸 object 退化，裸数据口径纯净。');
