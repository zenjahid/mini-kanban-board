import { Type } from 'class-transformer';
import { IsInt, IsString, Min } from 'class-validator';

export class MoveTaskDto {
  /** Destination column id. */
  @IsString()
  columnId: string;

  /**
   * Desired final 0-based index of the task within the destination column,
   * i.e. how many of that column's other tasks should end up before it.
   * Valid from 0 up to the number of tasks in the column (excluding the
   * moving task).
   */
  @IsInt()
  @Min(0)
  @Type(() => Number)
  index: number;
}