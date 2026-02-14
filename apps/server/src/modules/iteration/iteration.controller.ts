import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { IterationService } from './iteration.service';
import { CreateIterationDto } from './dto/create-iteration.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@ApiTags('Iterations')
@Controller('iterations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class IterationController {
  constructor(private readonly iterationService: IterationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new iteration' })
  @ApiResponse({ status: 201, description: 'Iteration created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Body() createIterationDto: CreateIterationDto,
    @CurrentUser() user: any,
  ) {
    return this.iterationService.create(createIterationDto, user.id);
  }

  @Get('projects/:projectId')
  @ApiOperation({ summary: 'Get iterations for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Returns list of iterations' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Param('projectId') projectId: string, @CurrentUser() user: any) {
    return this.iterationService.findAll(projectId, user.id);
  }
}
