import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class MoveColumnDto {
  @IsInt()
  @Min(0)
  @Type(() => Number)
  index: number;
}