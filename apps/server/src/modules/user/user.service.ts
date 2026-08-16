import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        timezone: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findOne(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        timezone: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return user;
  }

  async getRoles(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return this.prisma.roleAssignment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addRole(
    userId: string,
    payload: { scopeType: string; projectId?: string; role: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return this.prisma.roleAssignment.create({
      data: {
        userId,
        scopeType: payload.scopeType,
        projectId: payload.projectId,
        role: payload.role,
      },
    });
  }

  async removeRole(userId: string, roleAssignmentId: string) {
    const role = await this.prisma.roleAssignment.findUnique({
      where: { id: roleAssignmentId },
    });

    if (!role || role.userId !== userId) {
      throw new NotFoundException(
        `Role assignment ${roleAssignmentId} not found for user ${userId}`,
      );
    }

    await this.prisma.roleAssignment.delete({
      where: { id: roleAssignmentId },
    });
  }
}
