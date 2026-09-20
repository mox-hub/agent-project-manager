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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { MentionService } from './mention.service';
import { CreateMentionDto, ParseMentionsDto } from './dto/mention.dto';
import {
  MentionParseResponseDto,
  MentionResponseDto,
  MentionWithMemberDto,
} from './dto/mention-response.dto';
import { MemberSummaryResponseDto } from './dto/member-response.dto';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';

@ApiTags('Mentions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('mentions')
export class MentionController {
  constructor(private readonly service: MentionService) {}

  @Post()
  @ApiOperation({ summary: '创建单条 Mention' })
  @ApiResponse({ status: 201, description: 'Mention 已创建' })
  @ApiStandardErrors()
  @ApiCreatedResponse({ type: MentionResponseDto })
  async create(
    @Body() dto: CreateMentionDto,
    @Request() _req: { user: { id: string } },
  ) {
    return this.service.create({ ...dto });
  }

  @Post('parse')
  @ApiOperation({ summary: '解析 @handle 文本并写入 Mention' })
  @ApiResponse({ status: 201, description: '解析成功' })
  @ApiStandardErrors()
  @ApiCreatedResponse({ type: MentionParseResponseDto })
  async parse(
    @Body() dto: ParseMentionsDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.parseAndCreate(dto, req.user.id);
  }

  @Get('member/:memberId')
  @ApiOperation({ summary: '某 Member 的 Mention 列表' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: MentionResponseDto,
    isArray: true,
    description: '返回 Mention 列表',
  })
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
  @ApiParam({ name: 'sourceType', description: '来源类型' })
  @ApiParam({ name: 'sourceId', description: '来源 ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: MentionWithMemberDto,
    isArray: true,
    description: '返回 Mention 列表（含被提及成员摘要）',
  })
  async listBySource(
    @Param('sourceType') sourceType: string,
    @Param('sourceId') sourceId: string,
  ) {
    return this.service.listBySource(sourceType, sourceId);
  }

  @Get('suggest')
  @ApiOperation({ summary: '@ 自动补全建议' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: MemberSummaryResponseDto,
    isArray: true,
    description: '返回建议列表（成员摘要）',
  })
  async suggest(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.service.suggest(q, limit ? Number(limit) : undefined);
  }
}
