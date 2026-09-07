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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiResponse,
} from '@nestjs/swagger';
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
@ApiBearerAuth('JWT-auth')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get configuration values' })
  // 返回 Record<string, any>（key→value 合并视图），用 inline schema 而非 DTO
  @ApiOkResponse({
    description: '返回配置键值对',
    schema: { type: 'object', additionalProperties: true },
  })
  async getConfig(@Query() query: GetConfigQueryDto, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    return await this.configService.getConfig(
      {
        scope: query.scope,
        projectId: query.projectId,
        userId: query.userId,
        keys: query.keys,
      },
      userId,
    );
  }

  @Put()
  @ApiOperation({ summary: 'Set configuration values' })
  @ApiOkResponse({
    description: '返回写入后的键值对',
    schema: { type: 'object', additionalProperties: true },
  })
  async setConfig(@Body() dto: SetConfigDto, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    return await this.configService.setConfig(dto, userId);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete configuration keys' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteConfig(@Body() dto: DeleteConfigDto, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    await this.configService.deleteConfig(
      dto.scope,
      dto.keys,
      dto.projectId,
      dto.userId,
      userId,
    );

    return null;
  }
}
