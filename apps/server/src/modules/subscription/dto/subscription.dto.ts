import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export const SUBSCRIPTION_ENTITY_TYPES = [
  'project',
  'task',
  'bug',
  'document',
  'acceptance',
  'repository',
  'member',
  'team',
] as const;

export class SubscriptionListQueryDto {
  @ApiProperty({ description: 'Entity type' })
  @IsIn(SUBSCRIPTION_ENTITY_TYPES)
  entityType: string;

  @ApiProperty({ description: 'Entity id' })
  @IsString()
  @IsNotEmpty()
  entityId: string;
}

export class SubscriptionSetDto {
  @ApiProperty({ description: 'Entity type' })
  @IsIn(SUBSCRIPTION_ENTITY_TYPES)
  entityType: string;

  @ApiProperty({ description: 'Entity id' })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({
    description: 'Full subscriber member id list (replace semantics)',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  memberIds?: string[];
}
