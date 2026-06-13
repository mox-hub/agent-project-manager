import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentQueryDto } from './dto/document-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new document' })
  create(
    @Body() createDocumentDto: CreateDocumentDto,
    @CurrentUser() user: any,
  ) {
    return this.documentService.create(createDocumentDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents with pagination' })
  findAll(@Query() query: DocumentQueryDto) {
    return this.documentService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get document statistics' })
  getStats(@Query('projectId') projectId?: string) {
    return this.documentService.getStats(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document by ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  findOne(@Param('id') id: string) {
    return this.documentService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    return this.documentService.update(id, updateDocumentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document (soft delete)' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  remove(@Param('id') id: string) {
    return this.documentService.remove(id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a deleted document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  restore(@Param('id') id: string) {
    return this.documentService.restore(id);
  }
}
