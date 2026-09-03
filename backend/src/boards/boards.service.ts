import { Injectable } from '@nestjs/common';
import { BoardRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BoardAccessService } from '../authorization/board-access.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@Injectable()
export class BoardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BoardAccessService,
  ) {}

  /** Boards the user is a member of, newest first. */
  async list(userId: string) {
    const memberships = await this.prisma.boardMember.findMany({
      where: { userId },
      orderBy: { board: { updatedAt: 'desc' } },
      include: {
        board: {
          include: {
            owner: { select: { id: true, name: true } },
            _count: { select: { columns: true } },
          },
        },
      },
    });

    return memberships.map((m) => ({
      id: m.board.id,
      name: m.board.name,
      ownerId: m.board.ownerId,
      ownerName: m.board.owner.name,
      role: m.role,
      columnCount: m.board._count.columns,
      updatedAt: m.board.updatedAt,
    }));
  }

  async create(userId: string, dto: CreateBoardDto) {
    const board = await this.prisma.board.create({
      data: {
        name: dto.name.trim(),
        ownerId: userId,
        members: {
          create: [{ userId, role: BoardRole.OWNER }],
        },
        columns: {
          create: [
            { name: 'Backlog', position: 1000 },
            { name: 'In Progress', position: 2000 },
            { name: 'Done', position: 3000 },
          ],
        },
      },
      include: { owner: { select: { id: true, name: true } } },
    });

    return {
      id: board.id,
      name: board.name,
      ownerId: board.ownerId,
      ownerName: board.owner.name,
      role: BoardRole.OWNER,
      columnCount: 3,
      updatedAt: board.updatedAt,
    };
  }

  /** Full board view: columns (with ordered tasks) and members. */
  async getFullBoard(userId: string, boardId: string) {
    await this.access.assertAccess(userId, boardId, BoardRole.VIEWER);

    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        columns: {
          orderBy: { position: 'asc' },
          include: {
            tasks: {
              orderBy: { position: 'asc' },
              include: {
                assignee: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
    });

    if (!board) {
      await this.access.assertBoardExists(boardId);
    }

    return this.serializeBoard(board);
  }

  async update(userId: string, boardId: string, dto: UpdateBoardDto) {
    await this.access.assertAccess(userId, boardId, BoardRole.EDITOR);
    await this.access.assertBoardExists(boardId);

    const board = await this.prisma.board.update({
      where: { id: boardId },
      data: { name: dto.name?.trim() },
      include: { owner: { select: { id: true, name: true } } },
    });

    return {
      id: board.id,
      name: board.name,
      ownerId: board.ownerId,
      ownerName: board.owner.name,
      updatedAt: board.updatedAt,
    };
  }

  async remove(userId: string, boardId: string) {
    await this.access.assertAccess(userId, boardId, BoardRole.OWNER);
    await this.prisma.board.delete({ where: { id: boardId } });
    return { ok: true };
  }

  // --- Shared serializer helpers (used by columns/tasks services too) ---

  serializeBoard(board: any) {
    return {
      id: board.id,
      name: board.name,
      ownerId: board.ownerId,
      owner: board.owner,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
      members: board.members.map((m: any) => ({
        id: m.id,
        role: m.role,
        user: m.user,
      })),
      columns: board.columns.map((c: any) => ({
        id: c.id,
        name: c.name,
        position: c.position,
        tasks: c.tasks.map((t: any) => ({
          id: t.id,
          columnId: t.columnId,
          title: t.title,
          description: t.description,
          position: t.position,
          assignee: t.assignee,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
      })),
    };
  }
}