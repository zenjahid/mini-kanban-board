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
import { BoardsService } from './boards.service';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { BoardAccessGuard } from '../authorization/board-access.guard';
import { RequireBoardRole } from '../authorization/require-board-role.decorator';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@Controller('boards')
export class BoardsController {
  constructor(private readonly boards: BoardsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.boards.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBoardDto) {
    return this.boards.create(user.id, dto);
  }

  @Get(':boardId')
  @UseGuards(BoardAccessGuard)
  @RequireBoardRole(BoardRole.VIEWER)
  get(@CurrentUser() user: AuthUser, @Param('boardId') boardId: string) {
    return this.boards.getFullBoard(user.id, boardId);
  }

  @Patch(':boardId')
  @UseGuards(BoardAccessGuard)
  @RequireBoardRole(BoardRole.EDITOR)
  update(
    @CurrentUser() user: AuthUser,
    @Param('boardId') boardId: string,
    @Body() dto: UpdateBoardDto,
  ) {
    return this.boards.update(user.id, boardId, dto);
  }

  @Delete(':boardId')
  @UseGuards(BoardAccessGuard)
  @RequireBoardRole(BoardRole.OWNER)
  remove(@CurrentUser() user: AuthUser, @Param('boardId') boardId: string) {
    return this.boards.remove(user.id, boardId);
  }
}