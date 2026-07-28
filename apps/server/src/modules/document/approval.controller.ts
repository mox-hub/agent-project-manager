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
import { ApprovalService } from './approval.service';
import { SubmitApprovalDto, ResolveApprovalDto, ApprovalQueryDto } from './dto/approval.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Document Approvals')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Post(':documentId/approval')
  @ApiOperation({ summary: '提交文档审阅' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 201, description: '审阅已提交' })
  submitForReview(
    @Param('documentId') documentId: string,
    @Body() dto: SubmitApprovalDto,
    @CurrentUser() user: any,
  ) {
    return this.approvalService.submitForReview(documentId, user.id, dto);
  }

  @Get('approvals')
  @ApiOperation({ summary: '获取审批列表' })
  @ApiResponse({ status: 200, description: '返回审批列表' })
  findAll(@Query() query: ApprovalQueryDto) {
    return this.approvalService.findAll(query);
  }

  @Get('approvals/pending')
  @ApiOperation({ summary: '获取当前用户待审批' })
  @ApiResponse({ status: 200, description: '返回待审批列表' })
  getPendingApprovals(@CurrentUser() user: any, @Query('myDocuments') myDocuments?: string) {
    return this.approvalService.getPendingApprovals(myDocuments === 'true' ? user.id : undefined);
  }

  @Get('approvals/:id')
  @ApiOperation({ summary: '获取审批详情' })
  @ApiParam({ name: 'id', description: 'Approval ID' })
  @ApiResponse({ status: 200, description: '返回审批详情' })
  @ApiResponse({ status: 404, description: '审批不存在' })
  findOne(@Param('id') id: string) {
    return this.approvalService.findOne(id);
  }

  @Post('approvals/:id/resolve')
  @ApiOperation({ summary: '解决审批' })
  @ApiParam({ name: 'id', description: 'Approval ID' })
  @ApiResponse({ status: 200, description: '已解决' })
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveApprovalDto,
    @CurrentUser() user: any,
  ) {
    return this.approvalService.resolve(id, user.id, dto);
  }

  @Delete('approvals/:id')
  @ApiOperation({ summary: '取消审批' })
  @ApiParam({ name: 'id', description: 'Approval ID' })
  @ApiResponse({ status: 200, description: '已取消' })
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.approvalService.cancel(id, user.id);
  }
}
