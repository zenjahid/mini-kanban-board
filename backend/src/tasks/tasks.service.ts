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
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BoardAccessService,
    private readonly boards: BoardsService,
  ) {}

  async list(userId: string, boardId: string) {
    await this.access.assertAccess(userId, boardId, BoardRole.VIEWER);
    return this.prisma.task.findMany({
      where: { column: { boardId } },
      orderBy: [{ column: { position: 'asc' } }, { position: 'asc' }],
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async create(
    userId: string,
    boardId: string,
    columnId: string,
    dto: CreateTaskDto,
  ) {
    await this.access.assertAccess(userId, boardId, BoardRole.EDITOR);
    await this.assertColumnInBoard(columnId, boardId);
    await this.assertAssigneeInBoard(boardId, dto.assigneeId);

    const last = await this.prisma.task.findFirst({
      where: { columnId },
      orderBy: { position: 'desc' },
    });

    await this.prisma.task.create({
      data: {
        columnId,
        title: dto.title.trim(),
        description: dto.description ?? null,
        assigneeId: dto.assigneeId ?? null,
        position: last ? last.position + POSITION_GAP : POSITION_GAP,
      },
    });

    return this.boards.getFullBoard(userId, boardId);
  }

  async update(
    userId: string,
    boardId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ) {
    await this.access.assertAccess(userId, boardId, BoardRole.EDITOR);
    await this.assertTaskInBoard(taskId, boardId);
    if (dto.assigneeId !== undefined) {
      await this.assertAssigneeInBoard(boardId, dto.assigneeId);
    }

    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: dto.title !== undefined ? dto.title.trim() : undefined,
        description: dto.description,
        assigneeId: dto.assigneeId,
      },
    });

    return this.boards.getFullBoard(userId, boardId);
  }

  async remove(userId: string, boardId: string, taskId: string) {
    await this.access.assertAccess(userId, boardId, BoardRole.EDITOR);
    await this.assertTaskInBoard(taskId, boardId);

    await this.prisma.task.delete({ where: { id: taskId } });

    return this.boards.getFullBoard(userId, boardId);
  }

  /**
   * Move a task within its column or across columns to a specific index.
   *
   * Ordering is a fractional index. The task is inserted between its two
   * neighbors by averaging their positions; if that gap is too small to
   * subdivide safely, the target column is transparently rebalanced. The
   * whole operation runs in a single transaction so order can never be left
   * in a conflicting state.
   */
  async move(userId: string, boardId: string, taskId: string, dto: MoveTaskDto) {
    await this.access.assertAccess(userId, boardId, BoardRole.EDITOR);

    await this.prisma.$transaction(async (tx) => {
      const task = await tx.task.findUnique({
        where: { id: taskId },
        include: { column: true },
      });
      if (!task || task.column.boardId !== boardId) {
        throw new NotFoundException('Task not found in this board.');
      }

      // The target column must belong to the same board (prevents cross-board
      // movement even if the client supplies a foreign column id).
      const targetColumn = await tx.column.findUnique({
        where: { id: dto.columnId },
      });
      if (!targetColumn || targetColumn.boardId !== boardId) {
        throw new BadRequestException('Target column not found in this board.');
      }

      const siblings = await tx.task.findMany({
        where: { columnId: dto.columnId, id: { not: taskId } },
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
        order.splice(dto.index, 0, taskId);
        for (let i = 0; i < order.length; i++) {
          await tx.task.update({
            where: { id: order[i] },
            data: {
              position: (i + 1) * POSITION_GAP,
              columnId: order[i] === taskId ? dto.columnId : undefined,
            },
          });
        }
      } else {
        await tx.task.update({
          where: { id: taskId },
          data: { position, columnId: dto.columnId },
        });
      }
    });

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

  private async assertTaskInBoard(taskId: string, boardId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { column: true },
    });
    if (!task || task.column.boardId !== boardId) {
      throw new NotFoundException('Task not found in this board.');
    }
  }

  private async assertAssigneeInBoard(
    boardId: string,
    assigneeId: string | undefined,
  ) {
    if (!assigneeId) return;
    const member = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: assigneeId } },
    });
    if (!member) {
      throw new BadRequestException(
        'Assignee must be a member of this board.',
      );
    }
  }
}