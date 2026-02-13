import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { configSchema } from './config.schema';

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(async () => {
    // Set required environment variables for testing
    process.env.DATABASE_URL = 'file:./test.db';
    process.env.JWT_SECRET = 'test-secret';

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        NestConfigModule.forRoot({
          validationSchema: configSchema,
          envFilePath: ['.env.test'],
        }),
      ],
      providers: [ConfigService],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get configuration value', () => {
    const port = service.get('PORT');
    expect(port).toBeDefined();
  });

  it('should throw error for missing required key', () => {
    expect(() => service.getOrThrow('NON_EXISTENT_KEY')).toThrow();
  });
});
