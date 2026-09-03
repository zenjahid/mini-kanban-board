import { Type } from 'class-transformer';
import { IsInt, IsString, Min } from 'class-validator';

export class MoveTaskDto {
  /** Destination column id. */
  @IsString()
  columnId: string;

  /**
   * Desired 0-based position of the task in the destination column's final
   * order (counting every task in that column, including the moved task when
   * reordering within the same column).
   */
  @IsInt()
  @Min(0)
  @Type(() => Number)
  index: number;
}