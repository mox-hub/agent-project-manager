import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import {
  CreateMemoryDto,
  UpdateMemoryDto,
  MemoryAtomDto,
  MemoryBriefResponseDto,
  MemoryListResponseDto,
} from './dto/memory.dto';
import { MemoryService } from './memory.service';

/**
 * 记忆 Store B 的 HTTP 面：recall（工具/前端共用）、brief（交接摘要）、
 * 人可检视列表与人可改（置信度/钉住/归档/删除）。服务端契约见 openapi Memory 段。
 */
@ApiTags('Memory')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('memory')
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get('recall')
  @ApiOperation({ summary: '召回活跃记忆（scope 隔离，查无结果返回空）' })
  @ApiOkResponse({
    type: MemoryAtomDto,
    isArray: true,
    description: '命中的记忆原子（pinned > confidence > lastUsedAt 排序）',
  })
  recall(
    @Query('projectId') projectId?: string,
    @Query('type') type?: string,
    @Query('query') query?: string,
    @Query('limit') limit?: string,
  ) {
    return this.memoryService.recall({
      projectId: projectId || undefined,
      type: type || undefined,
      query: query || undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('brief')
  @ApiOperation({ summary: '交接摘要（钉住优先 + 最新记忆 + 计数）' })
  @ApiOkResponse({
    type: MemoryBriefResponseDto,
    description: '交接摘要（pinned/recent/counts）',
  })
  brief(@Query('projectId') projectId?: string) {
    return this.memoryService.brief(projectId || undefined);
  }

  @Get()
  @ApiOperation({ summary: '人可检视列表（含 archived，不含 pruned）' })
  @ApiOkResponse({
    type: MemoryListResponseDto,
    description: '记忆列表（{ items, total }）',
  })
  list(
    @Query('projectId') projectId?: string,
    @Query('type') type?: string,
    @Query('lifecycle') lifecycle?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.memoryService.list({
      projectId: projectId || undefined,
      type: type || undefined,
      lifecycle: lifecycle || undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Post()
  @ApiOperation({
    summary: '记录一条记忆原子（人写；重复提升置信度不重复插入）',
  })
  @ApiCreatedResponse({
    type: MemoryAtomDto,
    description: '写入/去重合并后的记忆原子',
  })
  create(@Body() dto: CreateMemoryDto) {
    return this.memoryService.note({
      projectId: dto.projectId ?? undefined,
      type: dto.type,
      content: dto.content,
      confidence: dto.confidence ?? undefined,
      refs: dto.refs ?? undefined,
      sourceType: 'manual',
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: '人工修正（置信度/钉住/归档/正文）' })
  @ApiOkResponse({ type: MemoryAtomDto, description: '修正后的记忆原子' })
  update(@Param('id') id: string, @Body() dto: UpdateMemoryDto) {
    return this.memoryService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '遗忘（软删 pruned，证据可查不注入）' })
  @ApiOkResponse({
    type: MemoryAtomDto,
    description: '软删后的记忆原子（lifecycle=pruned）',
  })
  remove(@Param('id') id: string) {
    return this.memoryService.remove(id);
  }
}
