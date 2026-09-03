import { BoardRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateMemberRoleDto {
  @IsEnum(BoardRole)
  role: BoardRole;
}