import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeAll(() => {
    // 设置测试用的 32 字节密钥
    process.env.INTEGRATION_ENCRYPTION_KEY = 'test-encryption-key-32bytes-long!!';
  });

  afterAll(() => {
    delete process.env.INTEGRATION_ENCRYPTION_KEY;
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EncryptionService],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encrypt/decrypt roundtrip', () => {
    it('should encrypt and decrypt a simple string', () => {
      const plaintext = 'Hello, World!';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(encrypted).not.toBe(plaintext);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt a JSON object', () => {
      const obj = { apiKey: 'sk-test123', baseUrl: 'https://api.openai.com' };
      const encrypted = service.encryptJson(obj);
      const decrypted = service.decryptJson<typeof obj>(encrypted);

      expect(decrypted).toEqual(obj);
    });

    it('should produce different ciphertexts for same plaintext (due to random IV)', () => {
      const plaintext = 'same text';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
      expect(service.decrypt(encrypted1)).toBe(plaintext);
      expect(service.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = '你好世界 🌍 مرحبا';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const plaintext = '';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('decrypt with invalid payload', () => {
    it('should throw on invalid format', () => {
      expect(() => service.decrypt('invalid')).toThrow();
    });

    it('should throw on tampered ciphertext', () => {
      const encrypted = service.encrypt('secret');
      const parts = encrypted.split(':');
      // Tamper with ciphertext
      parts[1] = Buffer.from('tampered').toString('base64');
      const tampered = parts.join(':');

      expect(() => service.decrypt(tampered)).toThrow();
    });
  });
});
