import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BoardRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BoardAccessService } from '../authorization/board-access.service';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@Injectable()
export class BoardMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BoardAccessService,
  ) {}

  async list(userId: string, boardId: string) {
    await this.access.assertAccess(userId, boardId, BoardRole.VIEWER);

    const members = await this.prisma.boardMember.findMany({
      where: { boardId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return members.map((m) => ({ id: m.id, role: m.role, user: m.user }));
  }

  async add(userId: string, boardId: string, dto: AddMemberDto) {
    // Only the owner manages sharing (most restrictive, least surprising).
    await this.access.assertAccess(userId, boardId, BoardRole.OWNER);

    if (dto.role === BoardRole.OWNER) {
      throw new BadRequestException('Ownership cannot be transferred.');
    }

    const target = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      select: { id: true, name: true, email: true },
    });
    if (!target) {
      throw new NotFoundException('No user found with that email.');
    }
    if (target.id === userId) {
      throw new BadRequestException('You are already the board owner.');
    }

    const existing = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: target.id } },
    });
    if (existing) {
      throw new ConflictException('This user is already a member of the board.');
    }

    await this.prisma.boardMember.create({
      data: { boardId, userId: target.id, role: dto.role },
    });

    return this.list(userId, boardId);
  }

  async updateRole(
    userId: string,
    boardId: string,
    memberUserId: string,
    dto: UpdateMemberRoleDto,
  ) {
    await this.access.assertAccess(userId, boardId, BoardRole.OWNER);

    if (dto.role === BoardRole.OWNER) {
      throw new BadRequestException('Ownership cannot be transferred.');
    }

    const member = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: memberUserId } },
    });
    if (!member) {
      throw new NotFoundException('Member not found on this board.');
    }
    if (member.role === BoardRole.OWNER) {
      throw new ForbiddenException("The board owner's role cannot be changed.");
    }

    await this.prisma.boardMember.update({
      where: { id: member.id },
      data: { role: dto.role },
    });

    return this.list(userId, boardId);
  }

  async remove(userId: string, boardId: string, memberUserId: string) {
    await this.access.assertAccess(userId, boardId, BoardRole.OWNER);

    const member = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: memberUserId } },
    });
    if (!member) {
      throw new NotFoundException('Member not found on this board.');
    }
    if (member.role === BoardRole.OWNER) {
      throw new ForbiddenException('The board owner cannot be removed.');
    }

    await this.prisma.boardMember.delete({ where: { id: member.id } });

    return this.list(userId, boardId);
  }
}