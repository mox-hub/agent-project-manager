import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { LoggerService } from '../logger/logger.service';
import { PrismaClient } from '@prisma/client';

describe('PrismaService', () => {
  let service: PrismaService;

  const mockLoggerService = {
    setContext: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    verbose: jest.fn(),
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
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should set logger context', () => {
    expect(mockLoggerService.setContext).toHaveBeenCalledWith('Prisma');
  });

  describe('onModuleInit', () => {
    it('should connect to database', async () => {
      const connectSpy = jest.spyOn(PrismaClient.prototype, '$connect');
      connectSpy.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(connectSpy).toHaveBeenCalled();
      expect(mockLoggerService.log).toHaveBeenCalledWith('Database connected');
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from database', async () => {
      const disconnectSpy = jest.spyOn(PrismaClient.prototype, '$disconnect');
      disconnectSpy.mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(disconnectSpy).toHaveBeenCalled();
      expect(mockLoggerService.log).toHaveBeenCalledWith('Database disconnected');
    });
  });
});
