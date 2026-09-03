import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BoardRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BoardAccessService } from '../authorization/board-access.service';
import {
  computeInsertPosition,
  needsRebalance,
  POSITION_GAP,
} from '../authorization/positioning';
import { BoardsService } from '../boards/boards.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { MoveColumnDto } from './dto/move-column.dto';

@Injectable()
export class ColumnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BoardAccessService,
    private readonly boards: BoardsService,
  ) {}

  async list(userId: string, boardId: string) {
    await this.access.assertAccess(userId, boardId, BoardRole.VIEWER);
    return this.prisma.column.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
      include: {
        tasks: { orderBy: { position: 'asc' } },
      },
    });
  }

  async create(userId: string, boardId: string, dto: CreateColumnDto) {
    await this.access.assertAccess(userId, boardId, BoardRole.EDITOR);
    await this.access.assertBoardExists(boardId);

    const last = await this.prisma.column.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' },
    });

    await this.prisma.column.create({
      data: {
        boardId,
        name: dto.name.trim(),
        position: last ? last.position + POSITION_GAP : POSITION_GAP,
      },
    });

    return this.boards.getFullBoard(userId, boardId);
  }

  async update(
    userId: string,
    boardId: string,
    columnId: string,
    dto: UpdateColumnDto,
  ) {
    await this.access.assertAccess(userId, boardId, BoardRole.EDITOR);
    await this.assertColumnInBoard(columnId, boardId);

    await this.prisma.column.update({
      where: { id: columnId },
      data: { name: dto.name?.trim() },
    });

    return this.boards.getFullBoard(userId, boardId);
  }

  async move(
    userId: string,
    boardId: string,
    columnId: string,
    dto: MoveColumnDto,
  ) {
    await this.access.assertAccess(userId, boardId, BoardRole.EDITOR);

    await this.prisma.$transaction(async (tx) => {
      const column = await tx.column.findUnique({ where: { id: columnId } });
      if (!column || column.boardId !== boardId) {
        throw new NotFoundException('Column not found in this board.');
      }

      const siblings = await tx.column.findMany({
        where: { boardId, id: { not: columnId } },
        orderBy: { position: 'asc' },
        select: { id: true, position: true },
      });

      if (dto.index < 0 || dto.index > siblings.length) {
        throw new BadRequestException('index out of range.');
      }

      const prev = dto.index > 0 ? siblings[dto.index - 1] : undefined;
      const next = dto.index < siblings.length ? siblings[dto.index] : undefined;
      const position = computeInsertPosition(prev?.position, next?.position);

      if (needsRebalance(position, prev?.position, next?.position)) {
        const order = siblings.map((s) => s.id);
        order.splice(dto.index, 0, columnId);
        for (let i = 0; i < order.length; i++) {
          await tx.column.update({
            where: { id: order[i] },
            data: { position: (i + 1) * POSITION_GAP },
          });
        }
      } else {
        await tx.column.update({
          where: { id: columnId },
          data: { position },
        });
      }
    });

    return this.boards.getFullBoard(userId, boardId);
  }

  async remove(userId: string, boardId: string, columnId: string) {
    await this.access.assertAccess(userId, boardId, BoardRole.EDITOR);
    await this.assertColumnInBoard(columnId, boardId);

    await this.prisma.column.delete({ where: { id: columnId } });

    return this.boards.getFullBoard(userId, boardId);
  }

  private async assertColumnInBoard(columnId: string, boardId: string) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
    });
    if (!column || column.boardId !== boardId) {
      throw new NotFoundException('Column not found in this board.');
    }
  }
}