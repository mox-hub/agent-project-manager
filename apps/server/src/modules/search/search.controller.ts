import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { SearchService } from './search.service';
import { SearchQueryDto, SearchResponseDto } from './dto/search.dto';

/**
 * 全局搜索（P0-4）：前端 apps/frontend/src/modules/search 页面此前调用
 * GET /search 恒 404（死链），本控制器按前端既有契约（search-api.ts）补齐后端。
 */
@ApiTags('Search')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: '全局搜索（工单/文档/项目，按项目成员可见性过滤）',
  })
  @ApiOkResponse({
    description: '扁平命中列表（前端按 type 分组渲染）',
    type: SearchResponseDto,
  })
  @ApiStandardErrors()
  search(@Query() query: SearchQueryDto, @CurrentUser() user: { id: string }) {
    // axios 默认将数组参数序列化为 types[]=a&types[]=b（带方括号键），
    // 与 msw mock 的 getAll('types') 习惯一致地在此归一，避免 400
    const bracket = (query as unknown as Record<string, unknown>)['types[]'];
    const normalized: SearchQueryDto =
      bracket != null && query.types == null
        ? { ...query, types: bracket as string[] | string }
        : query;
    return this.searchService.search(normalized, user.id);
  }
}
