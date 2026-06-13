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
import { FolderService } from './folder.service';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Document Folders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents/folders')
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new folder' })
  create(@Body() createFolderDto: CreateFolderDto) {
    return this.folderService.create(createFolderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all folders' })
  findAll(@Query('projectId') projectId?: string) {
    return this.folderService.findAll(projectId);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get folder tree structure' })
  getTree(@Query('projectId') projectId?: string) {
    return this.folderService.getTree(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a folder by ID with contents' })
  @ApiParam({ name: 'id', description: 'Folder ID' })
  findOne(@Param('id') id: string) {
    return this.folderService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a folder' })
  @ApiParam({ name: 'id', description: 'Folder ID' })
  update(@Param('id') id: string, @Body() updateFolderDto: UpdateFolderDto) {
    return this.folderService.update(id, updateFolderDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a folder' })
  @ApiParam({ name: 'id', description: 'Folder ID' })
  remove(@Param('id') id: string, @Query('force') force?: string) {
    return this.folderService.remove(id, force === 'true');
  }
}
