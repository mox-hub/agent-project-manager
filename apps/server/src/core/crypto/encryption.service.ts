import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';

export const CRYPTO_MODULE_OPTIONS = 'CRYPTO_MODULE_OPTIONS';

export interface CryptoModuleOptions {
  encryptionKey: string;
}

/**
 * 统一的加密服务 (AES-256-GCM)
 * - 算法：AES-256-GCM（带认证标签，防止篡改）
 * - 密文格式：base64(iv):base64(ciphertext):base64(authTag)
 * - 密钥来源：process.env.INTEGRATION_ENCRYPTION_KEY
 */
@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly encryptionKey: Buffer;

  constructor() {
    const keyEnv = process.env.INTEGRATION_ENCRYPTION_KEY;
    if (!keyEnv) {
      throw new Error(
        'INTEGRATION_ENCRYPTION_KEY environment variable is required',
      );
    }

    // 校验密钥长度（必须是32字节 = 256位）
    // 支持两种格式：
    // 1. 直接的 32 字节字符串
    // 2. Base64 编码的密钥（解码后需要是 32 字节）
    let keyBuffer: Buffer;
    
    if (keyEnv.length === 32) {
      // 直接 32 字节密钥
      keyBuffer = Buffer.from(keyEnv, 'utf8');
    } else {
      // 尝试 base64 解码
      try {
        const decoded = Buffer.from(keyEnv, 'base64');
        if (decoded.length === 32) {
          keyBuffer = decoded;
        } else {
          // 如果是纯文本密钥但长度不是32，padding到32
          const padded = keyEnv.padEnd(32, '0').substring(0, 32);
          keyBuffer = Buffer.from(padded, 'utf8');
        }
      } catch {
        // 如果解码失败，使用padding方式
        const padded = keyEnv.padEnd(32, '0').substring(0, 32);
        keyBuffer = Buffer.from(padded, 'utf8');
      }
    }

    if (keyBuffer.length !== 32) {
      throw new Error(
        `INTEGRATION_ENCRYPTION_KEY must be 32 bytes (256 bits), got ${keyBuffer.length} bytes. ` +
          'Please regenerate with: openssl rand -base64 32',
      );
    }
    this.encryptionKey = keyBuffer;
  }

  onModuleInit() {
    this.logger.log('EncryptionService initialized with AES-256-GCM');
  }

  /**
   * 加密明文字符串
   * @param plaintext 待加密的字符串
   * @returns base64(iv):base64(ciphertext):base64(authTag)
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12); // GCM 推荐 96 位 IV
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const authTag = cipher.getAuthTag();

    // 拼接格式：iv:ciphertext:authTag
    return [
      iv.toString('base64'),
      encrypted.toString('base64'),
      authTag.toString('base64'),
    ].join(':');
  }

  /**
   * 解密密文字符串
   * @param payload base64(iv):base64(ciphertext):base64(authTag)
   * @returns 解密后的明文字符串
   */
  decrypt(payload: string): string {
    try {
      const parts = payload.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid payload format');
      }

      const [ivBase64, ciphertextBase64, authTagBase64] = parts;
      const iv = Buffer.from(ivBase64, 'base64');
      const ciphertext = Buffer.from(ciphertextBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');

      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.encryptionKey,
        iv,
      );
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(ciphertext);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.error('Decryption failed', error);
      throw new BadRequestException('Failed to decrypt data');
    }
  }

  /**
   * 加密 JSON 对象（自动序列化）
   */
  encryptJson<T = any>(obj: T): string {
    return this.encrypt(JSON.stringify(obj));
  }

  /**
   * 解密并解析为 JSON 对象
   */
  decryptJson<T = any>(payload: string): T {
    return JSON.parse(this.decrypt(payload)) as T;
  }
}
