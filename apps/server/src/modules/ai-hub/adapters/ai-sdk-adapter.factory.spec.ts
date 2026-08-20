import { AiSdkAdapterFactory } from './ai-sdk-adapter.factory';
import { AiSdkAdapter } from './ai-sdk-adapter';

describe('AiSdkAdapterFactory', () => {
  let factory: AiSdkAdapterFactory;

  beforeEach(() => {
    factory = new AiSdkAdapterFactory();
  });

  describe('create', () => {
    it('should create an AiSdkAdapter instance', () => {
      const adapter = factory.create({
        provider: 'openai',
        sdkType: 'openai',
        apiKey: 'sk-test',
        defaultModel: 'gpt-4o',
      });

      expect(adapter).toBeInstanceOf(AiSdkAdapter);
      expect(adapter.getProvider()).toBe('openai');
      expect(adapter.getModelName()).toBe('gpt-4o');
    });
  });

  describe('createFromConfig', () => {
    it('should normalize sdkType and use provider default model when not provided', () => {
      const adapter = factory.createFromConfig({
        provider: 'deepseek',
        sdkType: 'openai',
        apiKey: 'sk-test',
      });

      expect(adapter.getProvider()).toBe('deepseek');
      expect(adapter.getModelName()).toBe('deepseek-chat');
    });

    it('should fall back to openai protocol for unknown sdkType', () => {
      const adapter = factory.createFromConfig({
        provider: 'custom',
        sdkType: 'unknown-type',
        apiKey: 'sk-test',
      });

      expect(adapter.getProvider()).toBe('custom');
      expect(adapter.getModelName()).toBe('gpt-4o');
    });

    it('should map providers to their default models', () => {
      const cases: Array<[string, string]> = [
        ['openai', 'gpt-4o'],
        ['anthropic', 'claude-sonnet-4-20250514'],
        ['gemini', 'gemini-1.5-flash'],
        ['deepseek', 'deepseek-chat'],
        ['glm', 'glm-4'],
      ];

      for (const [provider, model] of cases) {
        const adapter = factory.createFromConfig({
          provider,
          sdkType: 'openai',
          apiKey: 'sk-test',
        });
        expect(adapter.getModelName()).toBe(model);
      }
    });
  });
});
