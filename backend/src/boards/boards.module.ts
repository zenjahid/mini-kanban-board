import { Module } from '@nestjs/common';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';
import { BoardMembersController } from './board-members.controller';
import { BoardMembersService } from './board-members.service';
import { ColumnsController } from '../columns/columns.controller';
import { ColumnsService } from '../columns/columns.service';
import { TasksController } from '../tasks/tasks.controller';
import { TasksService } from '../tasks/tasks.service';

@Module({
  controllers: [
    BoardsController,
    BoardMembersController,
    ColumnsController,
    TasksController,
  ],
  providers: [
    BoardsService,
    BoardMembersService,
    ColumnsService,
    TasksService,
  ],
  exports: [BoardsService],
})
export class BoardsModule {}