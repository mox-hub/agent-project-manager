import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

/** models.dev 开源模型目录（Anomaly，MIT）——价目参考元数据唯一外部源 */
export const MODELS_DEV_API_URL = 'https://models.dev/api.json';

/** 缓存有效期：超时标记 stale，查表仍可用，后台触发一次再拉取 */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const FETCH_TIMEOUT_MS = 15_000;

/** 单条模型参考价（USD / 百万 tokens） */
export interface ModelsDevModelPrice {
  name: string;
  inputPerM: number | null;
  outputPerM: number | null;
  cacheReadPerM: number | null;
  cacheWritePerM: number | null;
  contextLimit: number | null;
  reasoning: boolean;
  toolCall: boolean;
}

/** APM AIProviderType → models.dev 厂家键别名（未列出的键按原文直查） */
const PROVIDER_ALIAS: Record<string, string> = {
  openai: 'openai',
  anthropic: 'anthropic',
  gemini: 'google',
  deepseek: 'deepseek',
  glm: 'zhipuai',
  opencode: 'opencode',
  'opencode-go': 'opencode-go',
};

export interface ModelsDevStatus {
  /** 价目数据是否可用（至少成功拉取过一次） */
  available: boolean;
  /** 上次成功拉取时间（ISO，未拉取为 null） */
  fetchedAt: string | null;
  /** 缓存是否过期（超过 TTL 或从未加载） */
  stale: boolean;
  providerCount: number;
  modelCount: number;
  source: string;
  /** 最近一次拉取失败原因（成功后清空；refresh 失败保留旧缓存时透出） */
  error: string | null;
}

export interface ItemizedPrice {
  inputPerM: number;
  outputPerM: number;
}

interface ModelsDevModelRaw {
  name?: unknown;
  cost?: {
    input?: unknown;
    output?: unknown;
    cache_read?: unknown;
    cache_write?: unknown;
  } | null;
  limit?: { context?: unknown; output?: unknown } | null;
  reasoning?: unknown;
  tool_call?: unknown;
}

interface ModelsDevProviderRaw {
  models?: Record<string, ModelsDevModelRaw | undefined> | null;
}

interface CatalogCache {
  /** key：`${providerKey}/${modelId}`（全小写） */
  entries: Map<string, ModelsDevModelPrice>;
  providerCount: number;
  modelCount: number;
  fetchedAt: number;
}

/**
 * models.dev 价目参考源 —— 拉取 / 归一 / 厂家别名解析 / 内存缓存。
 * 真相源纪律（CAP-A-21）：只做价目参考元数据，不落库、不参与模型清单真相
 * （模型清单以供应商 /models 端点为唯一权威，见 CAP-A-20）。
 */
@Injectable()
export class ModelsDevService implements OnModuleInit {
  private readonly logger = new Logger(ModelsDevService.name);
  private cache: CatalogCache | null = null;
  private lastError: string | null = null;
  private refreshInFlight: Promise<void> | null = null;

  /** 启动预热：失败不阻塞启动（离线环境靠手动刷新端点） */
  onModuleInit(): void {
    void this.refresh();
  }

  getStatus(): ModelsDevStatus {
    const stale =
      !this.cache || Date.now() - this.cache.fetchedAt > CACHE_TTL_MS;
    return {
      available: this.cache != null,
      fetchedAt: this.cache
        ? new Date(this.cache.fetchedAt).toISOString()
        : null,
      stale,
      providerCount: this.cache?.providerCount ?? 0,
      modelCount: this.cache?.modelCount ?? 0,
      source: MODELS_DEV_API_URL,
      error: this.lastError,
    };
  }

  /** 强制拉取；失败保留旧缓存并透出 error（估价链不中断） */
  async refresh(): Promise<ModelsDevStatus> {
    try {
      const raw = (await this.performFetch()) as Record<
        string,
        ModelsDevProviderRaw | undefined
      >;
      this.cache = this.normalize(raw);
      this.lastError = null;
    } catch (e) {
      this.lastError = (e as Error).message;
      this.logger.warn(`models.dev 拉取失败（保留旧缓存）: ${this.lastError}`);
    }
    return this.getStatus();
  }

