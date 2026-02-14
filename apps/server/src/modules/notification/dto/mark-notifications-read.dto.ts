import { IsArray, IsString } from 'class-validator';

export class MarkNotificationsReadDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
