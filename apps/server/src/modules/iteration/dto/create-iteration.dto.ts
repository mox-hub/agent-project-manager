import { IsString, IsOptional, IsDateString, IsInt } from 'class-validator';

export class CreateIterationDto {
  @IsString()
  projectId: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  goal?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsInt()
  @IsOptional()
  capacity?: number;
}
