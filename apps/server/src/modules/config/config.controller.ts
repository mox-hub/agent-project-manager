import {
  Controller,
  Get,
  Put,
  Delete,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from './config.service';
import {
  GetConfigQueryDto,
  SetConfigDto,
  DeleteConfigDto,
} from './dto/config.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@ApiTags('Config')
@Controller('config')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get configuration values' })
  async getConfig(@Query() query: GetConfigQueryDto, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    const config = await this.configService.getConfig(
      {
        scope: query.scope,
        projectId: query.projectId,
        userId: query.userId,
        keys: query.keys,
      },
      userId,
    );

    return { data: config };
  }

  @Put()
  @ApiOperation({ summary: 'Set configuration values' })
  async setConfig(@Body() dto: SetConfigDto, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    const config = await this.configService.setConfig(dto, userId);

    return { data: config };
  }

  @Delete()
  @ApiOperation({ summary: 'Delete configuration keys' })
  async deleteConfig(@Body() dto: DeleteConfigDto, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    await this.configService.deleteConfig(
      dto.scope,
      dto.keys,
      dto.projectId,
      dto.userId,
      userId,
    );

    return { message: 'Configuration deleted successfully' };
  }
}
