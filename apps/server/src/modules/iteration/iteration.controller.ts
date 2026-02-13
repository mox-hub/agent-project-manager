import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { IterationService } from './iteration.service';
import { CreateIterationDto } from './dto/create-iteration.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@Controller('iterations')
@UseGuards(JwtAuthGuard)
export class IterationController {
  constructor(private readonly iterationService: IterationService) {}

  @Post()
  create(@Body() createIterationDto: CreateIterationDto, @CurrentUser() user: any) {
    return this.iterationService.create(createIterationDto, user.id);
  }

  @Get('projects/:projectId')
  findAll(@Param('projectId') projectId: string, @CurrentUser() user: any) {
    return this.iterationService.findAll(projectId, user.id);
  }
}
