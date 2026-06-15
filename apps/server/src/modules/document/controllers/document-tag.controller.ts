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
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import {
  DocumentTagService,
  type CreateTagInput,
  type UpdateTagInput,
} from '../services/document-tag.service';

@ApiTags('Document Tags')
@Controller('documents/tags')
@UseGuards(JwtAuthGuard)
export class DocumentTagController {
  constructor(private readonly tagService: DocumentTagService) {}

  @Get()
  @ApiOperation({ summary: 'List all tags' })
  async list(@Query('projectId') projectId?: string) {
    const data = await this.tagService.listTags({ projectId });
    return { data };
  }

  @Post()
  @ApiOperation({ summary: 'Create a tag' })
  async create(@Body() body: CreateTagInput) {
    const data = await this.tagService.createTag(body);
    return { data };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a tag' })
  async update(@Param('id') id: string, @Body() body: UpdateTagInput) {
    const data = await this.tagService.updateTag(id, body);
    return { data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tag' })
  async remove(@Param('id') id: string) {
    const data = await this.tagService.deleteTag(id);
    return { data };
  }
}

@ApiTags('Document Tags')
@Controller('documents/:id/tags')
@UseGuards(JwtAuthGuard)
export class DocumentTagLinkController {
  constructor(private readonly tagService: DocumentTagService) {}

  @Get()
  @ApiOperation({ summary: 'List tags attached to a document' })
  async list(@Param('id') id: string) {
    const data = await this.tagService.getTagsByDocument(id);
    return { data };
  }

  @Post()
  @ApiOperation({ summary: 'Attach a tag to a document' })
  async attach(@Param('id') id: string, @Body() body: { tagId: string }) {
    await this.tagService.addTagToDocument(id, body.tagId);
    return { data: { ok: true } };
  }

  @Delete(':tagId')
  @ApiOperation({ summary: 'Detach a tag from a document' })
  async detach(@Param('id') id: string, @Param('tagId') tagId: string) {
    await this.tagService.removeTagFromDocument(id, tagId);
    return { data: { ok: true } };
  }
}
