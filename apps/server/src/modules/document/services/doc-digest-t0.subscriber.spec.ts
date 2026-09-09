import { DocDigestT0Subscriber } from './doc-digest-t0.subscriber';
import { DocRegistryService } from './doc-registry.service';
import { DocumentTaskLinkService } from './document-task-link.service';

/**
 * T0 物化提升触发点测试（v2 纪要 §11）：published 事件与任务引用
 * 两条触发路径均收敛到 DocRegistry.enqueueDigest。
 */

describe('DocDigestT0Subscriber', () => {
  it('document.published → enqueueDigest 排队', async () => {
    const enqueue = jest.fn(async () => true);
    const subscriber = new DocDigestT0Subscriber({
      enqueueDigest: enqueue,
    } as unknown as DocRegistryService);

    await subscriber.onDocumentPublished({ documentId: 'doc-1' });
    expect(enqueue).toHaveBeenCalledWith('doc-1');
  });

  it('失败降级为告警不外抛；空 documentId 忽略', async () => {
    const enqueue = jest.fn(async () => {
      throw new Error('db down');
    });
    const subscriber = new DocDigestT0Subscriber({
      enqueueDigest: enqueue,
    } as unknown as DocRegistryService);

    await expect(
      subscriber.onDocumentPublished({ documentId: 'doc-1' }),
    ).resolves.toBeUndefined();
    await expect(subscriber.onDocumentPublished({})).resolves.toBeUndefined();
    expect(enqueue).toHaveBeenCalledTimes(1);
  });
});

describe('DocumentTaskLinkService.createLink 的 T0 触发', () => {
  function makeService() {
    const created = { id: 'link-1' };
    const prisma = {
      documentTaskLink: { create: jest.fn(async () => created) },
    };
    const enqueue = jest.fn(async () => true);
    const svc = new DocumentTaskLinkService(
      prisma as never,
      { enqueueDigest: enqueue } as unknown as DocRegistryService,
    );
    return { svc, prisma, enqueue, created };
  }

  it('带 documentId 的关联创建后触发 enqueueDigest', async () => {
    const { svc, enqueue, created } = makeService();
    const result = await svc.createLink({
      documentId: 'doc-1',
      issueId: 'issue-1',
      projectId: 'proj-1',
      createdBy: 'user-1',
    });
    expect(result).toEqual(created);
    expect(enqueue).toHaveBeenCalledWith('doc-1');
  });

  it('仅章节关联（无 documentId）不触发；enqueue 失败不阻断创建', async () => {
    const enqueue = jest.fn(async () => {
      throw new Error('boom');
    });
    const prisma = {
      documentTaskLink: { create: jest.fn(async () => ({ id: 'link-2' })) },
    };
    const svc = new DocumentTaskLinkService(
      prisma as never,
      { enqueueDigest: enqueue } as unknown as DocRegistryService,
    );
    const result = await svc.createLink({
      documentId: null,
      sectionId: 'sec-1',
      issueId: 'issue-1',
      projectId: 'proj-1',
      createdBy: 'user-1',
    });
    expect(result).toEqual({ id: 'link-2' });
    expect(enqueue).not.toHaveBeenCalled();
  });
});
