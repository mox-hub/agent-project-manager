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
import { ApprovalService } from './approval.service';
import { SubmitApprovalDto, ResolveApprovalDto, ApprovalQueryDto } from './dto/approval.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@ApiTags('Document Approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Post(':documentId/approval')
  @ApiOperation({ summary: 'Submit document for review' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  submitForReview(
    @Param('documentId') documentId: string,
    @Body() dto: SubmitApprovalDto,
    @CurrentUser() user: any,
  ) {
    return this.approvalService.submitForReview(documentId, user.id, dto);
  }

  @Get('approvals')
  @ApiOperation({ summary: 'Get all approvals with filters' })
  findAll(@Query() query: ApprovalQueryDto) {
    return this.approvalService.findAll(query);
  }

  @Get('approvals/pending')
  @ApiOperation({ summary: 'Get pending approvals for current user' })
  getPendingApprovals(@CurrentUser() user: any, @Query('myDocuments') myDocuments?: string) {
    return this.approvalService.getPendingApprovals(myDocuments === 'true' ? user.id : undefined);
  }

  @Get('approvals/:id')
  @ApiOperation({ summary: 'Get approval by ID' })
  @ApiParam({ name: 'id', description: 'Approval ID' })
  findOne(@Param('id') id: string) {
    return this.approvalService.findOne(id);
  }

  @Post('approvals/:id/resolve')
  @ApiOperation({ summary: 'Resolve approval (approve or reject)' })
  @ApiParam({ name: 'id', description: 'Approval ID' })
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveApprovalDto,
    @CurrentUser() user: any,
  ) {
    return this.approvalService.resolve(id, user.id, dto);
  }

  @Delete('approvals/:id')
  @ApiOperation({ summary: 'Cancel pending approval' })
  @ApiParam({ name: 'id', description: 'Approval ID' })
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.approvalService.cancel(id, user.id);
  }
}
