import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateTaskDependencyDto {
  @IsString()
  dependsOnTaskId: string;

  @IsIn(['blocks', 'relates'])
  @IsOptional()
  type?: 'blocks' | 'relates';
}
