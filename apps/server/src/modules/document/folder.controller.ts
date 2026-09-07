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
  ApiResponse,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { FolderService } from './folder.service';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';
import {
  DocumentFolderResponseDto,
  DocumentFolderListItemDto,
  DocumentFolderTreeNodeDto,
  DocumentFolderDetailResponseDto,
} from './dto/folder-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';

@ApiTags('Document Folders')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('documents/folders')
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @Post()
  @ApiOperation({ summary: '创建文件夹' })
  @ApiStandardErrors()
  @ApiCreatedResponse({
    type: DocumentFolderResponseDto,
    description: '返回创建后的文件夹',
  })
  create(@Body() createFolderDto: CreateFolderDto) {
    return this.folderService.create(createFolderDto);
  }

  @Get()
  @ApiOperation({ summary: '获取文件夹列表' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: DocumentFolderListItemDto,
    isArray: true,
    description: '文件夹列表（含 _count，按 order 升序）',
  })
  findAll(@Query('projectId') projectId?: string) {
    return this.folderService.findAll(projectId);
  }

  @Get('tree')
  @ApiOperation({ summary: '获取文件夹树结构' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: DocumentFolderTreeNodeDto,
    isArray: true,
    description: '文件夹树（根节点数组，children 递归嵌套，节点含 _count）',
  })
  getTree(@Query('projectId') projectId?: string) {
    return this.folderService.getTree(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取文件夹详情' })
  @ApiParam({ name: 'id', description: 'Folder ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: DocumentFolderDetailResponseDto,
    description: '文件夹详情（含 parent/children/documents/_count）',
  })
  findOne(@Param('id') id: string) {
    return this.folderService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新文件夹' })
  @ApiParam({ name: 'id', description: 'Folder ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: DocumentFolderResponseDto,
    description: '返回更新后的文件夹',
  })
  update(@Param('id') id: string, @Body() updateFolderDto: UpdateFolderDto) {
    return this.folderService.update(id, updateFolderDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除文件夹' })
  @ApiParam({ name: 'id', description: 'Folder ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  remove(@Param('id') id: string, @Query('force') force?: string) {
    return this.folderService.remove(id, force === 'true');
  }
}
