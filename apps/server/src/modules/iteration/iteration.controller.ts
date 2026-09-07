import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { IterationService } from './iteration.service';
import { CreateIterationDto } from './dto/create-iteration.dto';
import { UpdateIterationDto } from './dto/update-iteration.dto';
import { IterationResponseDto } from './dto/iteration-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Iterations')
@Controller('iterations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class IterationController {
  constructor(private readonly iterationService: IterationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new iteration' })
  @ApiCreatedResponse({
    type: IterationResponseDto,
    description: 'Iteration created successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Body() createIterationDto: CreateIterationDto,
    @CurrentUser() user: any,
  ) {
    return this.iterationService.create(createIterationDto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update iteration (name/goal/dates/status)' })
  @ApiParam({ name: 'id', description: 'Iteration ID' })
  @ApiOkResponse({
    type: IterationResponseDto,
    description: 'Iteration updated',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateIterationDto,
    @CurrentUser() user: any,
  ) {
    return this.iterationService.update(id, dto, user.id);
  }

  @Get('projects/:projectId')
  @ApiOperation({ summary: 'Get iterations for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiOkResponse({
    type: IterationResponseDto,
    isArray: true,
    description: 'Returns list of iterations',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Param('projectId') projectId: string, @CurrentUser() user: any) {
    return this.iterationService.findAll(projectId, user.id);
  }
}
