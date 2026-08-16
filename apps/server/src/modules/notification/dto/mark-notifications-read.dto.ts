import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkNotificationsReadDto {
  @ApiProperty({
    description: 'Array of notification IDs to mark as read',
    example: ['notification-1', 'notification-2'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
