import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Board, BoardMember, BoardRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ROLE_RANK: Record<BoardRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  OWNER: 3,
};

@Injectable()
export class BoardAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assert that `userId` is a member of `boardId` with at least the given
   * role, returning the membership record. Throws ForbiddenException otherwise.
   */
  async assertAccess(
    userId: string,
    boardId: string,
    minRole: BoardRole = BoardRole.VIEWER,
  ): Promise<BoardMember> {
    const member = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });

    if (!member) {
      throw new ForbiddenException('You do not have access to this board.');
    }

    if (ROLE_RANK[member.role] < ROLE_RANK[minRole]) {
      throw new ForbiddenException(
        'You do not have permission to perform this action.',
      );
    }

    return member;
  }

  /** Assert the board exists. */
  async assertBoardExists(boardId: string): Promise<Board> {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      throw new NotFoundException('Board not found.');
    }
    return board;
  }

  /** Ids of every board the user is a member of (any role). */
  async getAccessibleBoardIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.boardMember.findMany({
      where: { userId },
      select: { boardId: true },
    });
    return memberships.map((m) => m.boardId);
  }
}