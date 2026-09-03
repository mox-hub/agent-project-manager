import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AssistantConversationQueryDto {
  @ApiProperty({
    description: 'Project scope; omit for workspace-level session',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectId?: string;
}

export class AssistantSendMessageDto {
  @ApiProperty({ description: 'User message content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'Project scope; omit for workspace-level session',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectId?: string;
}

export class AssistantDispatchDto {
  @ApiProperty({ description: 'Instruction to execute on the CLI runtime' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'Project scope (required for execution)' })
  @IsString()
  @IsNotEmpty()
  projectId: string;
}
