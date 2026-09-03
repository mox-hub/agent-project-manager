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

  @ApiProperty({
    description:
      'Explicit conversation id (switch history); omit to follow current',
    required: false,
  })
  @IsOptional()
  @IsString()
  conversationId?: string;
}

export class AssistantCreateConversationDto {
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

  @ApiProperty({
    description: 'Target conversation; omit to use current',
    required: false,
  })
  @IsOptional()
  @IsString()
  conversationId?: string;
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
