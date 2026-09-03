import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BoardRole } from '@prisma/client';
import { BOARD_ROLES_KEY } from './require-board-role.decorator';
import { BoardAccessService } from './board-access.service';

/**
 * Route guard for board-scoped authorization. Reads the required roles from
 * the @RequireBoardRole() decorator and checks the authenticated user's
 * membership of the board identified by the `:boardId` route parameter.
 */
@Injectable()
export class BoardAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: BoardAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<BoardRole[]>(
      BOARD_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    if (!userId) {
      throw new BadRequestException('Authenticated user not found.');
    }

    const boardId = request.params?.boardId;
    if (!boardId) {
      throw new BadRequestException('Missing :boardId route parameter.');
    }

    // `required` is a list of allowed roles; the caller must hold the least
    // privileged of them, since roles are nested (OWNER > EDITOR > VIEWER).
    const minRank = Math.min(
      ...required.map((r) => ({ VIEWER: 1, EDITOR: 2, OWNER: 3 })[r]),
    );
    const minRole: BoardRole = (['VIEWER', 'EDITOR', 'OWNER'] as const)[
      minRank - 1
    ];

    const member = await this.access.assertAccess(userId, boardId, minRole);
    request.boardMember = member;
    return true;
  }
}