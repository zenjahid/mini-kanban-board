import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BoardRole } from '@prisma/client';
import { TasksService } from './tasks.service';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { BoardAccessGuard } from '../authorization/board-access.guard';
import { RequireBoardRole } from '../authorization/require-board-role.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';

@Controller('boards/:boardId')
@UseGuards(BoardAccessGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get('tasks')
  @RequireBoardRole(BoardRole.VIEWER)
  list(@CurrentUser() user: AuthUser, @Param('boardId') boardId: string) {
    return this.tasks.list(user.id, boardId);
  }

  @Post('columns/:columnId/tasks')
  @RequireBoardRole(BoardRole.EDITOR)
  create(
    @CurrentUser() user: AuthUser,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.create(user.id, boardId, columnId, dto);
  }

  @Patch('tasks/:taskId')
  @RequireBoardRole(BoardRole.EDITOR)
  update(
    @CurrentUser() user: AuthUser,
    @Param('boardId') boardId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(user.id, boardId, taskId, dto);
  }

  @Patch('tasks/:taskId/move')
  @RequireBoardRole(BoardRole.EDITOR)
  move(
    @CurrentUser() user: AuthUser,
    @Param('boardId') boardId: string,
    @Param('taskId') taskId: string,
    @Body() dto: MoveTaskDto,
  ) {
    return this.tasks.move(user.id, boardId, taskId, dto);
  }

  @Delete('tasks/:taskId')
  @RequireBoardRole(BoardRole.EDITOR)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('boardId') boardId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasks.remove(user.id, boardId, taskId);
  }
}