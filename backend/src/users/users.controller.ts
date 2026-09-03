import { Controller, Get, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthUser) {
    return this.users.getById(user.id);
  }

  @Get('search')
  search(
    @CurrentUser() user: AuthUser,
    @Query('q') query = '',
  ) {
    return this.users.search(query, user.id);
  }
}