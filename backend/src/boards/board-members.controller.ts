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
import { BoardMembersService } from './board-members.service';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { BoardAccessGuard } from '../authorization/board-access.guard';
import { RequireBoardRole } from '../authorization/require-board-role.decorator';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@Controller('boards/:boardId/members')
@UseGuards(BoardAccessGuard)
export class BoardMembersController {
  constructor(private readonly members: BoardMembersService) {}

  @Get()
  @RequireBoardRole(BoardRole.VIEWER)
  list(@CurrentUser() user: AuthUser, @Param('boardId') boardId: string) {
    return this.members.list(user.id, boardId);
  }

  @Post()
  @RequireBoardRole(BoardRole.OWNER)
  add(
    @CurrentUser() user: AuthUser,
    @Param('boardId') boardId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.members.add(user.id, boardId, dto);
  }

  @Patch(':userId')
  @RequireBoardRole(BoardRole.OWNER)
  updateRole(
    @CurrentUser() user: AuthUser,
    @Param('boardId') boardId: string,
    @Param('userId') memberUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.members.updateRole(user.id, boardId, memberUserId, dto);
  }

  @Delete(':userId')
  @RequireBoardRole(BoardRole.OWNER)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('boardId') boardId: string,
    @Param('userId') memberUserId: string,
  ) {
    return this.members.remove(user.id, boardId, memberUserId);
  }
}