import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';

@Injectable()
export class FolderService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createFolderDto: CreateFolderDto) {
    // Validate parent exists if provided
    if (createFolderDto.parentId) {
      const parent = await this.prisma.documentFolder.findUnique({
        where: { id: createFolderDto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent folder ${createFolderDto.parentId} not found`,
        );
      }
    }

    // Get max order if not provided
    let order = createFolderDto.order;
    if (order === undefined) {
      const maxOrder = await this.prisma.documentFolder.aggregate({
        where: {
          parentId: createFolderDto.parentId || null,
          projectId: createFolderDto.projectId || null,
        },
        _max: { order: true },
      });
      order = (maxOrder._max.order || 0) + 1;
    }

    return this.prisma.documentFolder.create({
      data: {
        name: createFolderDto.name,
        parentId: createFolderDto.parentId,
        projectId: createFolderDto.projectId,
        order,
      },
    });
  }

  async findAll(projectId?: string) {
    return this.prisma.documentFolder.findMany({
      where: {
        projectId: projectId || null,
      },
      include: {
        _count: {
          select: {
            documents: true,
            children: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string) {
    const folder = await this.prisma.documentFolder.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          include: {
            _count: {
              select: { documents: true, children: true },
            },
          },
          orderBy: { order: 'asc' },
        },
        documents: {
          where: { isDeleted: false },
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
        _count: {
          select: {
            documents: true,
            children: true,
          },
        },
      },
    });

    if (!folder) {
      throw new NotFoundException(`Folder ${id} not found`);
    }

    return folder;
  }

  async update(id: string, updateFolderDto: UpdateFolderDto) {
    const folder = await this.prisma.documentFolder.findUnique({
      where: { id },
    });
    if (!folder) {
      throw new NotFoundException(`Folder ${id} not found`);
    }

    // Prevent setting folder as its own parent
    if (updateFolderDto.parentId === id) {
      throw new BadRequestException('A folder cannot be its own parent');
    }

    // Validate new parent exists if provided
    if (updateFolderDto.parentId) {
      const parent = await this.prisma.documentFolder.findUnique({
        where: { id: updateFolderDto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent folder ${updateFolderDto.parentId} not found`,
        );
      }
    }

    return this.prisma.documentFolder.update({
      where: { id },
      data: updateFolderDto,
    });
  }

  async remove(id: string, force = false) {
    const folder = await this.prisma.documentFolder.findUnique({
      where: { id },
      include: { _count: { select: { documents: true, children: true } } },
    });

    if (!folder) {
      throw new NotFoundException(`Folder ${id} not found`);
    }

    if (folder._count.documents > 0 && !force) {
      throw new BadRequestException(
        `Folder contains ${folder._count.documents} documents. Use force=true to delete anyway.`,
      );
    }

    if (folder._count.children > 0 && !force) {
      throw new BadRequestException(
        `Folder contains ${folder._count.children} subfolders. Use force=true to delete anyway.`,
      );
    }

    await this.prisma.documentFolder.delete({ where: { id } });
  }

  async getTree(projectId?: string) {
    const folders = await this.prisma.documentFolder.findMany({
      where: { projectId: projectId || null },
      include: {
        _count: {
          select: {
            documents: true,
            children: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Build tree structure
    return this.buildTree(folders);
  }

  private buildTree(
    folders: Array<any>,
    parentId: string | null = null,
  ): any[] {
    return folders
      .filter((f) => f.parentId === parentId)
      .map((folder) => ({
        ...folder,
        children: this.buildTree(folders, folder.id),
      }));
  }
}
