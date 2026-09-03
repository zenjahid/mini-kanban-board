import { SetMetadata } from '@nestjs/common';
import { BoardRole } from '@prisma/client';

export const BOARD_ROLES_KEY = 'boardRoles';

/**
 * Requires the caller to be a member of the board referenced by the
 * `:boardId` route parameter, with at least one of the given roles.
 * Enforced by BoardAccessGuard.
 */
export const RequireBoardRole = (...roles: BoardRole[]) =>
  SetMetadata(BOARD_ROLES_KEY, roles);