import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import {
  DocumentTagService,
  type CreateTagInput,
  type UpdateTagInput,
} from '../services/document-tag.service';

@ApiTags('Document Tags')
@ApiBearerAuth('JWT-auth')
@Controller('documents/tags')
@UseGuards(JwtAuthGuard)
export class DocumentTagController {
  constructor(private readonly tagService: DocumentTagService) {}

  @Get()
  @ApiOperation({ summary: 'List all tags' })
  @ApiResponse({ status: 200, description: '返回标签列表' })
  async list(@Query('projectId') projectId?: string) {
    const data = await this.tagService.listTags({ projectId });
    return { data };
  }

  @Post()
  @ApiOperation({ summary: 'Create a tag' })
  @ApiResponse({ status: 201, description: '标签已创建' })
  async create(@Body() body: CreateTagInput) {
    const data = await this.tagService.createTag(body);
    return { data };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a tag' })
  @ApiParam({ name: 'id', description: '标签 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async update(@Param('id') id: string, @Body() body: UpdateTagInput) {
    const data = await this.tagService.updateTag(id, body);
    return { data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tag' })
  @ApiParam({ name: 'id', description: '标签 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(@Param('id') id: string) {
    const data = await this.tagService.deleteTag(id);
    return { data };
  }
}

@ApiTags('Document Tags')
@ApiBearerAuth('JWT-auth')
@Controller('documents/:id/tags')
@UseGuards(JwtAuthGuard)
export class DocumentTagLinkController {
  constructor(private readonly tagService: DocumentTagService) {}

  @Get()
  @ApiOperation({ summary: 'List tags attached to a document' })
  @ApiParam({ name: 'id', description: '文档 ID' })
  @ApiResponse({ status: 200, description: '返回标签列表' })
  async list(@Param('id') id: string) {
    const data = await this.tagService.getTagsByDocument(id);
    return data;
  }

  @Post()
  @ApiOperation({ summary: 'Attach a tag to a document' })
  @ApiParam({ name: 'id', description: '文档 ID' })
  @ApiResponse({ status: 201, description: '已附加' })
  async attach(@Param('id') id: string, @Body() body: { tagId: string }) {
    await this.tagService.addTagToDocument(id, body.tagId);
  }

  @Delete(':tagId')
  @ApiOperation({ summary: 'Detach a tag from a document' })
  @ApiParam({ name: 'id', description: '文档 ID' })
  @ApiParam({ name: 'tagId', description: '标签 ID' })
  @ApiResponse({ status: 200, description: '已分离' })
  async detach(@Param('id') id: string, @Param('tagId') tagId: string) {
    await this.tagService.removeTagFromDocument(id, tagId);
  }
}
