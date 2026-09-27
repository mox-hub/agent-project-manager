import { ContractEngineService } from '@/modules/contract/contract-engine.service';
import {
  PromptAgentsSyncService,
  AGENTS_PROJECT_PROMPT_BLOCK_ID,
} from './prompt-agents-sync.service';

/**
 * PromptAgentsSyncService（增强 D）：AGENTS.md 受管区块物化。
 * 引擎用真实 ContractEngineService（纯函数），fs/resolver 用内存桩——
 * 重点覆盖与契约种子区块（project-intro 等）的共存与互不干扰。
 */
describe('PromptAgentsSyncService（AGENTS.md 受管区块物化）', () => {
  const CONTRACT_BLOCK_BEGIN =
    '<!-- BEGIN apm:managed:project-intro -->\n# 契约种子项目\n简介\n<!-- END apm:managed:project-intro -->';

  function makeService(overrides: {
    root?: string | null;
    files?: Map<string, string>;
    failWrite?: boolean;
  }) {
    const files = overrides.files ?? new Map<string, string>();
    const root = 'root' in overrides ? overrides.root : 'D:/ws/demo';
    const engine = new ContractEngineService();
    const resolver = {
      resolveRoot: async () => root,
      join: (a: string, b: string) => `${a}/${b}`,
    };
    const fs = {
      readFileIfExists: async (p: string) => files.get(p) ?? null,
      writeFile: async (p: string, content: string) => {
        if (overrides.failWrite) throw new Error('EACCES: disk on fire');
        files.set(p, content);
      },
    };
    const service = new PromptAgentsSyncService(
      {} as never,
      engine,
      resolver as never,
      fs as never,
    );
    return { service, files, agentsPath: `${root}/AGENTS.md` };
  }

  it('文件不存在时创建骨架 + 受管区块；再次物化原位替换不重复', async () => {
    const { service, files, agentsPath } = makeService({ files: new Map() });

    const first = await service.materialize('p1', '项目约定一');
    expect(first.synced).toBe(true);
    const content = files.get(agentsPath)!;
    expect(content).toContain('# AGENTS.md');
    expect(content).toContain(
      `<!-- BEGIN apm:managed:${AGENTS_PROJECT_PROMPT_BLOCK_ID} -->`,
    );
    expect(content).toContain('项目约定一');

    const second = await service.materialize('p1', '项目约定二');
    expect(second.synced).toBe(true);
    const updated = files.get(agentsPath)!;
    expect(updated).toContain('项目约定二');
    expect(updated).not.toContain('项目约定一');
    expect(
      updated.split(`apm:managed:${AGENTS_PROJECT_PROMPT_BLOCK_ID}`).length - 1,
    ).toBe(2);
  });

  it('与契约种子区块共存：物化只动自己的区块，种子区块字节保留', async () => {
    const files = new Map<string, string>();
    files.set(
      'D:/ws/demo/AGENTS.md',
      `---\napm_project_id: p1\n---\n\n${CONTRACT_BLOCK_BEGIN}\n\n自由区内容保持不变。`,
    );
    const { service, agentsPath } = makeService({ files });

    const result = await service.materialize('p1', '项目协作约定');
    expect(result.synced).toBe(true);
    const next = files.get(agentsPath)!;
    expect(next).toContain(CONTRACT_BLOCK_BEGIN);
    expect(next).toContain('自由区内容保持不变。');
    expect(next).toContain('项目协作约定');
    expect(next).toContain('apm_project_id: p1');

    // 二次物化后种子区块仍在
    await service.materialize('p1', '项目协作约定 v2');
    const final = files.get(agentsPath)!;
    expect(final).toContain(CONTRACT_BLOCK_BEGIN);
    expect(final).toContain('项目协作约定 v2');
  });

  it('清空提示词时移除受管区块，其余内容（含种子区块）保留', async () => {
    const files = new Map<string, string>();
    files.set(
      'D:/ws/demo/AGENTS.md',
      `---\ntitle: demo\n---\n\n${CONTRACT_BLOCK_BEGIN}\n\n<!-- BEGIN apm:managed:${AGENTS_PROJECT_PROMPT_BLOCK_ID} -->\n旧约定\n<!-- END apm:managed:${AGENTS_PROJECT_PROMPT_BLOCK_ID} -->\n\n自由区。`,
    );
    const { service, agentsPath } = makeService({ files });

    const result = await service.materialize('p1', null);
    expect(result.synced).toBe(true);
    const next = files.get(agentsPath)!;
    expect(next).not.toContain(AGENTS_PROJECT_PROMPT_BLOCK_ID);
    expect(next).not.toContain('旧约定');
    expect(next).toContain(CONTRACT_BLOCK_BEGIN);
    expect(next).toContain('自由区。');
  });

  it('项目未绑定工作区：诚实降级 synced=false，不写文件', async () => {
    const { service, files } = makeService({ root: null });
    const result = await service.materialize('p1', '约定');
    expect(result.synced).toBe(false);
    expect(result.reason).toContain('未绑定本地工作区');
    expect(files.size).toBe(0);
  });

  it('写失败降级 synced=false 并给原因；readBlock 读出区块内容供 drift 检测', async () => {
    const { service } = makeService({ failWrite: true });
    const failed = await service.materialize('p1', '约定');
    expect(failed.synced).toBe(false);
    expect(failed.reason).toContain('写入失败');

    const files2 = new Map<string, string>();
    files2.set(
      'D:/ws/demo/AGENTS.md',
      `<!-- BEGIN apm:managed:${AGENTS_PROJECT_PROMPT_BLOCK_ID} -->\n文件侧内容\n<!-- END apm:managed:${AGENTS_PROJECT_PROMPT_BLOCK_ID} -->`,
    );
    const { service: service2 } = makeService({ files: files2 });
    const read = await service2.readBlock('p1');
    expect(read.fileExists).toBe(true);
    expect(read.blockContent).toBe('文件侧内容');

    const missing = await makeService({ files: new Map() }).service.readBlock(
      'p1',
    );
    expect(missing.fileExists).toBe(false);
    expect(missing.blockContent).toBeNull();
  });
});
