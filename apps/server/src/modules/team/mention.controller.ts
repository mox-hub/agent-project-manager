import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { MentionService } from './mention.service';
import { CreateMentionDto, ParseMentionsDto } from './dto/mention.dto';

@ApiTags('Mentions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('mentions')
export class MentionController {
  constructor(private readonly service: MentionService) {}

  @Post()
  @ApiOperation({ summary: '创建单条 Mention' })
  async create(
    @Body() dto: CreateMentionDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.create({ ...dto });
  }

  @Post('parse')
  @ApiOperation({ summary: '解析 @handle 文本并写入 Mention' })
  async parse(
    @Body() dto: ParseMentionsDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.parseAndCreate(dto, req.user.id);
  }

  @Get('member/:memberId')
  @ApiOperation({ summary: '某 Member 的 Mention 列表' })
  async listByMember(
    @Param('memberId') memberId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listByMember(
      memberId,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('source/:sourceType/:sourceId')
  @ApiOperation({ summary: '某资源上的 Mention 列表' })
  async listBySource(
    @Param('sourceType') sourceType: string,
    @Param('sourceId') sourceId: string,
  ) {
    return this.service.listBySource(sourceType, sourceId);
  }

  @Get('suggest')
  @ApiOperation({ summary: '@ 自动补全建议' })
  async suggest(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.service.suggest(q, limit ? Number(limit) : undefined);
  }
}
