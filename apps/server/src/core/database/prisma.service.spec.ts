import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { LoggerService } from '../logger/logger.service';
import { PrismaClient } from '@prisma/client';

describe('PrismaService', () => {
  let service: PrismaService;

  const mockLoggerService = {
    setContext: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
    verbose: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should set logger context', () => {
    expect(mockLoggerService.setContext).toHaveBeenCalledWith('Prisma');
  });

  describe('onModuleInit', () => {
    it('should connect to database', async () => {
      const connectSpy = vi.spyOn(PrismaClient.prototype, '$connect');
      connectSpy.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(connectSpy).toHaveBeenCalled();
      expect(mockLoggerService.log).toHaveBeenCalledWith('Database connected');
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from database', async () => {
      const disconnectSpy = vi.spyOn(PrismaClient.prototype, '$disconnect');
      disconnectSpy.mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(disconnectSpy).toHaveBeenCalled();
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        'Database disconnected',
      );
    });
  });
});
