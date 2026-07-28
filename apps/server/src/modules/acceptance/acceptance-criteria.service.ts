import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { CreateCriteriaDto } from './dto/acceptance.dto';

@Injectable()
export class AcceptanceCriteriaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 为验收契约添加标准
   */
  async create(acceptanceId: string, dto: CreateCriteriaDto) {
    const acceptance = await this.prisma.acceptance.findUnique({
      where: { id: acceptanceId },
    });

    if (!acceptance) {
      throw new NotFoundException(`Acceptance ${acceptanceId} not found`);
    }

    // 获取当前最大 order
    const maxOrder = await this.prisma.acceptanceCriteria.aggregate({
      where: { acceptanceId },
      _max: { order: true },
    });

    return this.prisma.acceptanceCriteria.create({
      data: {
        acceptanceId,
        criteriaType: dto.criteriaType,
        category: dto.category,
        content: dto.content,
        source: dto.source || 'manual',
        weight: dto.weight || 1,
        severity: dto.severity || 'medium',
        order: dto.order ?? (maxOrder._max.order ?? -1) + 1,
      },
    });
  }

  /**
   * 批量添加标准
   */
  async createMany(acceptanceId: string, criteria: CreateCriteriaDto[]) {
    const acceptance = await this.prisma.acceptance.findUnique({
      where: { id: acceptanceId },
    });

    if (!acceptance) {
      throw new NotFoundException(`Acceptance ${acceptanceId} not found`);
    }

    const maxOrder = await this.prisma.acceptanceCriteria.aggregate({
      where: { acceptanceId },
      _max: { order: true },
    });

    let orderOffset = (maxOrder._max.order ?? -1) + 1;

    const created = await Promise.all(
      criteria.map((c) =>
        this.prisma.acceptanceCriteria.create({
          data: {
            acceptanceId,
            criteriaType: c.criteriaType,
            category: c.category,
            content: c.content,
            source: c.source || 'manual',
            weight: c.weight || 1,
            severity: c.severity || 'medium',
            order: c.order ?? orderOffset++,
          },
        }),
      ),
    );

    return created;
  }

  /**
   * 更新标准
   */
  async update(criteriaId: string, data: {
    content?: string;
    status?: string;
    severity?: string;
    order?: number;
  }) {
    const criteria = await this.prisma.acceptanceCriteria.findUnique({
      where: { id: criteriaId },
    });

    if (!criteria) {
      throw new NotFoundException(`Criteria ${criteriaId} not found`);
    }

    const updateData: any = { ...data };
    if (data.status === 'passed') {
      updateData.passedAt = new Date();
    }

    return this.prisma.acceptanceCriteria.update({
      where: { id: criteriaId },
      data: updateData,
    });
  }

  /**
   * 删除标准
   */
  async delete(criteriaId: string) {
    const criteria = await this.prisma.acceptanceCriteria.findUnique({
      where: { id: criteriaId },
    });

    if (!criteria) {
      throw new NotFoundException(`Criteria ${criteriaId} not found`);
    }

    await this.prisma.acceptanceCriteria.delete({
      where: { id: criteriaId },
    });
  }

  /**
   * 获取验收的所有标准
   */
  async findByAcceptance(acceptanceId: string) {
    return this.prisma.acceptanceCriteria.findMany({
      where: { acceptanceId },
      orderBy: { order: 'asc' },
      include: {
        evidences: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * 获取标准详情
   */
  async findOne(criteriaId: string) {
    const criteria = await this.prisma.acceptanceCriteria.findUnique({
      where: { id: criteriaId },
      include: {
        evidences: {
          orderBy: { createdAt: 'desc' },
        },
        acceptance: {
          select: { id: true, taskId: true },
        },
      },
    });

    if (!criteria) {
      throw new NotFoundException(`Criteria ${criteriaId} not found`);
    }

    return criteria;
  }

  /**
   * 批量更新标准状态
   */
  async updateStatus(criteriaIds: string[], status: string) {
    const updateData = criteriaIds.map((id, index) => ({
      id,
      status,
      passedAt: status === 'passed' ? new Date() : undefined,
    }));

    return Promise.all(
      updateData.map((data) =>
        this.prisma.acceptanceCriteria.update({
          where: { id: data.id },
          data: {
            status: data.status,
            passedAt: data.passedAt,
          },
        }),
      ),
    );
  }
}
