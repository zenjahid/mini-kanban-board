import { BoardRole } from '@prisma/client';
import { IsEmail, IsEnum } from 'class-validator';

// Board ownership is fixed at creation; shared members may only ever be
// EDITOR or VIEWER. OWNER is rejected at the service layer.
export class AddMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(BoardRole)
  role: BoardRole;
}