  /** 网络口（测试与子类可覆盖） */
  protected performFetch(): Promise<unknown> {
    return fetch(MODELS_DEV_API_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { accept: 'application/json' },
    }).then((res) => {
      if (!res.ok) throw new Error(`models.dev HTTP ${res.status}`);
      return res.json();
    });
  }

  /**
   * 解析某厂家某模型的分项参考价（USD/百万）。仅查缓存，绝不阻塞网络；
   * 未命中返回 null（估价链回落内置表）。缓存过期时后台触发一次再拉取。
   */
  resolveItemizedPrice(
    provider: string,
    modelName: string,
  ): ItemizedPrice | null {
    if (!this.cache) return null;
    if (Date.now() - this.cache.fetchedAt > CACHE_TTL_MS) {
      this.ensureFreshInBackground();
    }
    const providerKey =
      PROVIDER_ALIAS[provider.toLowerCase()] ?? provider.toLowerCase();
    const prefix = `${providerKey}/`;
    const modelLower = modelName.toLowerCase();

    const exact = this.cache.entries.get(`${prefix}${modelLower}`);
    if (exact) return toItemized(exact);

    // 模糊只接受「查询 id 包含目录 id」方向（查询更具体，如带日期尾缀），
    // 取最长命中避免短键抢先
    let best: { id: string; price: ModelsDevModelPrice } | null = null;
    for (const [key, price] of this.cache.entries) {
      if (!key.startsWith(prefix)) continue;
      const id = key.slice(prefix.length);
      if (modelLower.includes(id) && (!best || id.length > best.id.length)) {
        best = { id, price };
      }
    }
    return best ? toItemized(best.price) : null;
  }

  private ensureFreshInBackground(): void {
    if (this.refreshInFlight) return;
    this.refreshInFlight = this.refresh()
      .then(() => undefined)
      .finally(() => {
        this.refreshInFlight = null;
      });
  }

  private normalize(
    raw: Record<string, ModelsDevProviderRaw | undefined>,
  ): CatalogCache {
    const entries = new Map<string, ModelsDevModelPrice>();
    let providerCount = 0;
    for (const [providerKey, providerData] of Object.entries(raw ?? {})) {
      const models = providerData?.models;
      if (!models || typeof models !== 'object') continue;
      providerCount += 1;
      for (const [modelId, model] of Object.entries(models)) {
        if (!model || typeof model !== 'object') continue;
        entries.set(
          `${providerKey.toLowerCase()}/${modelId.toLowerCase()}`,
          toModelPrice(modelId, model),
        );
      }
    }
    return {
      entries,
      providerCount,
      modelCount: entries.size,
      fetchedAt: Date.now(),
    };
  }
}

function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function toModelPrice(
  modelId: string,
  model: ModelsDevModelRaw,
): ModelsDevModelPrice {
  return {
    name: typeof model.name === 'string' ? model.name : modelId,
    inputPerM: numOrNull(model.cost?.input),
    outputPerM: numOrNull(model.cost?.output),
    cacheReadPerM: numOrNull(model.cost?.cache_read),
    cacheWritePerM: numOrNull(model.cost?.cache_write),
    contextLimit: numOrNull(model.limit?.context),
    reasoning: model.reasoning === true,
    toolCall: model.tool_call === true,
  };
}

/** 免费/无价目条目不造假：两侧全空返回 null，单侧缺失按 0 计 */
function toItemized(price: ModelsDevModelPrice): ItemizedPrice | null {
  if (price.inputPerM == null && price.outputPerM == null) return null;
  return {
    inputPerM: price.inputPerM ?? 0,
    outputPerM: price.outputPerM ?? 0,
  };
}
