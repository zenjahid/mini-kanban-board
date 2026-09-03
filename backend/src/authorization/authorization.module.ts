import { Global, Module } from '@nestjs/common';
import { BoardAccessService } from './board-access.service';
import { BoardAccessGuard } from './board-access.guard';

@Global()
@Module({
  providers: [BoardAccessService, BoardAccessGuard],
  exports: [BoardAccessService, BoardAccessGuard],
})
export class AuthorizationModule {}