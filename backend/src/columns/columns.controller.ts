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
import { ColumnsService } from './columns.service';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { BoardAccessGuard } from '../authorization/board-access.guard';
import { RequireBoardRole } from '../authorization/require-board-role.decorator';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { MoveColumnDto } from './dto/move-column.dto';

@Controller('boards/:boardId/columns')
@UseGuards(BoardAccessGuard)
export class ColumnsController {
  constructor(private readonly columns: ColumnsService) {}

  @Get()
  @RequireBoardRole(BoardRole.VIEWER)
  list(@CurrentUser() user: AuthUser, @Param('boardId') boardId: string) {
    return this.columns.list(user.id, boardId);
  }

  @Post()
  @RequireBoardRole(BoardRole.EDITOR)
  create(
    @CurrentUser() user: AuthUser,
    @Param('boardId') boardId: string,
    @Body() dto: CreateColumnDto,
  ) {
    return this.columns.create(user.id, boardId, dto);
  }

  @Patch(':columnId')
  @RequireBoardRole(BoardRole.EDITOR)
  update(
    @CurrentUser() user: AuthUser,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Body() dto: UpdateColumnDto,
  ) {
    return this.columns.update(user.id, boardId, columnId, dto);
  }

  @Patch(':columnId/move')
  @RequireBoardRole(BoardRole.EDITOR)
  move(
    @CurrentUser() user: AuthUser,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Body() dto: MoveColumnDto,
  ) {
    return this.columns.move(user.id, boardId, columnId, dto);
  }

  @Delete(':columnId')
  @RequireBoardRole(BoardRole.EDITOR)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
  ) {
    return this.columns.remove(user.id, boardId, columnId);
  }
}