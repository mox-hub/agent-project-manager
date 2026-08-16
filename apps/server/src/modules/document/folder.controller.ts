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
} from '@nestjs/swagger';
import { FolderService } from './folder.service';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Document Folders')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('documents/folders')
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @Post()
  @ApiOperation({ summary: '创建文件夹' })
  @ApiResponse({ status: 201, description: '创建成功' })
  create(@Body() createFolderDto: CreateFolderDto) {
    return this.folderService.create(createFolderDto);
  }

  @Get()
  @ApiOperation({ summary: '获取文件夹列表' })
  @ApiResponse({ status: 200, description: '返回文件夹列表' })
  findAll(@Query('projectId') projectId?: string) {
    return this.folderService.findAll(projectId);
  }

  @Get('tree')
  @ApiOperation({ summary: '获取文件夹树结构' })
  @ApiResponse({ status: 200, description: '返回树结构' })
  getTree(@Query('projectId') projectId?: string) {
    return this.folderService.getTree(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取文件夹详情' })
  @ApiParam({ name: 'id', description: 'Folder ID' })
  @ApiResponse({ status: 200, description: '返回文件夹详情' })
  findOne(@Param('id') id: string) {
    return this.folderService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新文件夹' })
  @ApiParam({ name: 'id', description: 'Folder ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
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
